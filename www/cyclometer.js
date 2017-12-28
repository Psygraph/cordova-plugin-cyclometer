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

// Last returned acceleration object from native
var accel = null;
var previousAcceleration = [];

// Timer used when faking up devicemotion events
var eventTimerId = null;

// parameters related to the shake method
var lastShakeTime   = 0;
var shakeThreshold  = 12;
var shakeTimeout    = 1000;
var shakeListeners  = [];

// The period, in MS
var updateInterval  = 400


// Tells native to start.
function start(updateInterval) {
    exec(function (a) {
            accel = new AccelMeasurement(a.x, a.y, a.z, a.timestamp);
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
    
// Tells native to stop.
function stop() {
    exec(null, null, "Cyclometer", "stop", []);
    accel = null;
    previousAcceleration = [];
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

function processValue(accel) {
    var len = previousAcceleration.length;
    if(!len)  {
        previousAcceleration[len] = [ accel.timestamp,
                                      accel.x,
                                      accel.y,
                                      accel.z ];
    }
    else {
        if(accel.timestamp < previousAcceleration[len-1][0] +updateInterval) {
            // If they callback faster than the update interval, sum the acceleration values.
            // This is important on Android, where the sensor interval cannot be set explicitly.
            // This is an exponential decay average over multiple points, not a true mean.
            //previousAcceleration[len-1] = [ (previousAcceleration[len-1][0] +a.timestamp)/2,
            //                                (previousAcceleration[len-1][1] +a.x)/2,
            //                                (previousAcceleration[len-1][2] +a.y)/2,
            //                                (previousAcceleration[len-1][3] +a.z)/2 ];
        }
        else {
            previousAcceleration[len] = [ accel.timestamp,
                                          accel.x,
                                          accel.y,
                                          accel.z ];
            var last = previousAcceleration[len];
            var prev  = previousAcceleration[len-1];
            detectShake(last, prev);
        }
    }
    // determine if the acceleration changes indicate a shake
    function detectShake(last, prev) {
        var timeSinceLast = last[0] - lastShakeTime;
        if(timeSinceLast > shakeTimeout) {
            // time to check
            var delta = [prev[1]-last[1], prev[2]-last[2], prev[3]-last[3]];
            delta = [delta[0]*delta[0], delta[1]*delta[1], delta[2]*delta[2]];
            if(Math.sqrt(delta[0] + delta[1] + delta[2]) > shakeThreshold) {
                // Shake detected
                slTemp = shakeListeners.slice(0);
                for(var i=0; i<slTemp.length; i++) {
                    slTemp[i]();
                }
                lastShakeTime = last[0];
            }
        }
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
        updateInterval = (options && options.frequency) ? options.frequency : 400;

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
                if (accel) {
                    successCallback(accel);
                    processValue(accel);
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
            start(updateInterval);
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
    
    onShake: function(shakeCB, thresh, timeout) {
        if(typeof(thresh)!="undefined")
            shakeThreshold = thresh;
        if(typeof(timeout)!="undefined")
            shakeTimeout = timeout;
        shakeListeners.push(shakeCB);
    },
    offShake: function(shakeCB) {
        if(shakeCB=="all") {
            shakeListeners = [];
        }
        else {
            var idx = shakeListeners.indexOf(shakeCB);
            if (idx > -1) {
                shakeListeners.splice(idx, 1);
            }
        }
    }

};
module.exports = cyclometer;
