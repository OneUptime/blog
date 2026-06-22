# Validation Summary: How to Add Custom Transitions and Animations to React Navigation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- React Native
- React Navigation (`@react-navigation/stack`, `@react-navigation/native`)
- React Native Reanimated
- React Native Gesture Handler
- `react-navigation-shared-element` / `react-native-shared-element`
- React Native `Animated` and `Easing` APIs

## Sources Consulted
- React Navigation Stack Navigator docs — https://reactnavigation.org/docs/stack-navigator
- React Navigation `TransitionPresets` / animations reference — https://reactnavigation.org/docs/stack-navigator/#animations
- React Navigation `useCardAnimation` hook — https://reactnavigation.org/docs/stack-navigator/#usecardanimation
- `@react-navigation/stack` `TransitionSpec` type (config omits `useNativeDriver`; card transitions run on the native driver internally)
- React Native `Animated` / `Easing` API docs — https://reactnative.dev/docs/animated and https://reactnative.dev/docs/easing
- React Native Reanimated docs — https://docs.swmansion.com/react-native-reanimated/
- React Native Gesture Handler docs — https://docs.swmansion.com/react-native-gesture-handler/

## Issues Found
1. **Invalid `useNativeDriver` field in `transitionSpec` config** (Performance Considerations → Enable Native Driver). The post passed `useNativeDriver: true` inside a `TransitionSpec` timing config. React Navigation's stack `TransitionSpec` config type explicitly omits `useNativeDriver` (the keys of `Animated.AnimationConfig` are omitted), and card transitions already run on the native driver internally. This also contradicted the post's own `TimingConfig` interface (`{ duration, easing }`) defined earlier. Removed the invalid field and rewrote the surrounding comment to explain that the native driver is used automatically and that interpolations should stay limited to `transform`/`opacity`.

2. **Reanimated worklet reading a legacy `Animated` value** (Custom Animation with Reanimated → Custom Animated Screen Component). The example called `useCardAnimation()` and then read `current.progress.value` inside a Reanimated `useAnimatedStyle` worklet with `interpolate`/`Extrapolate`. `useCardAnimation()` returns legacy React Native `Animated` values (`current.progress` is an `Animated.AnimatedInterpolation`), which has no `.value` and cannot be consumed by a Reanimated worklet — the two animation systems are incompatible here. Rewrote the example to use the React Native `Animated` API (`current.progress.interpolate({ ..., extrapolate: 'clamp' })`) that `useCardAnimation` actually provides, preserving the intended scale/rotate/opacity effect.

## Review Notes
- The `Complex Animation with Gesture Integration` example uses `useAnimatedGestureHandler` (Reanimated 2 API) and `PanGestureHandler` (gesture-handler legacy API). Both still function but are deprecated in favor of Reanimated 3's gesture integration and the gesture-handler v2 `Gesture`/`GestureDetector` API. Left as-is since the code still works; a future revision could migrate to the modern Gesture API. The snippet also references `useSharedValue`, `withSpring`, `withTiming`, `runOnJS`, `Animated`, and `Dimensions` without showing their imports — acceptable as a focused snippet.
- `Extrapolate` (used in the original Reanimated example) is aliased to `Extrapolation` in Reanimated 3; this is moot after the rewrite to the `Animated` API.
- All listed `TransitionPresets` (`SlideFromRightIOS`, `ModalSlideFromBottomIOS`, `ModalPresentationIOS`, `FadeFromBottomAndroid`, `RevealFromBottomAndroid`, `ScaleFromCenterAndroid`, `DefaultTransition`, `ModalTransition`) are valid exports.
- `gestureResponseDistance` as a plain number is correct for React Navigation v6 (it was an object in v5).
- The `androidModalOptions` example applies `ModalSlideFromBottomIOS` for an Android modal — functional but oddly named; not a correctness issue.
- `react-navigation-shared-element` is lightly maintained for v6; the API shown is accurate but readers should verify peer-dependency compatibility.
