
cmake_minimum_required(VERSION 3.6)

add_library(
     cyclometer
     SHARED
     jni/CyclometerJni.c ../common/cyclometer.c 
)

include_directories(
     ../common
)
