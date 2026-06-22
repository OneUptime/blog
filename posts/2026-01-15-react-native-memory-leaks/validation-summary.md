# Validation Summary: How to Debug Memory Leaks in React Native Applications

## Status
validated

## Post Type
Technical guide/tutorial

## Technologies Covered
- React Native
- React
- TypeScript
- Xcode Instruments
- Android Studio Profiler
- Flipper
- React Native Debugger
- React Native DevTools
- AbortController and fetch
- WeakRef and FinalizationRegistry
- React Navigation
- react-native-fast-image
- why-did-you-render
- React Native Testing Library
- Detox
- Android adb/dumpsys

## Sources Consulted
- React Native Dimensions API: https://reactnative.dev/docs/dimensions
- React Native Profiling guide: https://reactnative.dev/docs/profiling
- React Native Debugging Basics: https://reactnative.dev/docs/debugging
- React Native Other Debugging Methods: https://reactnative.dev/docs/other-debugging-methods
- React Native 0.73 debugging and Flipper deprecation announcement: https://reactnative.dev/blog/2023/12/06/0.73-debugging-improvements-stable-symlinks
- React Native CLI iOS command docs: https://github.com/react-native-community/cli/blob/main/packages/cli-platform-ios/README.md
- React Native CLI Android command docs: https://github.com/react-native-community/cli/blob/main/packages/cli-platform-android/README.md
- React useEffect reference: https://react.dev/reference/react/useEffect
- MDN AbortController reference: https://developer.mozilla.org/en-US/docs/Web/API/AbortController
- MDN WeakRef reference: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakRef
- MDN FinalizationRegistry reference: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/FinalizationRegistry
- Apple Xcode memory documentation: https://developer.apple.com/documentation/xcode/gathering-information-about-memory-use
- Android Studio heap dump documentation: https://developer.android.com/studio/profile/capture-heap-dump
- Android dumpsys documentation: https://developer.android.com/tools/dumpsys
- Flipper repository: https://github.com/facebook/flipper
- Detox device API: https://wix.github.io/Detox/docs/api/device/
- React Navigation useFocusEffect docs: https://reactnavigation.org/docs/use-focus-effect/
- react-native-fast-image repository: https://github.com/dream-horizon-org/react-native-fast-image
- why-did-you-render repository: https://github.com/welldone-software/why-did-you-render
- React Native Testing Library API overview: https://oss.callstack.com/react-native-testing-library/docs/api

## Issues Found
- The iOS release profiling command used `npx react-native run-ios --configuration Release`, but the current React Native Community CLI documents `--mode "Release"`. Updated the command.
- The cleanup-flag example initialized `isMounted` to `true` outside the effect and did not set it to `true` inside the effect setup. Updated it so the flag is initialized/reset inside the effect lifecycle.
- The closure example used `useState` without importing it and described a retained closure imprecisely. Added the missing import and corrected the comments.
- The retain-cycle example allowed `setCallback(null)` while the method accepted only `() => void`, and its closure comment incorrectly mentioned capturing `this` in a function component. Updated the type and comment.
- The Flipper section implied Flipper is current/default for all React Native projects and included an unsupported `HeapCapture` import from `react-native-flipper`. Replaced it with version-specific guidance and current-tooling notes.
- The React Native Debugger section did not mention that it depends on Remote JavaScript Debugging, which is deprecated/removed in current React Native. Added the version caveat and current recommendation.
- The `catch` blocks accessed `err.name` and `err.message` directly even though TypeScript treats caught values as `unknown` in strict mode. Added `err instanceof Error` guards.
- The subscription-manager example passed subscription objects into a function-only cleanup manager. Updated it to store cleanup callbacks that call `remove()` or `unsubscribe()`.
- The WeakRef section did not warn that WeakRef/FinalizationRegistry cleanup is nondeterministic and engine-dependent. Added the caveat.
- The navigation example imported `useEffect` unnecessarily and omitted the `useState` and `View` imports it used. Corrected the imports.
- The Detox example used `device.getUiMetrics()`, which is not part of the documented Detox device API. Replaced it with Android `adb shell dumpsys meminfo` usage and noted iOS should use Xcode/xcrun-based tooling.
- The summary and additional resources still presented Flipper/React Native Debugger as generally current tools. Updated them to reflect current support status and linked to the Flipper GitHub repository.

## Review Notes
Some snippets still use placeholder application functions such as `fetchUserData`, `fetchHeavyData`, and `someExternalAPI`, which is appropriate for illustrative blog examples. Memory thresholds in automated tests remain application-specific and should be calibrated for each app, device, and build type.
