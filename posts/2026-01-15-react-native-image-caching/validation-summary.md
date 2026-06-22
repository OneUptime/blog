# Validation Summary: How to Cache Images and Assets for Offline Use in React Native

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- React Native
- React Native Image component
- react-native-fast-image
- @react-native-async-storage/async-storage
- @react-native-community/netinfo
- react-native-fs
- react-native-linear-gradient
- react-native-performance
- TypeScript

## Sources Consulted
- React Native Image documentation: https://reactnative.dev/docs/image
- React Native Images guide and cache control documentation: https://reactnative.dev/docs/images
- react-native-fast-image README and source types: https://github.com/DylanVann/react-native-fast-image
- Fresco image pipeline documentation: https://frescolib.org/docs/intro-image-pipeline.html
- react-native-fs README/API documentation: https://github.com/itinance/react-native-fs
- @react-native-community/netinfo README/API documentation: https://github.com/react-native-netinfo/react-native-netinfo
- @react-native-async-storage/async-storage documentation: https://react-native-async-storage.github.io/async-storage/
- react-native-linear-gradient README: https://github.com/react-native-linear-gradient/react-native-linear-gradient
- react-native-performance README: https://github.com/oblador/react-native-performance

## Issues Found
- Corrected the opening "without caching" example, which incorrectly implied React Native always performs a network request on every render. React Native uses platform HTTP/native image caches, but the simple component does not control cache policy or offline behavior.
- Updated the built-in `Image` cache section to remove outdated iOS-only wording. Current React Native documentation describes the `cache` source property as cache control for network image sources.
- Corrected the built-in `Image` limitations. Android does use native image caching through Fresco, React Native has `onProgress`, and React Native exposes iOS native cache limit configuration, so the original limitations were too broad.
- Changed the `react-native-fast-image` description from "de facto standard" to "popular library" to avoid an unsupported ecosystem-status claim.
- Fixed TypeScript issues in snippets, including unused imports, missing React hook imports, missing `FastImage` and `AsyncStorage` imports, and an unused `dimensions` state value.
- Fixed the cache-first example so it resets cache control when an image no longer needs refetching.
- Fixed the network-first example so error state resets when the URI changes.
- Fixed the stale-while-revalidate example to preserve existing query parameters and clarified that `FastImage.preload()` does not provide a completion promise.
- Fixed the cache-size example by importing `FastImage`, treating FastImage cache directories as implementation details, converting `react-native-fs` file sizes to numbers, and handling nested cache directories.
- Fixed URL-based invalidation so async persistence is awaited.
- Fixed the offline image example so it attempts `cacheOnly` loading while offline before showing the local fallback.
- Fixed the progressive image example by using React Native `Image` for `blurRadius`; `react-native-fast-image` does not expose `blurRadius` in its TypeScript props.
- Fixed the shimmer example by removing an unused `Dimensions` import.
- Fixed the hybrid local/remote image example so `icons` is not accepted as an image source key and removed an incorrect cast to `Source`.
- Fixed the performance tracking example by removing unsupported cache-hit-rate reporting. FastImage load callbacks do not expose whether an image came from memory, disk, or network.

## Review Notes
The cache directory inspection example still depends on native implementation details of SDWebImage and Glide, so it should be treated as diagnostic code rather than a stable public API. For production cache accounting, prefer library-provided cache APIs when available or maintain app-owned cached files in an app-controlled directory.
