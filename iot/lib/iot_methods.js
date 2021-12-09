/*!
Copyright 2020 Caf.js Labs and contributors

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
'use strict';

const myUtils = require('caf_iot').caf_components.myUtils;
const colorUtil = require('./colorUtil');
const assert = require('assert');

const cleanupDeviceInfo = function(devices) {
    const result = {};
    Object.keys(devices).forEach((x) => {
        result[x] = {
            uuid: devices[x].uuid,
            advertisement: myUtils.deepClone(devices[x].advertisement)
        };
    });
    return result;
};

const UPPER_BITS_MASK = 0xFF00;
const LOWER_BITS_MASK = 0xFF;

const patchUInt16 = function(buf, offset, val) {
    const lowerBits = val & LOWER_BITS_MASK;
    const upperBits = (val & UPPER_BITS_MASK)>>>8;
    // Little Endian...
    buf[offset] = lowerBits;
    buf[offset+1] = upperBits;
};

const patchUInt8 = function(buf, offset, val) {
    const lowerBits = val & LOWER_BITS_MASK;
    buf[offset] = lowerBits;
};

const unique = function(arr) {
    return Array.from(new Set(arr));
};

exports.methods = {
    async __iot_setup__() {
        // Example of how to store device state in the cloud, i.e.,
        // the value of `index` from last run downloaded from the cloud.
        const lastIndex = this.toCloud.get('index');
        this.state.index = (lastIndex ? lastIndex : 0);

        this.state.index = 0;
        this.scratch.devices = {};
        this.state.selectedDevice = null;
        this.state.devicesInfo = {};
        this.state.deviceType = null;

        return [];
    },

    async __iot_loop__() {
        this.$.log && this.$.log.debug(
            'Time offset ' +
                (this.$.cloud.cli && this.$.cloud.cli.getEstimatedTimeOffset())
        );

        this.toCloud.set('index', this.state.index);
        this.state.index = this.state.index + 1;

        const now = (new Date()).getTime();
        this.$.log && this.$.log.debug(now + ' loop: ' + this.state.index);

        if (!myUtils.deepEqual(this.toCloud.get('devices'),
                               this.state.devicesInfo)) {
            this.toCloud.set('devices', this.state.devicesInfo);
        }

        return [];
    },

    async __iot_error__(err) {
        const now = (new Date()).getTime();
        this.$.log && this.$.log.warn(now +  ': Got exception: ' +
                                      myUtils.errToPrettyStr(err));
        const serializableError = JSON.parse(myUtils.errToStr(err));
        serializableError.message = serializableError.error ?
            serializableError.error.message :
            'Cannot Perform Bluetooth Operation';

        await this.$.cloud.cli.setError(serializableError).getPromise();
        return [];
    },

    async findDevices(config) {
        const now = (new Date()).getTime();
        this.$.log && this.$.log.debug(now + ' findDevices() config:' +
                                       JSON.stringify(config));
        this.state.config = config;

        // forget old devices
        this.scratch.devices = {};
        this.state.devicesInfo = {};

        const services = unique([this.state.config.serviceDiscover,
                                 this.state.config.serviceControl]);

        if (typeof window !== 'undefined') {
            // Wait for user click
            await this.$.gatt.findServicesWeb(
                services, '__iot_foundDevice__', 'confirmScan',
                'afterConfirmScan', this.state.config.namePrefix
            );
        } else {
            this.$.gatt.findServices(services, '__iot_foundDevice__',
                                     this.state.config.namePrefix);
        }
        return [];
    },

    async __iot_foundDevice__(serviceId, device) {
        const services = Array.isArray(serviceId) ?
              serviceId.map(x => x.toLowerCase()) :
              (typeof serviceId === 'string' ?
               [serviceId.toLowerCase()] :
               []);

        if (this.state.config.namePrefix || // assume OK until connect()
            services.includes(this.state.config.serviceDiscover
                              .toLowerCase()) ||
            (services.includes(this.state.config.serviceControl
                               .toLowerCase()))) {
            this.scratch.devices[device.uuid] = device;
            this.state.devicesInfo = cleanupDeviceInfo(this.scratch.devices);
            const state = {devices: this.state.devicesInfo};
            await this.$.cloud.cli.syncState(state).getPromise();
        } else {
            this.$.log && this.$.log.debug(
                'Ignoring device with serviceID: ' +
                    JSON.stringify(serviceId) + ' as opposed to ' +
                    this.state.config.serviceDiscover + ' or ' +
                    this.state.config.serviceControl
            );
        }
        return [];
    },

    async connect(deviceId) {
        this.$.log && this.$.log.debug('Selected device ' + deviceId);
        if (this.state.selectedDevice) {
            // Only one connected device
            await this.disconnect();
        }
        this.state.selectedDevice = deviceId;

        if (this.scratch.devices[deviceId]) {
            try {
                const charIds = unique([this.state.config.charLight,
                                        this.state.config.charBrightness,
                                        this.state.config.charColor]);
                const {characteristics} =
                    await this.$.gatt.findCharacteristics(
                        this.state.config.serviceControl,
                        this.scratch.devices[deviceId], charIds
                    );
                [this.scratch.charLight, this.scratch.charBrightness,
                 this.scratch.charColor] = characteristics;
                await this.switchLight(true);
                await this.setBrightness(254);
                return [];
            } catch (err) {
                return [err];
            }
        } else {
            this.$.log && this.$.log.debug('select: Ignoring unknown device ' +
                                           deviceId);
            return [];
        }
    },

    async switchLight(isOn) {
        if (this.scratch.charLight) {
            this.$.log && this.$.log.debug('switchLight ' +
                                           (isOn ? 'on' : 'off'));
            const buf = Uint8Array.from(isOn ? [0x01] : [0x00]);
            await this.$.gatt.write(this.scratch.charLight, buf);
            return [];
        } else {
            return [];
        }
    },

    async setBrightness(level) {
        if (this.scratch.charBrightness) {
            this.$.log && this.$.log.debug('setBrightness ' + level);
            // level between 1 and 254 for philips hue
            level = colorUtil.clipBrightness(level);
            const buf = Uint8Array.from([level & LOWER_BITS_MASK]);
            await this.$.gatt.write(this.scratch.charBrightness, buf);
            return [];
        } else {
            return [];
        }
    },

    async setColor(color) {
        if (this.scratch.charColor) {
            this.$.log && this.$.log.debug('setColor ' +
                                           JSON.stringify(color));
            color = colorUtil.clipColor(color);
            const buf = Uint8Array.from([0x01, 0x01, 0x01, 0x04, 0x04,
                                         0x10, 0x27, 0xe2, 0x50,
                                         0x05, 0x02, 0x01, 0x00]);
            const [x, y] = colorUtil.rgbToXY(color.r, color.g, color.b);
            patchUInt16(buf, 5, x);
            patchUInt16(buf, 7, y);
            await this.$.gatt.write(this.scratch.charColor, buf);
            return [];
        } else {
            return [];
        }
    },

    async disconnect() {
        this.$.log && this.$.log.debug('Calling disconnect()');
        const device = this.state.selectedDevice &&
                this.scratch.devices[this.state.selectedDevice];
        if (device) {
            this.$.log && this.$.log.debug('Disconnect device ' +
                                           this.state.selectedDevice);
            await this.$.gatt.disconnect(device);
        }
        this.state.selectedDevice = null;
        return [];
    },

    async reset() {
        this.$.log && this.$.log.debug('Calling reset()');
        await this.disconnect();
        await this.$.gatt.reset();
        this.scratch.devices = {};
        this.state.devicesInfo = {};
        return [];
    }
};
