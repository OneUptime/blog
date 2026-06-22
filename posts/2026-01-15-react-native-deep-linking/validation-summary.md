# Validation Summary: How to Implement Deep Linking in React Native Applications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- React Native (Linking API)
- React Navigation (`@react-navigation/native`, `@react-navigation/native-stack`, linking configuration)
- iOS deep linking (custom URL schemes via `Info.plist`, `RCTLinkingManager` in `AppDelegate`, Universal Links, `apple-app-site-association`, Associated Domains)
- Android deep linking (intent filters in `AndroidManifest.xml`, App Links, `assetlinks.json`, Digital Asset Links)
- TypeScript
- Third-party services (Branch, Adjust, AppsFlyer, Firebase Dynamic Links)
- Firebase Analytics (`@react-native-firebase/analytics`)
- Testing tooling (`xcrun simctl`, `adb`, `keytool`)

## Sources Consulted
- React Navigation deep linking documentation: https://reactnavigation.org/docs/deep-linking/
- React Navigation configuring links: https://reactnavigation.org/docs/configuring-links
- React Native Linking API: https://reactnative.dev/docs/linking
- Apple Universal Links / AASA documentation: https://developer.apple.com/documentation/xcode/supporting-universal-links-in-your-app
- Android App Links documentation: https://developer.android.com/training/app-links
- Android Digital Asset Links (`assetlinks.json`): https://developer.android.com/training/app-links/verify-android-applinks
- Firebase Dynamic Links Deprecation FAQ: https://firebase.google.com/support/dynamic-links-faq
- `react-native-url-polyfill`: https://github.com/charpeni/react-native-url-polyfill
- React Native URL/URLSearchParams not spec-compliant: https://github.com/facebook/react-native/pull/30188 and https://github.com/facebook/react-native/issues/23922

## Issues Found
- **Firebase Dynamic Links status was outdated.** The post listed Firebase Dynamic Links as "being deprecated." Google fully shut the service down on August 25, 2025, so as of the validation date it is dead, not merely deprecating. Updated the wording to "deprecated and fully shut down as of August 25, 2025 — migrate off it."
- **`new URL(url)` with `searchParams` would crash in React Native.** The "Using the Linking API" example uses `new URL(url)` and `Object.fromEntries(parsedUrl.searchParams)`. React Native's built-in `URL` implementation is not spec-compliant and accessing `searchParams` throws "not implemented" at runtime. Added a note and an `import 'react-native-url-polyfill/auto';` line so the example actually works, since `react-native-url-polyfill` is required for `URL`/`URLSearchParams` to behave correctly.

## Review Notes
- The iOS configuration (`CFBundleURLTypes` in `Info.plist`, the two `RCTLinkingManager` `AppDelegate` methods) is correct and matches React Navigation's iOS setup docs.
- The Android intent-filter configuration, `singleTask` launch mode guidance, and `autoVerify="true"` for App Links are accurate.
- The `apple-app-site-association` example uses the legacy `paths` array format. This still works, but Apple's current recommended format uses a `components` array (which supports query/fragment matching and exclusions). The legacy format remains valid, so this was left as-is; future updates could mention the `components` format.
- The `assetlinks.json` structure, the `keytool` fingerprint commands, the Apple AASA CDN validation URL (`app-site-association.cdn-apple.com/a/v1/...`), and the `adb shell pm get-app-links` diagnostic command are all correct.
- The React Navigation `linking` object (prefixes, `config.screens`, `parse`, `getInitialURL`, `subscribe`, `getStateFromPath`) and the use of `Linking.addEventListener('url', ...)` returning a subscription with `.remove()` are current and correct for modern React Native / React Navigation.
- Several snippets are illustrative and omit surrounding imports/definitions (e.g., `navigateToProduct`, `fetchDeferredLinkFromServer`, `getStateFromPath` import, `navigationRef` wiring), which is acceptable for a tutorial.
