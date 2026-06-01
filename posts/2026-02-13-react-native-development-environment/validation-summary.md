# Validation Summary: How to Set Up a React Native Development Environment

## Status
validated

## Post Type
Tutorial / setup guide

## Technologies Covered
- React Native
- React Native Community CLI
- Node.js
- npm and yarn
- Watchman
- Xcode
- CocoaPods
- Java Development Kit
- Android Studio
- Android SDK, Android Emulator, and ADB
- VS Code
- TypeScript

## Sources Consulted
- React Native: Set Up Your Environment: https://reactnative.dev/docs/next/set-up-your-environment
- React Native: Get Started Without a Framework: https://reactnative.dev/docs/getting-started-without-a-framework
- React Native: Running On Simulator: https://reactnative.dev/docs/running-on-simulator-ios
- React Native: Running On Device: https://reactnative.dev/docs/running-on-device
- React Native: Using TypeScript: https://reactnative.dev/docs/typescript
- React Native Community CLI init docs: https://github.com/react-native-community/cli/blob/main/docs/init.md
- React Native Community CLI Doctor docs: https://github.com/react-native-community/cli/blob/main/packages/cli-doctor/README.md
- Android Studio install docs: https://developer.android.com/studio/install
- CocoaPods Getting Started guide: https://guides.cocoapods.org/using/getting-started.html
- Node.js downloads: https://nodejs.org/en/download
- Watchman installation docs: https://facebook.github.io/watchman/docs/install
- Expo development builds documentation: https://docs.expo.dev/develop/development-builds/introduction/

## Issues Found
- The post said Node.js 18 or later was sufficient. Current React Native setup documentation requires Node 22.11.0 or later, so the prerequisites, diagram, and version check comment were updated.
- The Android SDK guidance used API 34 and Build-Tools 34.0.0. Current React Native setup documentation requires Android 15 / API 35 and Android SDK Build-Tools 36.0.0, so the macOS Android Studio section, Windows Android Studio section, and AVD recommendation were updated.
- The Android SDK PATH examples included the legacy `tools` and `tools/bin` directories. Current React Native setup documentation only requires the SDK path plus modern tool paths such as `platform-tools` and, on macOS, `emulator`, so the obsolete path entries were removed.
- The project creation command omitted `@latest` for the React Native Community CLI package. The command was updated to `npx @react-native-community/cli@latest init MyApp`, matching current React Native and CLI documentation.
- The iOS and Android run commands used direct `npx react-native run-ios` / `run-android` commands in places where current React Native documentation shows the generated package scripts. The simulator and Android examples were updated to `npm run ios`, `npm run ios -- --simulator=...`, and `npm run android`.
- The Expo comparison said Expo limits access to native modules. That is outdated because Expo development builds and custom native code workflows support native libraries and native modules. The sentence was revised to say this guide covers the full native setup for direct control over the iOS and Android projects.

## Review Notes
The post is technically relevant and remains valid after the corrections. Some commands, such as installing CocoaPods with `sudo gem install cocoapods` and running `pod install` directly, are still workable, though many modern React Native projects prefer Bundler-managed CocoaPods commands such as `bundle exec pod install` for reproducibility.
