
.PHONY := android ios

ifdef DEBUG
	FLAGS := NDK_DEBUG=1
endif

NDK := /Applications/AndroidNDK7026061.app/Contents/NDK/ndk-build

all: android ios

android:
	cd src/android && $(NDK) $(FLAGS)

ios:
	cd src/ios && ./ios_compile.sh
