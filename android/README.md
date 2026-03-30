# Android Wrapper

This folder contains a simple Android WebView app that loads your hosted Swing Trade Tracker.

## Before building

1. Open `android/gradle.properties`
2. Update `appUrl` to your live GitHub Pages URL

Example:

`appUrl=https://your-user.github.io/your-repo/`

## Build

Open the `android` folder in Android Studio and let it install the missing Android SDK/build tools if prompted.

Then build:

- Debug APK: `Build > Build Bundle(s) / APK(s) > Build APK(s)`
- Release APK: configure signing, then build from Android Studio
