# Validation Summary: How to Handle Platform-Specific Permissions in React Native

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- React Native
- react-native-permissions
- iOS Info.plist privacy usage descriptions
- Android runtime permissions and AndroidManifest.xml
- TypeScript
- Jest
- Detox

## Sources Consulted
- react-native-permissions README and API documentation: https://github.com/zoontek/react-native-permissions
- React Native PermissionsAndroid documentation: https://reactnative.dev/docs/permissionsandroid
- Android runtime permissions guide: https://developer.android.com/training/permissions/requesting
- Android 13 behavior changes for granular media permissions: https://developer.android.com/about/versions/13/behavior-changes-13
- Android 11 storage changes: https://developer.android.com/about/versions/11/privacy/storage
- Android location permissions guide: https://developer.android.com/develop/sensors-and-location/location/permissions
- Apple protected resources / Info.plist privacy keys documentation: https://developer.apple.com/documentation/bundleresources/protected-resources
- Apple EventKit iOS 17 calendar permission changes: https://developer.apple.com/documentation/technotes/tn3153-adopting-api-changes-for-eventkit-in-ios-macos-and-watchos
- Detox device.launchApp permissions documentation: https://wix.github.io/Detox/docs/api/device/

## Issues Found
- The iOS setup used the older individual `pod 'Permission-*'` entries. Updated it to the current `react-native-permissions` `setup_permissions` Podfile flow.
- The Info.plist sample included deprecated `NSLocationAlwaysUsageDescription`; removed it and kept `NSLocationAlwaysAndWhenInUseUsageDescription`.
- The calendar Info.plist sample used deprecated `NSCalendarsUsageDescription`; replaced it with `NSCalendarsFullAccessUsageDescription` and `NSCalendarsWriteOnlyAccessUsageDescription`.
- The Bluetooth Info.plist sample included deprecated `NSBluetoothPeripheralUsageDescription`; removed it and kept `NSBluetoothAlwaysUsageDescription`.
- The Android storage permissions were presented as broadly valid through Android 12. Added `maxSdkVersion` limits for legacy read/write storage permissions and retained Android 13+ media permissions.
- The permission status table implied Android `check` can return `BLOCKED`. Clarified that `check` never returns `BLOCKED` on Android and `request` is needed to obtain that status.
- The `requestMultiplePermissions` snippet called `requestMultiple` without importing it. Added the missing import.
- Several snippets had incorrect or unused imports. Removed unused imports and added missing `Alert` and `Permission` imports where required.
- The pitfall example returned a state object incompatible with its declared `PermissionState` type. Added a matching `CheckedPermissionState` interface.
- The Jest test description said "true" while the function returns the string `"granted"`. Updated the test name to match the expectation.
- The Detox example used `device.launchApp({ permissions })` as if it applied generally and used lowercase `yes`. Guarded the permission setup examples for iOS and changed the granted value to `YES`, matching Detox's documented iOS permission values.

## Review Notes
The article remains a broad tutorial rather than a complete drop-in module. Some snippets still assume surrounding app code such as navigation, styles, UI components, and helper functions exist, which is acceptable for a guide but should be called out if the post is later converted into a runnable sample.
