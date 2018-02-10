
.PHONY := android ios

ifdef DEBUG
	FLAGS := NDK_DEBUG=1
endif

all: android ios

android:
	cd src/android && ndk-build $(FLAGS)

ios:
	cd src/ios && ./ios_compile.sh
