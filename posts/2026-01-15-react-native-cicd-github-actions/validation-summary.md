# Validation Summary: How to Set Up CI/CD Pipelines for React Native with GitHub Actions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitHub Actions (workflows, jobs, steps, runners, secrets, environments, reusable workflows, matrix builds, concurrency)
- React Native (CLI builds, Metro config)
- iOS build & code signing (Xcode `xcodebuild`, CocoaPods, `security` keychain, provisioning profiles, ExportOptions.plist)
- Android build & signing (Gradle `assembleRelease`/`bundleRelease`, keystore, `keytool`, ProGuard)
- Detox (E2E testing)
- Codecov
- Fastlane (`deliver`/`upload_to_app_store`, `supply`/`upload_to_play_store`, App Store Connect API key)
- Ruby / Bundler

## Sources Consulted
- actions/checkout releases — https://github.com/actions/checkout/releases (confirmed v6 exists, runs on Node 24)
- actions/setup-node releases — https://github.com/actions/setup-node/releases (confirmed v6, Node 24)
- actions/setup-java releases — https://github.com/actions/setup-java/releases (confirmed v5, e.g. v5.1.0)
- actions/cache releases — https://github.com/actions/cache/releases (confirmed v5, latest v5.0.5, Node 24 runtime)
- codecov/codecov-action — https://github.com/codecov/codecov-action (confirmed v5 is valid/recommended)
- android-actions/setup-android releases — https://github.com/android-actions/setup-android/releases (confirmed v3 exists; v4 now latest)
- GitHub Docs: Installing an Apple certificate on macOS runners for Xcode development — https://docs.github.com/en/actions/deployment/deploying-xcode-applications/installing-an-apple-certificate-on-macos-runners-for-xcode-development
- Fastlane docs — https://docs.fastlane.tools/

## Issues Found
No technical issues found.

The GitHub Actions version pins are accurate and current as of the validation date:
- `actions/checkout@v6`, `actions/setup-node@v6`, `actions/setup-java@v5`, `actions/cache@v5`, `codecov/codecov-action@v5`, `actions/upload-artifact@v4`, `actions/download-artifact@v4`, `android-actions/setup-android@v3`, `softprops/action-gh-release@v2`, `ruby/setup-ruby@v1` all resolve to real, non-deprecated releases.

The iOS code-signing step (`base64 --decode -o`, `security create-keychain`/`set-keychain-settings`/`unlock-keychain`/`import`/`list-keychain`) matches GitHub's official Apple-certificate-on-macOS-runners documentation. The Android keystore/Gradle signing config, `keytool` invocation, and Fastlane `deliver`/`supply` lanes are all correct and use current flags.

## Review Notes
- `android-actions/setup-android@v4` (latest, released April 2026) is now available; the post's `@v3` still works and is not deprecated, but a future update could bump it.
- `codecov/codecov-action@v6` now exists as well; `@v5` remains valid and supported.
- The iOS workflow pins `DEVELOPER_DIR: /Applications/Xcode_15.0.app` on `macos-14`. This is valid for that runner image, but readers on newer runner images (macos-15) should adjust the Xcode path to an installed version. Not an error — just a version-sensitive value worth keeping in sync with the chosen runner.
- The `metro.config.js` snippet that adds `'env'` to `sourceExts` is presented as an illustrative "or similar package" example for env management; `react-native-config` itself does not require this. Acceptable as written since it is framed as illustrative, not a precise `react-native-config` setup.
- `compileBitcode: false` in ExportOptions.plist is correct given Apple deprecated/removed bitcode in recent Xcode versions.
