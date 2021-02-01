//
//  cyclometer.h
//  Cross-platform C library
//

#ifndef cyclometer
#define cyclometer

#include <stdio.h>


// Test function
extern int calculate(float y, float z);

// Update the motion parameters
extern void updateMotion(float threshold, float timeout);

// calculate any motion or cycles
extern int calculateMotion(int64_t ts, float x, float y, float z);

#endif /* cyclometer */
