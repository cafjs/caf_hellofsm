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
const fsmUtils = require('./ca_methods_util');

const COLORS = {
    red: {r:255, g: 0, b:0},
    green: {r:0, g: 255, b:0},
    yellow: {r:255, g: 255, b:0}
};

exports.methods = {
    // Methods called by framework
    async __ca_init_hue__() {
        this.$.session.limitQueue(1, fsmUtils.IOT_SESSION); // ditto

        const device = this.$.props['PHILIPS_HUE'];
        this.state.config = {
            serviceDiscover: device.serviceDiscover,
            serviceControl: device.serviceControl,
            charLight: device.charLight,
            charBrightness: device.charBrightness,
            charColor: device.charColor,
            namePrefix: device.namePrefix
        };
        this.state.devices = {};
        this.state.selectedDevice = null;
        this.state.daemon = 0;
        this.state.error = null;

        // methods called by the iot device
        this.state.trace__iot_sync__ = '__ca_traceSync__';

        return [];
    },

    //External methods

    // Example external methods

    /* Typical lifecycle:
     *
     * 1 Find devices exporting a service.
     * 2 Connect to one of them and start listening to device notifications,
     *  e.g., heart beat rates....
     * 3 Do some device operation, e.g., start blinking or stop blinking.
     * 4 Disconnect from device stopping notifications
     */

    async findDevices() {
        this.state.selectedDevice && this.disconnect(); // #devices <= 1
        fsmUtils.doBundle(this, 'findDevices', this.state.config);
        fsmUtils.notifyWebApp(this, 'Finding device');
        return this.getState();
    },

    async connect(deviceId, deviceAd) {
        if (this.state.devices[deviceId]) {
            this.state.selectedDevice = {id: deviceId, ad: deviceAd};
            fsmUtils.doBundle(this, 'connect', deviceId);
            fsmUtils.notifyWebApp(this, 'Connecting device');
            return this.getState();
        } else {
            const err = new Error('Cannot connect, device missing');
            err.deviceId = deviceId;
            return [err];
        }
    },

    async disconnect() {
        fsmUtils.doBundle(this, 'disconnect');
        this.state.selectedDevice = null;
        fsmUtils.notifyWebApp(this, 'Disconnecting device');
        return this.getState();
    },

    async resetIoT() {
        fsmUtils.doBundle(this, 'reset');
        this.state.selectedDevice = null;
        fsmUtils.notifyWebApp(this, 'Resetting');
        return this.getState();
    },

    async setColor(colorName) {
        assert(typeof colorName === 'string');
        const color = COLORS[colorName.toLowerCase()];
        assert(color, 'Invalid color');
        fsmUtils.doBundle(this, 'setColor', color);
        return this.getState();
    },

    async setBrowserDaemon(daemon) {
        const old = this.state.daemon;
        this.state.daemon = daemon;
        return old !== daemon ?
            this.resetIoT() :
            this.getState();
    },

    // Methods called by the IoT device

    async setError(error) {
        if (typeof error === 'string') {
            error = JSON.parse(error);
        }
        error && assert(typeof error === 'object');
        if (error && (typeof error.message !== 'string')) {
            error.message = error.toString();
        }
        this.state.error = error;
        fsmUtils.notifyWebApp(this, 'New Errors');
        return this.getState();
    },

    // sync state during device initialization.
    async syncState(state) {
        if (state && state.devices) {
            this.state.devices = state.devices;
            fsmUtils.notifyWebApp(this, 'New inputs');
        }
        return this.getState();
    },

    // called when periodically the device contacts the CA
    async __ca_traceSync__() {
        const $$ = this.$.sharing.$;
        const now = (new Date()).getTime();
        this.$.log.debug(this.state.fullName + ':Syncing!!:' + now);
        const oldDevices = this.state.devices;
        this.state.devices = $$.toCloud.get('devices');

        if (this.state.selectedDevice &&
            !this.state.devices[this.state.selectedDevice.id]) {
            // Invariant: `selectedDevice` is always visible to the device
            this.state.selectedDevice = null;
        }

        if (!myUtils.deepEqual(oldDevices, this.state.devices)) {
            fsmUtils.notifyWebApp(this, 'New inputs');
        }

        return [];
    }
};

caf.init(module);
