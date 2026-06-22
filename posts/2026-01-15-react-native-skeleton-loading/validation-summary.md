# Validation Summary: How to Implement Skeleton Loading Screens in React Native

## Status
validated

## Post Type
Tutorial / Guide (hands-on implementation guide with extensive code examples)

## Technologies Covered
- React Native (core components: `View`, `Image`, `Animated`, `FlatList`, `ActivityIndicator`, `RefreshControl`, `StyleSheet`, `Dimensions`, `useWindowDimensions`, `InteractionManager`)
- React (hooks: `useState`, `useEffect`, `useRef`, `useCallback`, `useMemo`, `memo`, `createContext`, `useContext`)
- TypeScript
- React Native `AccessibilityInfo` API (reduce-motion detection, screen reader announcements, focus management)
- `react-native-linear-gradient` (shimmer effect)
- `react-native-skeleton-placeholder` (third-party library)
- `react-native-skeleton-content` (third-party library)

## Sources Consulted
- React Native `Animated` API docs — https://reactnative.dev/docs/animated
- React Native `AccessibilityInfo` docs — https://reactnative.dev/docs/accessibilityinfo
- React Native `accessibilityRole` / Accessibility docs — https://reactnative.dev/docs/accessibility
- React Native `FlatList` docs — https://reactnative.dev/docs/flatlist
- React Native commit refactoring `AccessibilityInfo` listeners (subscription `.remove()` pattern) — https://github.com/facebook/react-native/commit/003d63d6e501411f870ff5dbef819ad2aca20974
- `react-native-skeleton-placeholder` — https://www.npmjs.com/package/react-native-skeleton-placeholder
- `react-native-skeleton-content-nonexpo` (alexZajac) — https://github.com/alexZajac/react-native-skeleton-content-nonexpo
- `react-native-linear-gradient` — https://github.com/react-native-linear-gradient/react-native-linear-gradient

## Issues Found
1. **`ProgressiveImage` recreated its `Animated.Value` on every render (genuine bug).** The original code declared `const imageOpacity = new Animated.Value(0);` directly in the component body. After the fade-in animation completed and `setIsLoading(false)` triggered a re-render, a brand-new `Animated.Value(0)` was created and bound to the `Animated.Image` `opacity`, resetting the just-revealed image back to fully transparent — so the loaded image would never become visible. Fixed by storing the value in a ref (`useRef(new Animated.Value(0)).current`) and adding `useRef` to the React import, matching the pattern used by every other animated component in the post.

## Review Notes
- **`react-native-skeleton-content` install caveat (not an error, but worth noting):** The original `react-native-skeleton-content` package depends on `expo-linear-gradient` and is intended for Expo projects; bare (non-Expo) React Native apps generally need `react-native-skeleton-content-nonexpo` (which depends on `react-native-linear-gradient`) instead. The package and the API shown (`isLoading`, `layout`, `containerStyle`) are valid, but readers on bare RN may need the `-nonexpo` variant plus a linear-gradient dependency. Left as-is since the code is correct for the maintained Expo-based package.
- **"up to 50% faster" / "Studies by Facebook and others" claim:** This is a widely repeated but loosely sourced industry claim about perceived performance of skeleton screens. The post hedges it appropriately ("up to 50%", "even when actual load times are identical"), so it was left intact, but the specific figure and attribution are not backed by a definitive published study.
- **TypeScript `width?: number | string` props:** Several components type dimension props as `number | string` and spread them into style `width`/`height`. On recent React Native versions the style type is `DimensionValue` (`number | 'auto' | \`${number}%\` | null`), so a plain `string` may produce a strict-mode type error. This is a pervasive pattern across RN tutorials and works correctly at runtime; not changed.
- **`renderSkeleton` passed directly as `FlatList` `renderItem`:** `() => React.ReactElement` is assigned where `ListRenderItem<T>` is expected. This is valid (the function simply ignores the `info` argument) and works correctly.
- All `Animated` usage is correct: `useNativeDriver: true` is used for `opacity`/`transform` animations, and correctly switched to `useNativeDriver: false` in `PulseSkeleton` because `backgroundColor` interpolation is not supported by the native driver.
- The `AccessibilityInfo.addEventListener('reduceMotionChanged', ...)` cleanup correctly uses `return () => subscription.remove();` (wrapped in an arrow function), which is the current, non-deprecated pattern.
- `accessibilityRole="progressbar"` is a valid React Native accessibility role.
