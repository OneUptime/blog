# Validation Summary: How to Optimize React Native App Startup Time

## Status
validated

## Post Type
Tutorial / performance optimization guide

## Technologies Covered
- React Native
- Hermes JavaScript engine
- JavaScriptCore (JSC)
- Metro bundler
- React Navigation (native-stack)
- React.lazy / Suspense
- InteractionManager / requestIdleCallback
- RAM bundles & inline requires
- react-native-splash-screen
- react-native-performance / react-native-performance-flipper-reporter
- Flipper
- Firebase Performance Monitoring (@react-native-firebase/perf)
- Sentry React Native
- Android (Java) and iOS (Objective-C) native modules

## Sources Consulted
- React Native: Using Hermes - https://reactnative.dev/docs/hermes
- React Native: PerformanceObserver (experimental global) - https://reactnative.dev/docs/0.82/global-PerformanceObserver
- react-native-performance (oblador) - https://github.com/oblador/react-native-performance
- react-native-performance-flipper-reporter npm package (README/API, v5.0.0) - https://www.npmjs.com/package/react-native-performance-flipper-reporter
- React Native 0.74 release notes (Flipper removal) - https://reactnative.dev/blog/2024/04/22/release-0.74
- Metro configuration & inlineRequires blockList rename (commit) - https://github.com/react/metro/commit/723005b9a2502d3711cffb92ad2ac364140d7050
- RAM Bundles and Inline Requires (RN docs / archive) - https://reactnative.dev/docs/0.71/ram-bundles-inline-requires
- Metro configuration docs - https://metrobundler.dev/docs/configuration/

## Issues Found
- **`PerformanceObserver` imported from `react-native`** (Performance API section): React Native does not export `PerformanceObserver` (or a `performance.measure`-capable object) from the `react-native` package on stable channels. Replaced the import with `import performance, { PerformanceObserver } from 'react-native-performance'`, added an install note, and switched `global.performance.now()` calls to the library's `performance.now()` so the example is internally consistent and actually runnable.
- **Fabricated Flipper reporter API** (Flipper section): `PerformanceProfiler.configure({ destabilized: true })` is not a real API — `react-native-performance-flipper-reporter` exports `setupDefaultFlipperReporter()` and has no `PerformanceProfiler.configure` or `destabilized` option (verified against the published package, v5.0.0). Replaced it with the documented `require('react-native-performance-flipper-reporter').setupDefaultFlipperReporter()` usage and noted that Flipper was removed from new React Native templates in 0.74 (prefer the built-in debugger / consuming `react-native-performance` directly).
- **Outdated/broken Hermes Android configuration** (Hermes section): The `project.ext.react = [enableHermes: true, hermesCommand: ...]` plus `hermes-release.aar` Gradle snippet is obsolete (RN ≤ 0.64 era) and does not work on current React Native. Replaced it with the current `hermesEnabled=true` setting in `android/gradle.properties`, and added a note that Hermes has been the bundled default since React Native 0.70 (so new apps need no setup).
- **RAM bundles recommended without Hermes caveat** (RAM Bundles section): The post recommends enabling Hermes earlier, then recommends RAM bundles, which are mutually incompatible. Added a note clarifying that RAM bundles are JSC-only, are not compatible with Hermes (which memory-maps its bytecode for the same benefit), and are deprecated as of React Native 0.75.

## Review Notes
- The Metro `inlineRequires` `blockList` key used in the post is correct for current Metro (it was renamed from `blacklist` to `blockList` in Metro 0.64 / RN 0.64). No change needed.
- The Hermes performance comparison table presents illustrative ("typical") numbers rather than figures from a specific benchmark; left as-is since it is framed as typical/approximate.
- The `metro.config.js` examples use the older `require('metro-config')` / `getDefaultConfig()` pattern rather than `@react-native/metro-config`. The older form still functions, so it was left unchanged, but new projects should prefer `@react-native/metro-config`.
- The native (Android/iOS) timing and lazy-initialization snippets, `React.lazy`/`Suspense`, `InteractionManager`, `requestIdleCallback`, splash-screen, Firebase, and Sentry examples are all technically accurate and use current APIs.
- The intro's mention of "the JavaScript bridge" is historically accurate; with the New Architecture (JSI/bridgeless) the bridge is being phased out, but this does not affect the correctness of the startup guidance.
