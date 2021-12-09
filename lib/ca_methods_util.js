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

const caf = require('caf_core');
const caf_comp = caf.caf_components;
const myUtils = caf_comp.myUtils;

const IOT_SESSION = exports.IOT_SESSION = 'iot'; // device
const APP_SESSION = exports.APP_SESSION = /^user/; // third-party app


// state not needed by clients
const CLEANUP_KEYS = ['acks', 'config', 'trace__iot_sync__',
                      '__ca_version__', '__ca_uid__'];

const notifyWebApp = exports.notifyWebApp = function(self, msg) {
    const cleanState = () =>
          myUtils.deepClone(self.state, x => CLEANUP_KEYS.includes(x));
    msg && self.$.log && self.$.log.debug(msg);
    self.$.session.notify([cleanState()], APP_SESSION);
};


const notifyIoT = function(self, msg) {
    self.$.session.notify([msg], IOT_SESSION);
};

const doBundle = exports.doBundle = function(self, command, ...args) {
    const bundle = self.$.iot.newBundle();
    bundle[command](0, args);
    self.$.iot.sendBundle(bundle, self.$.iot.NOW_SAFE);
    notifyIoT(self, command);
};
