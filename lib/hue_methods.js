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

const IOT_SESSION = 'iot'; // device
const USER_SESSION = /^user/; // third-party app

const notifyIoT = function(self, msg) {
    self.$.session.notify([msg], IOT_SESSION);
};

// state not needed by clients
const CLEANUP_KEYS = ['acks', 'fullName', 'config', 'trace__iot_sync__',
                      '__ca_version__', '__ca_uid__'];

const cleanState = (self) => myUtils.deepClone(self.state,
                                               x => CLEANUP_KEYS.includes(x));
const notifyWebApp = function(self, msg) {
    const state = cleanState(self);
    const mySession = self.$.session.getSessionId();
    msg && self.$.log && self.$.log.debug(msg);

    (mySession !== APP_SESSION) && self.$.session.notify([state], APP_SESSION);
    //!mySession.match(USER_SESSION) &&
    self.$.session.notify([state], USER_SESSION);
};

const doBundle = function(self, command, ...args) {
    const bundle = self.$.iot.newBundle();
    if (args.length === 0) {
        bundle[command](0);
    } else {
        bundle[command](0, args);
    }
    self.$.iot.sendBundle(bundle, self.$.iot.NOW_SAFE);
    notifyIoT(self, command);
};

exports.methods = {
    // Methods called by framework
    async __ca_init__() {
        this.$.session.limitQueue(1, IOT_SESSION); // ditto

        // methods called by the iot device
        this.state.trace__iot_sync__ = '__ca_traceSync__';

        // example config
        this.state.config = {};

        const device = this.$.props['PHILIPS_HUE'];
        this.state.config = {
            serviceDiscover: device.serviceDiscover,
            serviceControl: device.serviceControl,
            charLight: device.charLight,
            charBrightness: device.charBrightness,
            charColor: device.charColor,
            namePrefix: device.namePrefix
        };

        // example initial state
        this.state.devices = {};
        this.state.selectedDevice = null;
        this.state.daemon = 0;

        this.state.error = null;

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
        doBundle(this, 'findDevices',
                 this.state.deviceType || this.$.props.defaultDeviceType,
                 this.state.config);
        notifyWebApp(this, 'Finding device');
        return this.getState();
    },

    async connect(deviceId, deviceAd) {
        if (this.state.devices[deviceId]) {
            this.state.selectedDevice = {id: deviceId, ad: deviceAd};
            doBundle(this, 'connect', deviceId);
            notifyWebApp(this, 'Connecting device');
            return this.getState();
        } else {
            const err = new Error('Cannot connect, device missing');
            err.deviceId = deviceId;
            return [err];
        }
    },

    async disconnect() {
        doBundle(this, 'disconnect');
        this.state.selectedDevice = null;
        notifyWebApp(this, 'Disconnecting device');
        return this.getState();
    },

    async resetIoT() {
        doBundle(this, 'reset');
        this.state.selectedDevice = null;
        notifyWebApp(this, 'Resetting');
        return this.getState();
    },

    async setColor(color) {
        assert(typeof color.r === 'number', 'r not a number');
        assert(typeof color.g === 'number', 'g not a number');
        assert(typeof color.b === 'number', 'b not a number');
        this.state.color = color;
        this.state.isColor = true;
        doBundle(this, 'setColor', color, cleanState(this));
        notifyWebApp(this, 'New inputs');
        return this.getState();
    },

    async setBrowserDaemon(daemon) {
        const old = this.state.daemon;
        this.state.daemon = daemon;
        return old !== daemon ?
            this.resetIoT() :
            this.getState();
    },

    async setError(error) {
        if (typeof error === 'string') {
            error = JSON.parse(error);
        }
        error && assert(typeof error === 'object');
        if (error && (typeof error.message !== 'string')) {
            error.message = error.toString();
        }
        this.state.error = error;
        notifyWebApp(this, 'New Errors');
        return this.getState();
    },

    // Methods called by the IoT device

    // sync state during device initialization.
    async syncState(state) {
        if (state.devices && (typeof state.devices === 'object')) {
            this.state.devices = state.devices;
        }
        notifyWebApp(this, 'New inputs');
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
            notifyWebApp(this, 'New inputs');
        }

        return [];
    }
};

caf.init(module);
