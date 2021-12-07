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
const app = require('../public/js/app.js');
const util = require('util');
const setTimeoutPromise = util.promisify(setTimeout);

const TICK = 'TICK';
const APP_SESSION = /^user/;
const CHANNEL_NAME = 'lights';
const LIGHTS = {
    RED: 'RED',
    GREEN: 'GREEN',
    YELLOW: 'YELLOW'
};

const MAX_DELAY = 1000;

exports.methods = {
    async __ca_init__() {
        this.state.linkedTo = null;
        this.state.lastUpdate = 0;
        this.state.light = LIGHTS.RED;

        this.state.fullName = this.__ca_getAppName__() + '#' +
            this.__ca_getName__();
        this.state.myChannel = caf.joinName(this.__ca_getName__(),
                                            CHANNEL_NAME);

        this.$.security.addRule(this.$.security.newSimpleRule(
            '__ca_handleTick__' // anybody, but no external calls
        ));

        this.$.fsm.setCreateMachineMethod('__ca_createMachine__');
        return [];
    },

    async __ca_resume__() {
        if (this.state.lastUpdate) {
            // avoid reset after reload
            this.state.lastUpdate = Date.now();
        }
        return [];
    },

    async __ca_pulse__() {
        this.scratch.offset = this.scratch.offset ?
            this.scratch.offset :
            Math.ceil(Math.random()*MAX_DELAY);
        // Spread pulses in one process to make it obvious not synchronized
        this.$.inq.delayMethod('__ca_pulseImpl__', [], this.scratch.offset);
        return [];
    },

    async __ca_pulseImpl__() {
        const cycleDetected = () => (Date.now() - this.state.lastUpdate >
                                     this.$.props.timeoutInMsec);

        this.$.log && this.$.log.debug(`calling PULSE: ${this.state.light}`);
        if (this.state.linkedTo) {
            if (cycleDetected()) {
                this.$.log && this.$.log.debug('Cycle detected, reseting');
                this.reset();
            }
        } else {
            await this.tick();
            // if linkedTo, then render in `__ca_handleTick__`
            this.$.react.render(app.main, [this.state]);
        }

        return [];
    },

    async __ca_createMachine__() {
        const updateImpl = (newLight) => {
            this.state.light = newLight;
            this.$.session.notify([this.state], APP_SESSION);
            this.$.pubsub.publish(this.state.myChannel, newLight);
        };

        const config = {
            id: 'semaphore',
            initial: LIGHTS.RED,
            states: {
                RED: {
                    on: {
                        TICK: {
                            target: LIGHTS.GREEN,
                            actions: () => updateImpl(LIGHTS.GREEN)
                        }
                    }
                },
                GREEN: {
                    on: {
                        TICK: {
                            target: LIGHTS.YELLOW,
                            actions: () => updateImpl(LIGHTS.YELLOW)
                        }
                    }
                },
                YELLOW: {
                    on: {
                        TICK: {
                            target: LIGHTS.RED,
                            actions: () => updateImpl(LIGHTS.RED)
                        }
                    }
                }
            }
        };

        return [null, {config}];
    },

    async __ca_handleTick__(topic, message) {
        if ((topic === this.state.linkedTo) && LIGHTS[message]) {
            this.state.lastUpdate = Date.now();
            // always at least one tick() to sync time
            await this.tick();
            while (this.state.light !== message) {
                this.$.log && this.$.log.debug(`Current ${this.state.light} ` +
                                               `target ${message}`);
                await this.tick();
            }
            this.$.react.render(app.main, [this.state]);
        }
        return [];
    },

    async hello(key) {
        this.$.react.setCacheKey(key);
        return this.getState();
    },

    async tick() {
        await this.$.fsm.send(this, TICK);
        return [null, this.state]; // do not coin()
    },

    async follow(target) {
        assert(caf.splitName(target).length === 2);
        const oldTopic = this.state.linkedTo;
        const newTopic = caf.joinName(target, CHANNEL_NAME);
        if (oldTopic !== newTopic) {
            this.state.linkedTo = newTopic;
            this.$.pubsub.subscribe(newTopic, '__ca_handleTick__');
            this.state.lastUpdate = Date.now();
            oldTopic && this.$.pubsub.unsubscribe(oldTopic);
        }
        return this.getState();
    },

    async unfollow() {
        const oldTopic = this.state.linkedTo;
        this.state.linkedTo = null;
        this.state.lastUpdate = 0;
        oldTopic && this.$.pubsub.unsubscribe(oldTopic);
        return this.getState();
    },

    async reset() {
        delete this.scratch.offset;
        this.$.fsm.reset();
        this.unfollow();
        await this.tick();
        return this.getState();
    },

    async getState() {
        this.$.react.coin();
        return [null, this.state];
    }
};

caf.init(module);
