# Android Makefile

#include $(CLEAR_VARS)

#LOCAL_PATH := $(call my-dir)
LOCAL_PATH := $(shell pwd)

#LOCAL_LDFLAGS += -L$(ANDROID_NDK_HOME)/platforms/$(APP_PLATFORM)/arch-$(APP_ABI)/usr/lib
#LOCAL_LDFLAGS += -L$(ANDROID_NDK_HOME)/platforms/$(APP_PLATFORM)/arch-$(APP_ABI)/usr/lib64
#LOCAL_ALLOW_UNDEFINED_SYMBOLS=true

# traverse directories recursively
define walk
  $(wildcard $(1)) $(foreach e, $(wildcard $(1)/*), $(call walk, $(e)))
endef

LOCAL_MODULE := cyclometer
LOCAL_MODULE_FILENAME := libcyclometer

INCLUDE_LIST := ${shell find $(LOCAL_PATH)/../common -type d}

SRC_LIST := $(wildcard $(LOCAL_PATH)/jni/*.c)
SRC_LIST += $(wildcard $(LOCAL_PATH)/../common/*.c)

$(warning SRC_LIST:$(SRC_LIST))
$(warning INCLUDE_LIST:$(INCLUDE_LIST))

LOCAL_C_INCLUDES := $(INCLUDE_LIST)
LOCAL_SRC_FILES := $(SRC_LIST)

include $(BUILD_SHARED_LIBRARY)