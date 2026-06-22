# Validation Summary: How to Implement Biometric Authentication in React Native

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- React Native
- expo-local-authentication
- react-native-biometrics
- react-native-keychain
- TypeScript
- Jest (unit testing / mocks)
- Detox (E2E testing)
- iOS Simulator / Android Emulator biometric testing
- AsyncStorage

## Sources Consulted
- expo-local-authentication official docs — https://docs.expo.dev/versions/latest/sdk/local-authentication/
- Expo GitHub issues confirming the full `authenticateAsync` error-code set — https://github.com/expo/expo/issues/9846
- react-native-biometrics repository (API surface, install) — https://github.com/SelfLender/react-native-biometrics
- react-native-keychain docs (access control / accessible / biometry types) — https://github.com/oblador/react-native-keychain
- "So you want to automate iOS biometrics" (Kin + Carta) — https://medium.com/kinandcartacreated/so-you-want-to-automate-ios-biometrics-81bd015f5d38
- "Mocking Capabilities in the iOS Simulator" (saagarjha) — https://saagarjha.com/blog/2019/01/11/mocking-capabilities-in-the-ios-simulator/
- AppleSimulatorUtils (CLI biometric enrollment) — https://github.com/wix/AppleSimulatorUtils
- Android biometric auth docs — https://developer.android.com/training/sign-in/biometric-auth

## Issues Found
1. **Fabricated iOS Simulator biometric commands.** The "Simulator/Emulator Testing" section claimed you could enroll/match Face ID via `xcrun simctl privacy booted grant face-id ...`, `xcrun simctl ui booted biometrics match`, and `... biometrics non-match`. None of these `simctl` subcommands exist — `simctl ui` only supports appearance/content-size/contrast options, and `simctl privacy` has no `face-id` service. Verified against authoritative articles on iOS biometric automation. Replaced with the actual methods: the Simulator's **Features → Face ID/Touch ID** menu (Enrolled / Matching / Non-matching) and the third-party `applesimutils --booted --biometricEnrollment YES` CLI for scripted enrollment.

2. **Invalid `lockout_permanent` error code.** The `authenticate` hook switched on `result.error === 'lockout_permanent'`, but expo-local-authentication never returns that value. The documented error set is `not_enrolled | user_cancel | app_cancel | not_available | lockout | no_space | timeout | unable_to_process | unknown | system_cancel | user_fallback | invalid_context | passcode_not_set | authentication_failed`. Replaced the dead branch with a real code, `passcode_not_set`, with an appropriate message.

3. **Misleading duplicated Android emulator command.** The Android section listed `adb -e emu finger touch 1` twice, with the first comment incorrectly labeling it "Open fingerprint settings" (the command sends a fingerprint touch event; it does not open settings). Collapsed to a single, correctly described command with a note to enroll a fingerprint via the emulator Settings first.

## Review Notes
- The expo-local-authentication, react-native-biometrics, and react-native-keychain API usage (method names, option keys, enum members such as `BiometryTypes`, `ACCESS_CONTROL`, `ACCESSIBLE`, `SECURITY_LEVEL`, `STORAGE_TYPE`, `BIOMETRY_TYPE`) all match the current library APIs.
- Platform support table is accurate: Touch ID (iOS 8+), Face ID (iOS 11+), Android fingerprint (API 23 / 6.0+).
- Detox biometric APIs (`device.matchFace()`, `device.unmatchFace()`, `device.matchFinger()`, `permissions: { faceid: 'YES' }`) are valid.
- Minor (left as-is, not an error): the "bare React Native projects" install block lists both `npm install expo-local-authentication` and `npx expo install expo-local-authentication`; `npx expo install` is the recommended single command and assumes the `expo` package is present in the project. Not incorrect, just slightly redundant.
- react-native-biometrics is stable but its last release dates to 2022; this is a maintenance caveat, not a correctness issue.
