# Validation Summary: How to Implement Native UI Components in React Native

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- React Native native UI components
- React Native legacy ViewManager APIs
- React Native Fabric / New Architecture
- iOS UIKit, Swift, Objective-C, Objective-C++
- Android Kotlin custom views and ViewManagers
- React Native events, commands, measurement, and testing
- Detox, Jest, and react-test-renderer

## Sources Consulted
- React Native legacy iOS Native UI Components: https://reactnative.dev/docs/legacy/native-components-ios
- React Native legacy Android Native UI Components: https://reactnative.dev/docs/legacy/native-components-android
- React Native Fabric Native Components guide: https://reactnative.dev/docs/next/fabric-native-components-introduction
- React Native native commands for Fabric components: https://reactnative.dev/docs/0.82/the-new-architecture/fabric-component-native-commands
- React Native New Architecture overview: https://reactnative.dev/architecture/landing-page
- React Native Fabric renderer overview: https://reactnative.dev/architecture/fabric-renderer

## Issues Found
- The iOS Swift view used `RCTBubblingEventBlock` without importing React. Added `import React` so the type is available.
- The iOS `progress` prop was exported twice with both `RCT_EXPORT_VIEW_PROPERTY` and `RCT_CUSTOM_VIEW_PROPERTY`. Removed the duplicate plain export and kept the custom setter.
- The Swift view did not clamp `progress`, while later tests claimed direct native clamping. Added clamping in the native view.
- The direct manipulation example called `setProgress:animated:` on iOS, but the Swift view did not define that Objective-C-visible method. Added the method and made animation optional.
- The TypeScript wrapper used `React.FC`, so the documented `ref` usage would not reach the native component. Converted the wrapper to `forwardRef`.
- The wrapper typed `style` as `ViewStyle` but passed a style array. Changed it to `StyleProp<ViewStyle>`.
- The Android direct command accepted an `animated` argument from JavaScript but ignored it. Added a native `setProgress(targetProgress, animated)` path and wired command handling to use it.
- The JavaScript command helper referenced React types without importing them and used an imprecise component ref type. Added the type import and used the native component ref type.
- The Fabric component descriptor example used hand-written C++ descriptor-style code that does not match the current documented Codegen workflow for Fabric native components. Replaced it with a TypeScript Codegen spec and adjusted the iOS Fabric snippet to use generated AppSpec headers and protocol naming.
- The Fabric comparison table said view updates are "Immediate", which was too absolute. Changed it to "Supports synchronous updates for some interactions."
- The React Native native UI components link pointed to a non-current path. Updated it to the current legacy documentation path.

## Review Notes
The legacy ViewManager APIs shown in the post are still documented, but React Native marks legacy native modules and native components as stable legacy technologies that will eventually be superseded by Turbo Native Modules and Fabric Native Components. Future revisions could separate legacy and New Architecture examples more explicitly.
