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

float tapThreshold     = 0.5;
float stepThreshold    = 1.0;
float shakeThreshold   = 4.0;

int64_t lastTapTime    = 0;
int64_t lastStepTime   = 0;
int64_t lastShakeTime  = 0;

int64_t tapTimeout     = 300;
int64_t stepTimeout    = 1000;
int64_t shakeTimeout   = 1000;

int pos   = 0;
int ready = 0;

static const int len = 8;
int64_t  tsHist[len];
float    magHist[len];

float    mMag = 0;
float    mOut = 0;

const int MOTION_NONE      = 0x0000;

const int MOTION_TAP       = 0x0001;
const int MOTION_DOUBLETAP = 0x0002;
const int MOTION_STEP      = 0x0004;
const int MOTION_SHAKE     = 0x0008;

const int MOTION_CYCLE     = 0x0010;


void updateMotion(float threshold, float timeout) {
    tapThreshold   = threshold;
    tapTimeout     = (int64_t)timeout;
    stepThreshold  = threshold;
    stepTimeout    = (int64_t)timeout;
    shakeThreshold = threshold;
    shakeTimeout   = (int64_t)timeout;

    pos            = 0;
    ready          = 0;
}

int calculateMotion(int64_t ts, float x, float y, float z) {
    //ts = currentTimeInMilliseconds();
    int motion = MOTION_NONE;
    tsHist[pos]  = ts;
    magHist[pos] = sqrt(x*x + y*y + z*z);

    if(!ready) {
        return motion;
    }
    int prev = pos-1  > 0 ? pos-1 : len-1;
    //int prevPrev = prev-1 > 0 ? prev-1 : len-1;

    // use ARMA to compute mean magnitude
    float decay = 0.1;
    mMag = 09.*mMag + 0.06*magHist[pos] + 0.04*magHist[prev];

    // compute magnitude difference from mean
    float delta[3];
    mOut = 0.6*mOut + 0.9* fabsf(magHist[pos] - mMag);
    float magnitude = mOut;

    // increment the position for next iteration
    if(++pos >= len) {
        pos   = 0;
        ready = 1;
    }

    if(magnitude > tapThreshold) {
        // Tap detected
        motion = motion | MOTION_TAP;
        if((ts - lastTapTime) < tapTimeout)
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

