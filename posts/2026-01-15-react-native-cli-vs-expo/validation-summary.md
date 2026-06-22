# Validation Summary: How to Choose Between React Native CLI and Expo for Your Project

## Status
validated

## Post Type
Guide / Comparison (decision-making guide with code, commands, and configuration examples)

## Technologies Covered
- React Native CLI (@react-native-community/cli)
- Expo SDK, Expo Go, Expo Router
- EAS (Build, Submit, Update)
- Expo Config Plugins / Prebuild / Continuous Native Generation
- Hermes JavaScript engine
- Native modules (Swift, Objective-C, Kotlin, Java)
- expo-image-picker, expo-image-manipulator, expo-camera, expo-sqlite, expo-notifications
- Stripe React Native SDK

## Sources Consulted
- React Native 0.77 release blog (deprecation of `react-native init`): https://reactnative.dev/blog/2025/01/21/version-0.77
- React Native CLI / community CLI usage (2025): https://medium.com/@rohanash/as-of-2025-the-latest-command-to-setup-your-react-native-project-is-npx-react-native-community-cli-117d9fd54d97
- React Native DevTools docs (replaces Flipper since 0.76): https://reactnative.dev/docs/react-native-devtools
- React Native DevTools 0.76 announcement: https://github.com/react-native-community/discussions-and-proposals/discussions/819
- Bundled Hermes / `hermesEnabled` in gradle.properties: https://reactnative.dev/architecture/bundled-hermes
- Expo BarCodeScanner deprecation/removal (SDK 51): https://github.com/expo/expo/issues/27015
- Expo Camera barcode scanning API: https://docs.expo.dev/versions/latest/sdk/camera/
- Expo SQLite (openDatabaseSync / runAsync) docs: https://docs.expo.dev/versions/latest/sdk/sqlite/
- Expo ImagePicker (MediaTypeOptions deprecation): https://docs.expo.dev/versions/latest/sdk/imagepicker/

## Issues Found
1. **Deprecated project init command.** The post used `npx react-native@latest init MyProject`. The `react-native init` command was deprecated in RN 0.75 and removed in 0.77. Changed to `npx @react-native-community/cli@latest init MyProject`, the current official command for the bare React Native CLI.

2. **Flipper / Chrome debugging recommended as current.** The CLI debugging block recommended "Debug with Chrome" and "Flipper (recommended)". Flipper was deprecated in RN 0.74 and removed from the default template; React Native DevTools became the stable, built-in debugger in RN 0.76. Updated the code comments to describe React Native DevTools and note that Flipper is no longer bundled.

3. **Developer Experience table listed Flipper.** The "Debugging Tools" row listed "Flipper" for React Native CLI. Updated to "React Native DevTools".

4. **Outdated Hermes configuration.** The post enabled Hermes via `project.ext.react = [enableHermes: true]` in `android/app/build.gradle`. Since RN 0.70+ Hermes is the default and is toggled via `hermesEnabled=true` in `android/gradle.properties`. Updated the snippet (and noted Hermes is on by default).

5. **Deprecated `ImagePicker.MediaTypeOptions`.** The social-media use case used `mediaTypes: ImagePicker.MediaTypeOptions.Images`. `MediaTypeOptions` is deprecated in favor of an array of media-type strings. Changed to `mediaTypes: ['images']`.

6. **Removed `expo-barcode-scanner` and legacy `expo-sqlite` API (Use Case 5).** The inventory-scanner example imported `BarCodeScanner` from `expo-barcode-scanner` (deprecated in SDK 50, removed in SDK 51) and used the legacy `SQLite.openDatabase(...)` + `db.transaction(tx => tx.executeSql(...))` callback API (removed in SDK 51). Rewrote the example to use `expo-camera`'s `CameraView` + `useCameraPermissions` with `barcodeScannerSettings`/`onBarcodeScanned`, and the current `expo-sqlite` API (`openDatabaseSync` + `runAsync`).

## Review Notes
- `expo-image-manipulator`'s `manipulateAsync` (Use Case 1) still works but the legacy function was deprecated in SDK 52 in favor of the new context-based `ImageManipulator.manipulate()` / `useImageManipulator` API. Left as-is since it is still functional; worth modernizing in a future revision.
- The Expo SDK feature list includes "In-App Purchases" and "MapView". `expo-in-app-purchases` was discontinued (Expo now points users to RevenueCat / `react-native-iap`), and maps historically required `react-native-maps` (a newer `expo-maps` is in preview). These are minor and the list is illustrative, so they were not changed, but the wording could be tightened in a future pass.
- The illustrative RN CLI project tree shows a `src/` folder, which the default template does not generate. Left unchanged as it is clearly illustrative.
- The general conceptual comparison (managed vs. bare/prebuild, CNG, EAS services, team-skill and decision frameworks, setup-time and bundle-size ranges) is accurate and consistent with current Expo and React Native documentation.
