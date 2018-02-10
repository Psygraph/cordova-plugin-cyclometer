package com.psygraph;

public class CyclometerJni {

    // C-function interface
    public static native int calculate(int x, int y);

    public static native void updateMotion(float threshold, float timeout);

    public static native int calculateMotion(long ts, float x, float y, float z);

    // load library
    static {
        System.loadLibrary("cyclometer");
    }
}
