# Validation Summary: How to Write Platform-Specific Code in React Native (iOS vs Android)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- React Native
- TypeScript
- iOS and Android platform-specific React Native code
- React Native `Platform`, `Keyboard`, `TextInput`, `ScrollView`, `FlatList`, `StatusBar`, and `BackHandler` APIs
- Metro platform-specific file resolution
- `@react-native-community/datetimepicker`
- React Navigation
- `react-native-permissions`
- Detox

## Sources Consulted
- React Native Platform-Specific Code documentation: https://reactnative.dev/docs/platform-specific-code
- React Native Platform API documentation: https://reactnative.dev/docs/platform
- React Native Keyboard API documentation: https://reactnative.dev/docs/keyboard
- React Native TextInput documentation: https://reactnative.dev/docs/textinput
- React Native ScrollView documentation: https://reactnative.dev/docs/scrollview
- React Native FlatList documentation: https://reactnative.dev/docs/flatlist
- React Navigation native stack documentation: https://reactnavigation.org/docs/native-stack-navigator/
- `@react-native-community/datetimepicker` documentation: https://github.com/react-native-datetimepicker/datetimepicker/blob/master/README.md
- `react-native-permissions` documentation: https://github.com/zoontek/react-native-permissions
- Detox Actions documentation: https://wix.github.io/Detox/docs/api/actions/

## Issues Found
- The iOS date picker example imported `useState` but did not use it. Removed the unused import and renamed the unused `onChange` event parameter to `_event`.
- The date picker usage example used `React.FC` and `useState` without importing React and `useState`. Added the missing import.
- The typography, TextInput, keyboard, and navigation snippets included unused imports. Removed unused imports so the examples are cleaner and friendlier to TypeScript projects with stricter settings.
- The keyboard form example stored `keyboardHeight` without using it. Applied the Android keyboard height as bottom padding so the state has an effect.
- The permission example modeled notifications as `PERMISSIONS.IOS.NOTIFICATIONS` / `PERMISSIONS.ANDROID.POST_NOTIFICATIONS`. Current `react-native-permissions` documentation handles notifications through `checkNotifications` and `requestNotifications`, so the snippet now uses those APIs and keeps `check` / `request` for runtime permissions.
- The permission example checked for Android `RESULTS.BLOCKED` immediately after `check`, but `react-native-permissions` documents that Android `check` does not return `blocked`; `request` must be called to obtain that state. Updated the flow to return early for already granted/limited permissions and handle `blocked` after `request`.
- The Detox scroll helper passed a speed argument to `element.scroll`, but the documented signature is `scroll(offset, direction[, startPositionX, startPositionY])`. Removed the unsupported argument.
- The platform permission map compared `Platform.Version` to `33` without narrowing it to Android's numeric API level type. Added a numeric cast in the Android permission selection.

## Review Notes
Some design constants such as safe area heights, navigation bar heights, font choices, and animation durations are reasonable illustrative defaults, but production apps should derive safe areas from device/runtime APIs and validate visual constants against their own design system and supported OS versions.
