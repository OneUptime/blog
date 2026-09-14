# Validation Summary: How to Debug Missing Native Symbols in Sentry for iOS, Android, Flutter, and Windows

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Sentry and `sentry-cli`
- Apple iOS, Mach-O binaries, dSYMs, and `dwarfdump`
- Android Gradle plugin, R8, ProGuard, and Android NDK symbols
- Flutter and Dart obfuscation symbols
- Windows PE binaries and PDB files

## Sources Consulted
- [Sentry debug information files](https://docs.sentry.io/platforms/native/data-management/debug-files/)
- [Sentry CLI debug information file commands](https://docs.sentry.io/cli/dif/)
- [Sentry Apple dSYM documentation](https://docs.sentry.io/platforms/apple/dsym/)
- [Sentry Android Gradle plugin documentation](https://docs.sentry.io/platforms/android/configuration/gradle/)
- [Sentry Android Gradle plugin extension source](https://github.com/getsentry/sentry-android-gradle-plugin/blob/main/plugin-build/src/main/kotlin/io/sentry/android/gradle/extensions/SentryPluginExtension.kt)
- [Sentry Flutter debug symbols documentation](https://docs.sentry.io/platforms/dart/guides/flutter/debug-symbols/)
- [Flutter obfuscation documentation](https://docs.flutter.dev/deployment/obfuscate)
- Sentry CLI 3.7.0 built-in help for `debug-files check`, `debug-files find`, and `debug-files upload`

## Issues Found
No technical issues found.

## Review Notes
The commands were checked against Sentry CLI 3.7.0. The Android configuration properties are present in the current Sentry Android Gradle plugin source, and the Flutter build flags match current Flutter documentation. The post appropriately avoids promising that an upload alone guarantees symbolication and correctly treats managed-code mappings, Dart symbols, and native debug files as separate artifact classes. Because no dependency versions are pinned, future major CLI or plugin releases may require the examples to be rechecked.
