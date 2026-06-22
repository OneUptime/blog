# Validation Summary: How to Implement Smooth Animations with React Native Reanimated

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- React Native
- React Native Reanimated 3
- React Native Gesture Handler
- React Native built-in Animated API (for comparison)
- Hermes / Babel / Metro tooling

## Sources Consulted
- Official Reanimated docs — Layout transitions: https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/layout-transitions/
- Official Reanimated docs — interpolate / Extrapolation: https://docs.swmansion.com/react-native-reanimated/docs/utilities/interpolate/
- Official Reanimated docs — Entering/Exiting animations: https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations/
- Reanimated GitHub discussion on exit-animation callbacks (`withCallback`): https://github.com/software-mansion/react-native-reanimated/discussions/3640

## Issues Found
1. **Invalid `onAnimatedEnd` prop on exiting animation (Exiting Animations section).** The post used a non-existent `onAnimatedEnd={() => onDismiss()}` prop on `Animated.View` to fire a callback when an exit animation completed. Reanimated has no such prop. Fixed it to use the documented `.withCallback((finished) => { ... })` modifier on the exiting animation builder, guarded with `if (finished)` and calling the JS handler through `runOnJS(onDismiss)()` (the callback runs on the UI thread). Added `runOnJS` to that snippet's import list.

2. **Deprecated `Layout` layout-transition keyword.** The post imported and used `Layout` (`Layout.springify().damping(15)`, `Layout.springify()`). In current Reanimated 3, `Layout` has been renamed to `LinearTransition` and `Layout` is deprecated. Replaced all API usages with `LinearTransition` (import and call sites in both the "Layout Transitions" and "Use Layout Animation Sparingly" sections). Prose headings/mentions of "Layout Animations" were left unchanged as they are descriptive, not code.

3. **Deprecated `Extrapolate` enum.** The post imported and referenced `Extrapolate` (`Extrapolate.CLAMP`, `Extrapolate.EXTEND`). The current enum is `Extrapolation` (`Extrapolate` is the deprecated alias). Replaced all imports and references with `Extrapolation` in the "Extrapolation Options" and "Scroll-Based Interpolation" sections. The values CLAMP / EXTEND / IDENTITY remain unchanged and correct.

## Review Notes
- The Babel config example uses `presets: ['module:metro-react-native-babel-preset']` and `plugins: ['react-native-reanimated/plugin']`. For Reanimated 3 (the post's stated target) this is correct. Note for future updates: newer React Native templates use `@react-native/babel-preset` (or `babel-preset-expo` for Expo), and Reanimated 4 moved the Babel plugin to `react-native-worklets/plugin`. Not changed since the post explicitly targets Reanimated 3.
- The Gesture Handler examples correctly use the modern `Gesture.Pan()/Pinch()/Rotation()` builder API with `GestureDetector`, and the manual `context` shared-value pattern for capturing start offsets is the recommended approach with the new gesture API. Verified correct.
- Animation functions (`withTiming`, `withSpring`, `withDecay` with `velocity`/`deceleration`/`clamp`, `withSequence`, `withDelay`, `withRepeat`), `useSharedValue`, `useAnimatedStyle`, `useDerivedValue`, `useAnimatedScrollHandler`, `interpolateColor`, `Keyframe`, worklets, `runOnUI`/`runOnJS`, and the custom layout-transition function are all accurate against the current API.
- The "60fps" claim in the conclusion is reasonable; many modern devices support 120fps (ProMotion), but this is not an error.
