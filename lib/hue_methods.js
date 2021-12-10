/*!
Copyright 2021 Caf.js Labs and contributors

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

const assert = require('assert');
const caf = require('caf_core');
const caf_comp = caf.caf_components;
const myUtils = caf_comp.myUtils;

const COLORS = {
    red: {r:255, g: 0, b:0},
    green: {r:0, g: 255, b:0},
    yellow: {r:255, g: 255, b:0}
};

const IOT_SESSION = exports.IOT_SESSION = 'iot'; // device
const HUE_SESSION = exports.HUE_SESSION = /^hue/; // main app with the bulb

const notifyHueApp = function(self, msg) {
    self.$.session.notify([myUtils.deepClone(self.state)], HUE_SESSION);
};

const notifyIoT = function(self, msg) {
    self.$.session.notify([msg], IOT_SESSION);
};

const doBundle = function(self, command, ...args) {
    const bundle = self.$.iot.newBundle();
    bundle[command](0, args);
    self.$.iot.sendBundle(bundle, self.$.iot.NOW_SAFE);
    notifyIoT(self, command);
};

exports.methods = {
    // Methods called by framework
    async __ca_hue_init__() {
        this.$.session.limitQueue(1, IOT_SESSION); // ditto
        this.state.hue_devicesInfo = {};
        this.state.hue_selectedDevice = null;
        this.state.hue_error = null;

        // methods called by the iot device
        this.state.trace__iot_sync__ = '__ca_traceSync__';

        return [];
    },

    //External methods

    /* Typical lifecycle:
     *
     * 1 Find devices exporting a service.
     * 2 Connect to one of them and start listening to device notifications,
     *  e.g., heart beat rates....
     * 3 Do some device operation, e.g., start blinking or stop blinking.
     * 4 Disconnect from device stopping notifications
     */

    async hue_findDevices() {
        this.state.hue_selectedDevice && this.hue_disconnect(); // #devices <= 1
        doBundle(this, 'findDevices', this.$.props['PHILIPS_HUE']);
        notifyHueApp(this, 'Finding device');
        return this.getState();
    },

    async hue_connect(deviceId) {
        if (this.state.hue_devicesInfo[deviceId]) {
            this.state.hue_selectedDevice = deviceId;
            doBundle(this, 'connect', deviceId);
            notifyHueApp(this, 'Connecting device');
            return this.getState();
        } else {
            const err = new Error('Cannot connect, device missing');
            err.deviceId = deviceId;
            return [err];
        }
    },

    async hue_disconnect() {
        doBundle(this, 'disconnect');
        this.state.hue_selectedDevice = null;
        notifyHueApp(this, 'Disconnecting device');
        return this.getState();
    },

    async hue_reset() {
        doBundle(this, 'reset');
        this.state.hue_selectedDevice = null;
        notifyHueApp(this, 'Resetting device');
        return this.getState();
    },

    async hue_setColor(colorName) {
        if (this.state.hue_selectedDevice) {
            assert(typeof colorName === 'string');
            const color = COLORS[colorName.toLowerCase()];
            assert(color, 'Invalid color');
            doBundle(this, 'setColor', color);
            return [null, this.state];
        } else {
            return [new Error('No device selected')];
        }
    },

    // Methods called by the IoT device

    async hue_setError(error) {
        this.state.hue_error = error;
        notifyHueApp(this, 'New Errors');
        return this.getState();
    },

    // called when periodically the device contacts the CA
    async __ca_traceSync__() {
        this.$.log.debug(this.state.fullName + ':Syncing!!:' + Date.now());

        const $$ = this.$.sharing.$;
        const oldDevicesInfo = this.state.hue_devicesInfo;
        this.state.hue_devicesInfo = $$.toCloud.get('devicesInfo');

        let notify = false;
        if (this.state.hue_selectedDevice &&
            !this.state.hue_devicesInfo[this.state.hue_selectedDevice]) {
            // Invariant: `hue_selectedDevice` is always visible to the device
            this.state.hue_selectedDevice = null;
            notify = true;
        }

        if (notify ||
            !myUtils.deepEqual(oldDevicesInfo, this.state.hue_devicesInfo)) {
            notifyHueApp(this, 'New inputs');
        }

        return [];
    }
};

caf.init(module);
