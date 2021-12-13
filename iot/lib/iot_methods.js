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
const iotUtil = require('./iot_methods_util');
const assert = require('assert');

exports.methods = {
    async __iot_setup__() {
        this.scratch.devices = {};
        this.state.connectedDevice = null;

        // Mostly for debugging...
        const lastIndex = this.toCloud.get('index');
        this.state.index = lastIndex || 0;

        return [];
    },

    async __iot_loop__() {
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

        const devicesInfo = cleanupDeviceInfo(this.scratch.devices);
        if (!myUtils.deepEqual(this.toCloud.get('devicesInfo'), devicesInfo)) {
            this.toCloud.set('devicesInfo', devicesInfo);
        }

        // Mostly for debugging...
        this.$.log && this.$.log.debug(
            'Time offset ' +
                (this.$.cloud.cli && this.$.cloud.cli.getEstimatedTimeOffset())
        );
        this.toCloud.set('index', this.state.index);
        this.state.index = this.state.index + 1;
        this.$.log && this.$.log.debug(
            `${Date.now()} loop: ${this.state.index}`
        );

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

        await this.$.cloud.cli.hue_setError(serializableError).getPromise();
        return [];
    },

    async findDevices(config) {
        const now = (new Date()).getTime();
        this.$.log && this.$.log.debug(now + ' findDevices() config:' +
                                       JSON.stringify(config));
        this.state.config = config;

        // forget old devices
        this.scratch.devices = {};

        const services = iotUtil.unique([this.state.config.serviceDiscover,
                                         this.state.config.serviceControl]);

        if (typeof window !== 'undefined') {
            // Wait for user click
            await this.$.gatt.findServicesWeb(
                services, '__iot_foundDevice__', 'confirmScan',
                'afterConfirmScan', null
            );
        } else {
            this.$.gatt.findServices(services, '__iot_foundDevice__', null);
        }
        return [];
    },

    async __iot_foundDevice__(serviceId, device) {
        const services = Array.isArray(serviceId) ?
              serviceId.map(x => x.toLowerCase()) :
              (typeof serviceId === 'string' ?
               [serviceId.toLowerCase()] :
               []);

        const sD = this.state.config.serviceDiscover.toLowerCase();
        const sC = this.state.config.serviceControl.toLowerCase();
        if (services.includes(sD) || services.includes(sC)) {
            this.scratch.devices[device.uuid] = device;
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
        if (this.state.connectedDevice) {
            // Only one connected device
            await this.disconnect();
        }
        this.state.connectedDevice = deviceId;

        if (this.scratch.devices[deviceId]) {
            try {
                const charIds = iotUtil.unique([
                    this.state.config.charLight,
                    this.state.config.charBrightness,
                    this.state.config.charColor
                ]);
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
        if (this.scratch.charLight && this.state.connectedDevice) {
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
        if (this.scratch.charBrightness && this.state.connectedDevice) {
            this.$.log && this.$.log.debug('setBrightness ' + level);
            // level between 1 and 254 for philips hue
            level = colorUtil.clipBrightness(level);
            const buf = Uint8Array.from([0x00]);
            iotUtil.patchUInt8(buf, 0, level);
            await this.$.gatt.write(this.scratch.charBrightness, buf);
            return [];
        } else {
            return [];
        }
    },

    async setColor(color) {
        if (this.scratch.charColor && this.state.connectedDevice) {
            this.$.log && this.$.log.debug('setColor ' +
                                           JSON.stringify(color));
            color = colorUtil.clipColor(color);
            const buf = Uint8Array.from([0x01, 0x01, 0x01, 0x04, 0x04,
                                         0x10, 0x27, 0xe2, 0x50,
                                         0x05, 0x02, 0x01, 0x00]);
            const [x, y] = colorUtil.rgbToXY(color.r, color.g, color.b);
            iotUtil.patchUInt16(buf, 5, x);
            iotUtil.patchUInt16(buf, 7, y);
            await this.$.gatt.write(this.scratch.charColor, buf);
            return [];
        } else {
            return [];
        }
    },

    async disconnect() {
        this.$.log && this.$.log.debug('Calling disconnect()');
        const device = this.state.connectedDevice &&
                this.scratch.devices[this.state.connectedDevice];
        if (device) {
            this.$.log && this.$.log.debug('Disconnect device ' +
                                           this.state.connectedDevice);
            await this.$.gatt.disconnect(device);
        }
        this.state.connectedDevice = null;
        return [];
    },

    async reset() {
        this.$.log && this.$.log.debug('Calling reset()');
        await this.disconnect();
        await this.$.gatt.reset();
        this.scratch.devices = {};
        return [];
    }
};
