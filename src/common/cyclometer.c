//
//  cyclometer.c
//  Cross-platform C library
//

#include "cyclometer.h"
#include <stdlib.h>
#include <string.h>
#include <math.h>

#include <sys/time.h>
int64_t currentTimeInMilliseconds()
{
    struct timeval tv;
    gettimeofday(&tv, NULL);
    return ((tv.tv_sec * 1000) + (int64_t) (tv.tv_usec / 1000));
}

// test
int calculate(float y, float z) {
    return (y+z)*z;
}

float tapThreshold     = 10.0;
float stepThreshold    = 10.0;
float shakeThreshold   = 10.0;

int64_t lastTapTime       = 0;
int64_t lastStepTime      = 0;
int64_t lastShakeTime     = 0;

int64_t shakeTimeout         = 1000;
int64_t stepTimeout          = 1000;
int64_t doubleClickInterval  = 300;

static const int len = 20;
int pos = 0;
int ready = 0;

int64_t  pTS[len];
float pX[len];
float pY[len];
float pZ[len];

const int MOTION_NONE      = 0x0000;

const int MOTION_TAP       = 0x0001;
const int MOTION_DOUBLETAP = 0x0002;
const int MOTION_STEP      = 0x0004;
const int MOTION_SHAKE     = 0x0008;

const int MOTION_CYCLE     = 0x0010;

void updateMotion(float threshold, float timeout) {
    shakeThreshold = threshold;
    shakeTimeout   = (int64_t)timeout;
    pos            = 0;
    ready          = 0;
}

int calculateMotion(int64_t ts, float x, float y, float z) {
    //ts = currentTimeInMilliseconds();
    int motion = MOTION_NONE;
    pTS[pos]   = ts;
    pX[pos]    = x;
    pY[pos]    = y;
    pZ[pos]    = z;
    if(++pos >= len) {
        pos = 0;
        ready = 1;
    }
    if(!ready)  {
        return motion;
    }
    int curr = pos-1 > 0 ? pos-1 : len-1;
    int prev = curr-1 > 0 ? curr-1 : len-1;

    float delta[3];
    delta[0] = pX[prev]-pX[curr];
    delta[1] = pY[prev]-pY[curr];
    delta[2] = pZ[prev]-pZ[curr];
    float magnitude = sqrt(delta[0]*delta[0] + delta[1]*delta[1] + delta[2]*delta[2]);

    if(magnitude > tapThreshold) {
        // Tap detected
        motion = motion | MOTION_TAP;
        if((ts - lastTapTime) < doubleClickInterval)
            motion = motion | MOTION_DOUBLETAP;
        lastTapTime = ts;
    }
    if((ts - lastStepTime) > stepTimeout) {
        if(magnitude > stepThreshold) {
            // Step detected
            motion = motion | MOTION_STEP;
        }
        lastStepTime = ts;
    }
    if((ts - lastShakeTime) > shakeTimeout) {
        if(magnitude > shakeThreshold) {
            // Shake detected
            motion = motion | MOTION_SHAKE;
        }
        lastShakeTime = ts;
    }
    return motion;
}

