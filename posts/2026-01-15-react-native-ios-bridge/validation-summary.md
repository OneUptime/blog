# Validation Summary: How to Bridge Native iOS Modules to React Native

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- React Native native modules for iOS
- Objective-C and Objective-C++
- Swift native modules
- React Native event emitters
- React Native promises, callbacks, and constants
- React Native New Architecture and TurboModules
- iOS APIs including LocalAuthentication, CoreLocation, CoreMotion, UIKit, and XCTest
- Jest and Detox testing

## Sources Consulted
- React Native official documentation: iOS Native Modules, https://reactnative.dev/docs/legacy/native-modules-ios
- React Native official documentation: Turbo Native Modules Introduction, https://reactnative.dev/docs/turbo-native-modules-introduction
- React Native official documentation: Codegen Appendix, https://reactnative.dev/docs/appendix
- React Native official documentation: Debugging Basics, https://reactnative.dev/docs/debugging
- React Native official release notes: React Native 0.76 New Architecture by default and React Native DevTools, https://reactnative.dev/blog/2024/10/23/release-0.76-new-architecture
- Apple Developer Documentation: LABiometryType.opticID, https://developer.apple.com/documentation/localauthentication/labiometrytype/opticid
- Apple Developer Documentation: UIApplication.keyWindow, https://developer.apple.com/documentation/uikit/uiapplication/keywindow
- Apple Developer Documentation: CLLocationManager authorizationStatus, https://developer.apple.com/documentation/corelocation/cllocationmanager/authorizationstatus-swift.property
- Detox device object API, https://wix.github.io/Detox/docs/19.x/api/device-object-api/

## Issues Found
- The performance section said native modules execute without bridge overhead. Updated it to clarify that legacy native modules still communicate through the React Native bridge, while moving expensive work off the JavaScript thread.
- The Swift biometric example referenced `.opticID` without an availability check. Added an iOS 17 availability guard before using the enum case.
- The callback rules overstated the behavior by saying callbacks must always be invoked and multiple calls will crash. Reworded this to match React Native guidance: callbacks are intended for single invocation, and retained callbacks must be released or invoked.
- The constants section used direct module property access. Updated the JavaScript example to use `getConstants()`, which React Native recommends for TurboModule compatibility.
- The threading section said native module methods are invoked on a background thread by default. Updated it to state that modules should not assume a specific calling thread.
- The alert example used deprecated `UIApplication.keyWindow`. Replaced it with React Native's `RCTPresentedViewController()` helper and noted the required `RCTUtils` import.
- The Swift image-processing snippet used `UIImage` without importing UIKit. Added the missing import.
- The TurboModules section described TypeScript/Flow types as runtime-enforced. Updated it to describe Codegen-generated native interfaces instead.
- The New Architecture opt-in wording implied `RCT_NEW_ARCH_ENABLED` is always required. Updated it to clarify this applies to React Native versions where the New Architecture is not already enabled by default.
- The Objective-C++ TurboModule example used legacy export macros and bridge imports. Updated it to implement the generated Codegen spec interface and removed the legacy constant export from the TurboModule snippet.
- The Flipper debugging section presented Flipper as current default guidance. Updated it to state that React Native DevTools is the default in modern React Native releases and that the Flipper snippet applies to older projects.

## Review Notes
The article still focuses heavily on legacy native modules, which are documented by React Native as stable legacy-architecture APIs that will be deprecated in favor of the New Architecture. That is acceptable for a bridging tutorial, but future revisions should consider making the target React Native version explicit.
