/*
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
*/

/**
 * This class provides access to device cyclometer data.
 * @constructor
 */
var argscheck = require('cordova/argscheck'),
    utils = require("cordova/utils"),
    exec = require("cordova/exec"),
    AccelMeasurement = require('./AccelMeasurement');

// Is the accel sensor running?
var running = false;

// Keeps reference to watchAcceleration calls.
var timers = {};

// Array of listeners; used to keep track of when we should call start and stop.
var listeners = [];

var MOTION_NONE      = 0x0000;
var MOTION_TAP       = 0x0001;
var MOTION_DOUBLETAP = 0x0002;
var MOTION_STEP      = 0x0004;
var MOTION_SHAKE     = 0x0008;
var motion = MOTION_NONE;

// Last returned acceleration object from native
var accel  = null;

// Timer used when faking up devicemotion events
var eventTimerId = null;

// parameters related to the shake method
var shakeThreshold   = 1;
var shakeTimeout     = 1000;
var shakeListeners   = [];
var shakeListenerIDs = [];
var updateInterval   = 400;

// Tells native to start.
function start(updateInterval) {
    exec(function (a) {
        accel = new AccelMeasurement(a.x, a.y, a.z, a.timestamp);
        motion = motion | a.motion;
        var tempListeners = listeners.slice(0);
        for (var i = 0, l = tempListeners.length; i < l; i++) {
            tempListeners[i].win(accel);
        }
    }, function (e) {
        var tempListeners = listeners.slice(0);
        for (var i = 0, l = tempListeners.length; i < l; i++) {
            tempListeners[i].fail(e);
        }
    }, "Cyclometer", "start", [1.0 * updateInterval]);
    running = true;
}

function update(threshold,  timeout) {
    exec(null, null, "Cyclometer", "update", [threshold, timeout]);
}

// Tells native to stop.
function stop() {
    exec(null, null, "Cyclometer", "stop", []);
    accel  = null;
    motion = 0;
    running = false;
}

// Adds a callback pair to the listeners array
function createCallbackPair(win, fail) {
    return { win: win, fail: fail };
}

// Removes a win/fail listener pair from the listeners array
function removeListeners(l) {
    var idx = listeners.indexOf(l);
    if (idx > -1) {
        listeners.splice(idx, 1);
        if (listeners.length === 0) {
            stop();
        }
    }
}

function checkMotion() {
    var m = motion;
    motion = MOTION_NONE;
    if(m & MOTION_SHAKE) {
        var ts = new Date().getTime();
        var event = [ts, m];
        shakeCallback(event);
    }
}
function shakeCallback(event) {
    slTemp = shakeListeners.slice(0);
    for(var i=0; i<slTemp.length; i++) {
        slTemp[i](event);
    }
}

var cyclometer = {
    /**
     * Asynchronously acquires the current acceleration.
     *
     * @param {Function} successCallback    The function to call when the acceleration data is available
     * @param {Function} errorCallback      The function to call when there is an error getting the acceleration data. (OPTIONAL)
     * @param {AccelerationOptions} options The options for getting the cyclometer data such as timeout. (OPTIONAL)
     */
    getCurrentAcceleration: function (successCallback, errorCallback, options) {
        argscheck.checkArgs('fFO', 'cyclometer.getCurrentAcceleration', arguments);

        if (cordova.platformId === "browser" && !eventTimerId) {
            // fire devicemotion event once
            var devicemotionEvent = new Event('devicemotion');
            window.setTimeout(function() {
                window.dispatchEvent(devicemotionEvent);
            }, 200);
        }

        var p;
        var win = function (a) {
            removeListeners(p);
            successCallback(a);
        };
        var fail = function (e) {
            removeListeners(p);
            if (errorCallback) {
                errorCallback(e);
            }
        };

        p = createCallbackPair(win, fail);
        listeners.push(p);

        if (!running) {
            // Default interval (1 sec)
            updateInterval = (options && options.frequency) ? options.frequency : 400;
            start(updateInterval);
        }
    },

    //getPreviousAcceleration: function() {
    //    return previousAcceleration;
    //},
    //setPreviousAcceleration: function(acc) {
    //    previousAcceleration = acc;
    //},

    /**
     * Asynchronously acquires the acceleration repeatedly at a given interval.
     *
     * @param {Function} successCallback    The function to call each time the acceleration data is available
     * @param {Function} errorCallback      The function to call when there is an error getting the acceleration data. (OPTIONAL)
     * @param {AccelerationOptions} options The options for getting the cyclometer data such as timeout. (OPTIONAL)
     * @return String                       The watch id that must be passed to #clearWatch to stop watching.
     */
    watchAcceleration: function (successCallback, errorCallback, options) {
        argscheck.checkArgs('fFO', 'cyclometer.watchAcceleration', arguments);
        // Default interval (1 sec)
        var period         = (options && options.period) ? options.period : 100;
        var updateInterval = (options && options.updateInterval) ? options.updateInterval : 200;

        // Keep reference to watch id, and report accel readings as often as defined in frequency
        var id = utils.createUUID();

        var p = createCallbackPair(function () { }, function (e) {
            removeListeners(p);
            if (errorCallback) {
                errorCallback(e);
            }
        });
        listeners.push(p);

        timers[id] = {
            timer: window.setInterval(function () {
                if (accel!== null) {
                    successCallback(accel);
                    //processValue(accel);
                    checkMotion();
                }
            }, updateInterval),
            listeners: p
        };

        if (running) {
            // If we're already running then immediately invoke the success callback
            // but only if we have retrieved a value, sample code does not check for null ...
            if (accel) {
                successCallback(accel);
            }
        } else {
            start(period);
        }
        
        if (cordova.platformId === "browser" && !eventTimerId) {
            // Start firing devicemotion events if we haven't already
            var devicemotionEvent = new Event('devicemotion');
            eventTimerId = window.setInterval(function() {
                    window.dispatchEvent(devicemotionEvent);
                }, 200);
        }

        return id;
    },

    /**
     * Clears the specified cyclometer watch.
     *
     * @param {String} id       The id of the watch returned from #watchAcceleration.
     */
    clearWatch: function (id) {
        // Stop javascript timer & remove from timer list
        if (id && timers[id]) {
            window.clearInterval(timers[id].timer);
            removeListeners(timers[id].listeners);
            delete timers[id];

            if (eventTimerId && Object.keys(timers).length === 0) {
                // No more watchers, so stop firing 'devicemotion' events
                window.clearInterval(eventTimerId);
                eventTimerId = null;
            }
        }
    },

    onShake: function(id, shakeCB, thresh, timeout) {
        if(shakeCB) {
            shakeListeners.push(shakeCB);
            shakeListenerIDs.push(id);
        }
        if(typeof(thresh)==="number")
            shakeThreshold = thresh;
        if(typeof(timeout)==="number")
            shakeTimeout = timeout;
        update(shakeThreshold, shakeTimeout);
    },
    offShake: function(id) {
        if(id==="all") {
            shakeListeners = [];
            shakeListenerIDs = [];
        }
        else {
            var idx = shakeListenerIDs.indexOf(id);
            if (idx > -1) {
                shakeListeners.splice(idx, 1);
                shakeListenerIDs.splice(idx, 1);
            }
        }
    },

    calculate: function (x, y, successCallback, errorCallback) {
        cordova.exec(successCallback, errorCallback, "Cyclometer", "calculate", [x, y]);
    }

};
module.exports = cyclometer;
