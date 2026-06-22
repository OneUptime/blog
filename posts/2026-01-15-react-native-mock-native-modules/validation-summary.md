# Validation Summary: How to Mock Native Modules in React Native Tests

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- React Native
- Jest
- TypeScript
- React Navigation
- React Native Firebase
- React Native Device Info
- React Native Image Picker
- React Native Vision Camera
- AsyncStorage
- React Native MMKV
- React Native Biometrics

## Sources Consulted
- Jest React Native testing guide: https://jestjs.io/docs/tutorial-react-native
- Jest manual mocks documentation: https://jestjs.io/docs/manual-mocks
- Jest mock function API: https://jestjs.io/docs/mock-function-api
- React Native Platform API: https://reactnative.dev/docs/platform
- React Native Dimensions API: https://reactnative.dev/docs/dimensions
- React Native Linking API: https://reactnative.dev/docs/linking
- React Native PermissionsAndroid API: https://reactnative.dev/docs/permissionsandroid
- React Navigation testing guide: https://reactnavigation.org/docs/testing/
- React Native Firebase Core/App usage: https://rnfirebase.io/app/usage
- React Native Firebase Auth usage: https://rnfirebase.io/auth/usage
- React Native Firebase Firestore usage: https://rnfirebase.io/firestore/usage
- AsyncStorage API and Jest integration: https://react-native-async-storage.github.io/2.0/API/ and https://react-native-async-storage.github.io/2.0/advanced/Jest-integration/
- React Native MMKV README: https://github.com/mrousavy/react-native-mmkv
- React Native Biometrics README: https://github.com/SelfLender/react-native-biometrics
- React Native Image Picker README: https://github.com/react-native-image-picker/react-native-image-picker
- React Native Vision Camera docs: https://visioncamera.margelo.com/docs

## Issues Found
- The Jest setup example used `setupFilesAfterEnv` for global native-module mocks. Updated it to `setupFiles`, which matches React Native/Jest setup guidance for mocks that must be installed before test modules load.
- The `console.warn` spy called `console.warn` inside its own mock implementation, causing recursion for non-filtered warnings. Saved the original function and called that instead.
- The Platform mock included the removed `isTVOS` property and did not model current `Platform.select` fallback behavior. Updated it to use `native` fallback and current properties such as `isVision` and `isTesting`.
- The Dimensions and Linking mocks included `removeEventListener`, which is no longer part of the current documented API. Updated `addEventListener` to return a subscription with `remove()`.
- The `react-native-biometrics` examples treated the package as if methods were exported directly from the default import. Updated the examples and type declaration to instantiate `ReactNativeBiometrics`, matching the package API.
- The React Navigation section stated that it "requires comprehensive mocking." Adjusted the claim to reflect the official recommendation to prefer a real navigator when testing navigation behavior, while still allowing mocks for isolated component tests.
- The MMKV mock used older instance method names and buffer types. Updated it toward the current V4 API shape with `createMMKV`, `remove`, `encrypt`, `decrypt`, and `ArrayBuffer`.
- The TypeScript mock helper imported `Mock` from `jest`, which is not the current Jest type package export pattern. Updated it to import from `jest-mock`.
- The `npm outdated` helper ignored the `stdout` payload when `npm outdated` exited with code 1 for available updates. Updated the catch block to parse `error.stdout` and emit the intended warning.

## Review Notes
- The examples remain illustrative mocks; real projects should keep them aligned with the exact dependency versions in use.
- AsyncStorage ships an official Jest mock, which is often preferable to maintaining a hand-written mock unless custom behavior is needed.
- React Native Firebase's namespaced API remains documented but is being migrated toward modular APIs in newer versions; teams should follow the RNFirebase migration guides when upgrading.
