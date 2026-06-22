# Validation Summary: How to Prevent Reverse Engineering of React Native Apps

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- React Native
- Metro bundler
- Hermes JavaScript engine and Hermes bytecode
- JavaScript obfuscation
- Android ProGuard and R8
- Android package signatures and runtime checks
- iOS code signing, entitlements, and jailbreak/debug checks
- React Native secure storage
- SSL certificate pinning
- API request signing and server-side validation

## Sources Consulted
- React Native Hermes documentation: https://reactnative.dev/docs/hermes
- React Native Security documentation: https://reactnative.dev/docs/next/security
- Android Developers R8 optimization documentation: https://developer.android.com/topic/performance/app-optimization/enable-app-optimization
- Android Developers R8 full mode documentation: https://developer.android.com/topic/performance/app-optimization/full-mode
- Android PackageManager API reference: https://developer.android.com/reference/android/content/pm/PackageManager
- Guardsquare ProGuard reference card: https://www.guardsquare.com/manual/refcard
- Apple Developer Forums / Xcode bitcode deprecation guidance referencing Xcode 15 release notes: https://developer.apple.com/forums/thread/763562
- Apple TN3125, provisioning profiles: https://developer.apple.com/documentation/technotes/tn3125-inside-code-signing-provisioning-profiles
- Apple SecStaticCode documentation: https://developer.apple.com/documentation/security/secstaticcode
- react-native-config README: https://github.com/react-native-config/react-native-config/blob/master/README.md
- react-native-keychain documentation: https://oblador.github.io/react-native-keychain/docs/
- react-native-ssl-pinning README: https://github.com/MaxToyberman/react-native-ssl-pinning
- javascript-obfuscator options documentation: https://obfuscator.io/docs/options

## Issues Found
- Updated Hermes enabling guidance. The post used older `project.ext.react` / `enableHermes` / hardcoded `hermesCommand` configuration, but current React Native enables Hermes by default and bundles a compatible Hermes version. Replaced this with current default behavior and older-project flags.
- Corrected R8 full mode guidance. Android Gradle Plugin 8.0 and later enable R8 full mode by default, so the modern action is to remove `android.enableR8.fullMode=false`; explicit `android.enableR8.fullMode=true` only applies to older AGP 7.x projects.
- Corrected iOS bitcode guidance. Current Xcode versions no longer support bitcode, so the release-build advice now says to leave bitcode disabled/unavailable and focus on symbol stripping.
- Fixed misleading ProGuard wording. `-adaptclassstrings` adapts class-name string constants after obfuscation; it does not encrypt arbitrary string literals.
- Fixed Android debug/signature snippets. The original examples used an undefined `context`, deprecated `GET_SIGNATURES` unconditionally, SHA-1 hashing for debug-key checks, and an invalid `"debug"` substring check. The snippets now accept `Context`, use `GET_SIGNING_CERTIFICATES` on API 28+, and compare SHA-256 certificate hashes.
- Fixed iOS debug detection snippet imports. The sample used socket and dyld APIs without required headers.
- Replaced the Java memory-integrity sample. Java reflection does not expose method bytecode in a way that makes the original `calculateMethodHash(method)` example valid. The section now demonstrates file/native-library hash verification instead.
- Fixed secure storage snippet. The original code used `Platform` without importing it and did not pass a `service` when retrieving per-key iOS Keychain entries. The example now imports `Platform` and uses `react-native-keychain` service names consistently.
- Fixed Android signature verification. The code-signing example now uses `GET_SIGNING_CERTIFICATES` on API 28+, preserves a legacy path for older API levels, includes the missing hash helper, and avoids producing a trailing colon in the formatted hash.
- Corrected iOS code-signing validation. `SecStaticCode` APIs are not a general iOS self-verification equivalent for App Store apps, so the snippet now checks expected provisioning/profile data and entitlements instead of using macOS/Mac Catalyst static-code validation APIs.

## Review Notes
The guide is technically relevant and useful, but several defenses discussed are bypassable on compromised devices. Future revisions could emphasize server-side controls, hardware-backed attestation, and false-positive handling more strongly than client-side tamper checks.
