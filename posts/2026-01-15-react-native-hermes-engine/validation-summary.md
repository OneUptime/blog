# Validation Summary: How to Use Hermes Engine for Better React Native Performance

## Status
validated

## Post Type
Tutorial / Implementation Guide

## Technologies Covered
- React Native
- Hermes JavaScript engine
- JavaScriptCore
- Android Gradle configuration
- iOS CocoaPods configuration
- Metro bundler
- Babel
- React Native DevTools
- Flipper
- Hermes profiling and bytecode tools

## Sources Consulted
- React Native Hermes documentation: https://reactnative.dev/docs/hermes
- React Native "Hermes as the Default" announcement: https://reactnative.dev/blog/2022/07/08/hermes-as-the-default
- React Native JavaScript Environment documentation: https://reactnative.dev/docs/javascript-environment
- React Native Optimizing JavaScript Loading documentation: https://reactnative.dev/docs/optimizing-javascript-loading
- React Native Performance Overview: https://reactnative.dev/docs/performance
- React Native Profiling documentation: https://reactnative.dev/docs/profiling
- React Native Debugging Basics: https://reactnative.dev/docs/debugging
- React Native DevTools documentation: https://reactnative.dev/docs/react-native-devtools
- React Native Other Debugging Methods documentation: https://reactnative.dev/docs/other-debugging-methods
- React Native Metro configuration documentation: https://reactnative.dev/docs/metro
- Expo Hermes documentation: https://docs.expo.dev/guides/using-hermes/
- Hermes Profile Transformer documentation: https://github.com/react-native-community/hermes-profile-transformer

## Issues Found
- The post described Hermes as reducing JavaScript bundle size and performing dead code elimination. Changed this to app-size-oriented wording because official React Native documentation describes smaller app size, while bundle and bytecode size vary by app and release.
- The JavaScriptCore comparison described JSC as always JIT-based. Changed this to note runtime parsing/compilation and that JIT depends on platform support; React Native's docs explicitly note JSC does not use JIT on iOS.
- The Android setup conflated Hermes with the New Architecture and used modern guidance alongside legacy `project.ext.react` / `react.gradle` configuration. Clarified that `newArchEnabled` is separate, marked the old Gradle snippet as legacy, and removed the manual `hermes-android` dependency.
- The iOS setup recommended `ENV['USE_HERMES']`, pod cache cleaning, and manual Xcode Hermes checks. Replaced this with explicit Podfile configuration and less destructive rebuild guidance.
- The performance example imported Node's `perf_hooks`, which is not a React Native runtime API. Changed it to use `global.performance.now()`.
- The frame-rate example imported `InteractionManager` but did not use it. Removed the unused import.
- The bytecode size command listed `bundle.hbc` without producing it. Added a `hermesc` compilation command before comparing file sizes.
- The Babel examples used the deprecated `metro-react-native-babel-preset` package and unnecessary optional chaining/nullish coalescing proposal plugins. Updated the preset to `@react-native/babel-preset` and removed redundant syntax plugins.
- The Hermes compiler options example used legacy `hermesFlagsDebug` and `hermesFlagsRelease` in `project.ext.react`. Updated it to the modern `react { hermesFlags = [...] }` style.
- The bytecode inspection example used `hermesc -dump-bytecode` against an `.hbc` file. Changed it to use `hbcdump`.
- The debugging section recommended `chrome://inspect`. Updated it to React Native DevTools, since current React Native documentation states Chrome Browser DevTools connection is no longer supported for modern React Native DevTools-era apps.
- The Flipper section described Flipper as the recommended debugger. Changed it to note React Native DevTools as the default and Flipper's bundled React Native integration deprecation/removal, and corrected the Java code fence and `NetworkFlipperPlugin` construction.
- The source-map section implied Metro config directly enables Hermes source maps and replaced the entire Metro config. Changed it to extend `@react-native/metro-config`.
- The profiler conversion command omitted the current React Native CLI path. Added `npx react-native profile-hermes` and kept the standalone transformer as an alternative.
- The memory examples referenced `getHeapSnapshot` and browser-only `performance.memory`. Replaced these with `getRuntimeProperties()` and timing guidance, noting that native profilers should be used for precise memory data.
- The JavaScript feature example had invalid or undefined references such as destructuring inside an object literal, `array`, `promise`, `obj`, and `value`. Rewrote it as syntactically valid example code.
- The Android build configuration included an app-level `buildCache` block that no longer belongs in modern Android Gradle configuration. Removed it.
- The Metro configuration used `metro-config` directly. Updated it to `@react-native/metro-config` and `mergeConfig`, matching current React Native guidance.
- The performance monitoring example imported a non-existent `Performance` export from `react-native`. Removed the import and used `global.performance.now()`.
- The troubleshooting runtime snippet referenced `HermesInternal` without `global`. Updated it to `global.HermesInternal`.

## Review Notes
- The post is technically relevant and contains substantial implementation guidance.
- Several performance numbers remain illustrative rather than guaranteed. The article now tells readers to measure their own release builds where results vary by app, React Native version, device, and platform.
- The legacy Gradle and Flipper examples are retained because the post discusses older projects, but the text now labels them appropriately and points modern projects toward React Native's current defaults.
