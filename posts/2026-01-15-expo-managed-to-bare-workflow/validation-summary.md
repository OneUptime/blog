# Validation Summary: How to Migrate from Expo Managed Workflow to Bare Workflow

## Status
validated

## Post Type
Tutorial / Step-by-step migration guide

## Technologies Covered
- Expo (managed and bare workflow, `expo prebuild`, EAS Build, expo-dev-client, Expo modules)
- React Native (autolinking, native modules, AppDelegate, MainApplication)
- iOS native development (Objective-C, CocoaPods/Podfile, Info.plist, Xcode signing, entitlements)
- Android native development (Java, Gradle, AndroidManifest.xml, ProGuard, Hermes)
- Mobile build tooling (Metro bundler, Watchman, Detox, Jest)

## Sources Consulted
- Expo docs — Prebuild: https://docs.expo.dev/workflow/prebuild/
- Expo docs — Adopting prebuild / continuous native generation: https://docs.expo.dev/guides/adopting-prebuild/
- Expo docs — `npx expo prebuild` CLI reference and flags (`--clean`, `--platform`, `--no-install`, `--template`)
- Expo docs — expo-dev-client and `npx expo run:ios` / `run:android`: https://docs.expo.dev/develop/development-builds/introduction/
- Expo docs — EAS Build configuration (eas.json): https://docs.expo.dev/build/eas-json/
- Expo docs — expo-doctor / `npx expo install --fix`: https://docs.expo.dev/develop/tools/
- React Native docs — Native Modules (iOS/Android) and autolinking: https://reactnative.dev/docs/native-modules-intro
- Expo SDK 50/51 default Podfile and `AppDelegate.mm` / `MainApplication.java` templates (expo-template-bare-minimum)

## Issues Found
- **Inconsistent iOS AppDelegate filename in the simplified project structure.** The "Bare workflow project structure" diagram listed `AppDelegate.m`, while Expo prebuild generates `AppDelegate.mm` (Objective-C++), which the post itself correctly shows later in the detailed iOS directory structure and the AppDelegate code sample. Changed `AppDelegate.m` → `AppDelegate.mm` in the structure diagram for accuracy and internal consistency.

## Review Notes
- **Native language/version caveat:** The native code examples use Objective-C (`AppDelegate.mm`) for iOS and Java (`MainApplication.java`, `MainActivity.java`) for Android, which matches Expo SDK ~50–52 / React Native templates. Starting with Expo SDK 53 (2025), `expo prebuild` generates Swift (`AppDelegate.swift`) for iOS and Kotlin (`MainApplication.kt`/`MainActivity.kt`) for Android by default. The shown patterns remain valid React Native, but readers on the newest SDK will see Swift/Kotlin files instead. Left as-is since rewriting would be a structural change beyond fixing errors.
- **`npx react-native link`:** The post shows `npx react-native link react-native-some-library` but explicitly frames it as "rare in modern RN." This command was effectively removed after autolinking (RN 0.60+); the post's accompanying manual-linking example (editing `MainApplication` to add the package) is the correct modern approach, so the framing is acceptable. Worth modernizing in a future revision.
- The Podfile default deployment target (`13.4`), `eas.json` profiles, ProGuard rules, and the troubleshooting section (`pod install --repo-update`, `npx expo start --clear`, `expo-modules-autolinking resolve`, Hermes toggles) are all accurate and current.
