//
//  CyclometerJni
//
#include <string.h>
#include <jni.h>


// Test function
extern int calculate(float y, float z);

// Update the motion parameters
extern void updateMotion(float threshold, float timeout);

// calculate any motion or cycles
extern int calculateMotion(jlong ts, float x, float y, float z);


JNIEXPORT jint JNICALL  Java_com_psygraph_CyclometerJni_calculate( JNIEnv* env, jobject thiz, jfloat j_x, jfloat j_y)
{
    // Call the cross-platform shared C function
    float x = (float) j_x;
    float y = (float) j_y;
    int result = calculate(x, y);
    return result;
}


JNIEXPORT jint JNICALL  Java_com_psygraph_CyclometerJni_calculateMotion( JNIEnv* env, jobject thiz, jlong j_ts, jfloat j_x, jfloat j_y, jfloat j_z)
{
    // Call the cross-platform shared C function
    int64_t ts  = (int64_t)  j_ts;
    float x  = (float) j_x;
    float y  = (float) j_y;
    float z  = (float) j_x;
    int result = calculateMotion(ts, x, y, z);
    return result;
}


JNIEXPORT void JNICALL  Java_com_psygraph_CyclometerJni_updateMotion( JNIEnv* env, jobject thiz, jfloat j_threshold, jfloat j_timeout)
{
    // Call the cross-platform shared C function
    float threshold = (float) j_threshold;
    float timeout   = (float) j_timeout;
    updateMotion(threshold, timeout);
}