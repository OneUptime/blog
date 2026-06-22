# Validation Summary: How to Implement Code Push for Over-the-Air Updates in React Native

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- React Native
- CodePush (`react-native-code-push`)
- Microsoft Visual Studio App Center (hosted CodePush service)
- App Center CLI (`appcenter-cli`)
- TypeScript / JavaScript
- iOS native configuration (CocoaPods, AppDelegate, Info.plist)
- Android native configuration (Gradle, MainApplication)
- Jest (testing)

## Sources Consulted
- react-native-code-push README — https://github.com/microsoft/react-native-code-push (states App Center & CodePush retired March 31, 2025; repo archived May 20, 2025)
- react-native-code-push JavaScript API reference — https://github.com/microsoft/react-native-code-push/blob/master/docs/api-js.md (restartApp, notifyAppReady, getUpdateMetadata semantics)
- Standalone CodePush server — https://github.com/microsoft/code-push-server (open-source self-hostable server + bundled CLI; repo archived May 20, 2025)
- Microsoft App Center retirement announcements (App Center fully retired March 31, 2025)
- Expo EAS Update documentation — https://docs.expo.dev/eas-update/introduction/ (successor OTA service)

## Issues Found

1. **App Center presented as a live service (central, factual inaccuracy).** The post is dated January 15, 2026, yet Microsoft retired Visual Studio App Center — including the hosted CodePush service — on **March 31, 2025**, and both `react-native-code-push` and `code-push-server` were archived (read-only) on **May 20, 2025**. The entire "Setting Up App Center", deployment-key retrieval, and every `appcenter codepush ...` CLI command therefore no longer work against Microsoft's servers. The client SDK and integration code remain valid (the SDK still works against a self-hosted server).
   - **Fix:** Added a prominent note in the Introduction explaining the retirement and the archived repos, clarifying that the SDK/integration steps still work but the `appcenter.ms` portal and `appcenter` CLI commands no longer function, and pointing readers to the self-hostable [standalone CodePush server](https://github.com/microsoft/code-push-server) or [Expo EAS Update](https://docs.expo.dev/eas-update/introduction/). The `appcenter` examples are now framed as illustrative of the original workflow.

2. **Incorrect rollback API claim — `codePush.restartApp(true)`.** In the "Programmatic Rollback" example, the post claimed `codePush.restartApp(true); // true triggers rollback`. This is wrong: the boolean parameter is `onlyIfUpdateIsPending` and only conditions whether the restart happens — it does **not** trigger a rollback. Rollback occurs because `notifyAppReady()` was never called for the running (already-installed) update.
   - **Fix:** Replaced with `codePush.restartApp()` and corrected the comments to explain that an unconfirmed update (one for which `notifyAppReady()` is not called) is rolled back on the next launch.

3. **Backwards rollback logic in the "Safe Updates with Health Checks" example.** On health-check failure the post called `codePush.notifyAppReady(); // Mark as successful first` and then `codePush.restartApp(true); // Then rollback`. Calling `notifyAppReady()` marks the update **successful** and therefore *prevents* the rollback — the exact opposite of the intent.
   - **Fix:** Removed the erroneous `notifyAppReady()` on the failure path and used `codePush.restartApp()`, with a comment explaining that not confirming the update is what causes the rollback. The success path still correctly calls `notifyAppReady()`.

4. **Dead documentation link.** "App Center CodePush Documentation" pointed to `https://docs.microsoft.com/en-us/appcenter/distribution/codepush/`, which was decommissioned with App Center.
   - **Fix:** Replaced with the standalone CodePush server repo and an Expo EAS Update link; also marked the archived `react-native-code-push` repo as archived.

## Review Notes
- The `react-native-code-push` SDK API surface used throughout (`CheckFrequency`, `InstallMode`, `updateDialog` fields, `mandatoryInstallMode`, `getUpdateMetadata`/`UpdateState`, `checkForUpdate`, `RemotePackage.download` → `LocalPackage.install`, `clearUpdates`, `notifyAppReady`) is all accurate, and the iOS/Android native wiring (`sourceURLForBridge` → `[CodePush bundleURL]`, `getJSBundleFile()`, Gradle/settings.gradle paths) matches the SDK's documented setup for the bridge-based React Native architecture. These remain correct when pointing the SDK at a self-hosted server.
- The native setup shown reflects the legacy (pre-bridgeless / pre-`AppDelegate.swift`) React Native architecture. On the New Architecture, `MainApplication` is commonly Kotlin and `AppDelegate` may be Swift; the snippets are still representative but readers on newer RN templates should adapt accordingly.
- In the Security Considerations section, the command `appcenter codepush deployment add ... --private-key-path ./private.pem` (commented "Generate keys for code signing") is not how code signing keys are created — `deployment add` only creates a named deployment and does not generate keys or accept `--private-key-path`. Code-signing keys are generated separately (e.g. via OpenSSL) and the public key is configured on the client; only `release-react`/`promote` accept `--private-key-path`. This was left in place (rather than rewritten) because the entire `appcenter` CLI is now non-functional and is already flagged as illustrative by the retirement note, but it is technically inaccurate.
- The CocoaPods `pod 'CodePush', :path => ...` entry is typically auto-linked in modern RN and may not need to be added manually; harmless if present.
