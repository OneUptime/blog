# Validation Summary: How to Protect React Native Apps from Jailbreak/Root Detection

## Status
validated

## Post Type
Technical tutorial / implementation guide

## Technologies Covered
- React Native
- jail-monkey
- iOS jailbreak detection
- Android root detection
- React Native Linking
- Segment Analytics for React Native
- react-native-ssl-pinning
- AsyncStorage

## Sources Consulted
- jail-monkey GitHub README and npm package metadata: https://github.com/GantMan/jail-monkey
- jail-monkey 3.0.0 npm package source and TypeScript definitions
- React Native Linking documentation: https://reactnative.dev/docs/linking
- React Native library autolinking documentation: https://reactnative.dev/docs/linking-libraries-ios
- react-native-ssl-pinning GitHub README: https://github.com/MaxToyberman/react-native-ssl-pinning
- Segment Analytics React Native documentation: https://www.twilio.com/docs/segment/connections/sources/catalog/libraries/mobile/react-native
- @react-native-async-storage/async-storage npm package metadata: https://www.npmjs.com/package/@react-native-async-storage/async-storage
- OWASP Mobile Application Security Testing Guide: https://owasp.org/www-project-mobile-security-testing-guide/
- Apple Platform Security guide: https://support.apple.com/guide/security/welcome/web
- Android security best practices: https://developer.android.com/topic/security/best-practices

## Issues Found
- The post described `JailMonkey.isOnExternalStorage()` as emulator/simulator detection. The jail-monkey API documents this as Android external-storage detection, so references to emulator detection in the code examples and policy examples were changed to external-storage detection.
- The post treated `JailMonkey.isDebuggedMode()` as synchronous. jail-monkey 3.0.0 documents and types it as `Promise<boolean>`, so the examples now await it.
- The build-tags example called `NativeModules.JailMonkey.getBuildTags()`, which is not a documented jail-monkey API. It was changed to read the root detection method result exposed by jail-monkey.
- The Cydia URL scheme example used `Linking.canOpenURL()` without importing `Linking` or noting the iOS `LSApplicationQueriesSchemes` requirement. The import and caveat were added.
- The Frida detection snippet imported `NativeModules` without using it. The unused import was removed.
- The Segment analytics example used a default `analytics` import, but current Segment React Native documentation uses `createClient()`. The example now creates a Segment client with `createClient`.
- The security appeal component used `Platform.OS` and `Platform.Version` without importing `Platform`. The missing import was added.
- The setup text implied `react-native link` was a fallback for current autolinking failures. It now identifies manual linking as a pre-React Native 0.60 path and keeps CocoaPods installation for iOS autolinking.
- The library popularity claim was softened from "the most popular" to "commonly used" because the stronger claim was not supported by official documentation.

## Review Notes
- Several lower-level detection snippets, such as custom Frida, Magisk, and hiding-tweak checks, remain illustrative and depend on app-specific helper functions like `fileExists()` and `checkPort()`.
- jail-monkey 3.0.0 documentation and package internals are not perfectly aligned on the granular Android root-detection export name. The post now uses the package export shape observed in the 3.0.0 source.
- Client-side jailbreak/root detection is correctly presented as bypassable and should remain framed as one defense-in-depth layer rather than a complete security control.
