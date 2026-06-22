# Validation Summary: How to Set Up Beta Testing with TestFlight and Google Play Console

## Status
validated

## Post Type
Guide / Tutorial — a step-by-step walkthrough of setting up beta testing for React Native apps on TestFlight (iOS) and Google Play Console (Android), with accompanying code examples.

## Technologies Covered
- React Native
- TestFlight / App Store Connect (iOS beta distribution)
- Google Play Console (Android testing tracks)
- `react-native-device-info`
- Firebase Crashlytics (`@react-native-firebase/crashlytics`)
- Fastlane (`upload_to_play_store`)
- Gradle / Android signing (keytool, build.gradle)
- TypeScript / JavaScript

## Sources Consulted
- react-native-device-info README and API table — https://github.com/react-native-device-info/react-native-device-info (verified `getFirstInstallTime()` is Promise-based and the iOS return values of `getInstallerPackageName()`)
- Apple TestFlight documentation — https://developer.apple.com/testflight/ (tester limits, build expiration, Beta App Review)
- App Store Connect Help — internal (up to 100) vs external (up to 10,000) testing, 90-day build expiration, phased release over 7 days
- Google Play Console Help — https://support.google.com/googleplay/android-developer/ (internal/closed/open testing tracks, $25 one-time fee, percentage-based staged rollout)
- React Native Firebase Crashlytics docs — https://rnfirebase.io/crashlytics/usage (`setCrashlyticsCollectionEnabled`, `setUserId`, `setAttributes`, `recordError`)
- Fastlane docs — https://docs.fastlane.tools/ (`upload_to_play_store`, `track_promote_to`)

## Issues Found
1. **`DeviceInfo.getFirstInstallTime()` used synchronously** (in `checkBetaExpiration`). This method returns a `Promise<number>`, not a number. Using it directly in arithmetic (`Date.now() - installTime`) would compute against a Promise object and yield `NaN`. There is no `getFirstInstallTimeSync()` variant for this method. Fixed by making the function `async` (`async (): Promise<void>`) and awaiting the call (`const installTime = await DeviceInfo.getFirstInstallTime();`).

2. **Incorrect iOS installer package name string** (in `getAppVersionInfo`). The code compared `installerPackageName === 'com.apple.testflight'`, but on iOS `getInstallerPackageName()` returns one of `"AppStore"`, `"TestFlight"`, or `"Other"`. Fixed the comparison to `installerPackageName === 'TestFlight'`.

## Review Notes
- `DeviceInfo.getModel()` is used with `await` in the `FeedbackForm` example. `getModel()` is synchronous (returns a string), so the `await` is unnecessary but harmless — left unchanged as it does not affect correctness.
- All other factual claims verified accurate: Apple Developer Program ($99/year), Google Play Developer ($25 one-time), TestFlight internal (up to 100) / external (up to 10,000) testers, 90-day TestFlight build expiration, iOS phased release over 7 days, Google Play percentage-based staged rollout, and the internal/closed(alpha)/open(beta) track model.
- Crashlytics, Fastlane, keytool, and Gradle signing snippets all use current, non-deprecated APIs and would work as described.
- The crash-rate, NPS, and engagement metrics objects are illustrative app-level constructs (not platform APIs) and are internally consistent.
