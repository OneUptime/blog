# Validation Summary: How to Build a Custom Bottom Sheet Component in React Native

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- React Native
- `@gorhom/bottom-sheet` (v5)
- `react-native-reanimated` (v3)
- `react-native-gesture-handler`
- TypeScript
- Jest / `@testing-library/react-native` / Detox (testing sections)

## Sources Consulted
- @gorhom/bottom-sheet — Dynamic Sizing docs: https://gorhom.dev/react-native-bottom-sheet/dynamic-sizing
- @gorhom/bottom-sheet — Props docs: https://gorhom.dev/react-native-bottom-sheet/props
- @gorhom/bottom-sheet — npm package page: https://www.npmjs.com/package/@gorhom/bottom-sheet
- GitHub issue #1957 — `useBottomSheetDynamicSnapPoints` undefined/removed in v5: https://github.com/gorhom/react-native-bottom-sheet/issues/1957
- React Native Reanimated docs (Extrapolation, useSharedValue, useAnimatedStyle, Gesture API)

## Issues Found
1. **Removed v5 hook `useBottomSheetDynamicSnapPoints`** (Dynamic Content Sizing section). The `DynamicSizingBottomSheet` example imported and called `useBottomSheetDynamicSnapPoints`, destructuring `animatedHandleHeight`, `animatedSnapPoints`, `animatedContentHeight`, and `handleContentLayout`, then wiring them to `snapPoints`/`handleHeight`/`contentHeight`. This hook was the v3/v4 pattern and was removed in v5 (the version the post otherwise targets — it uses `enableDynamicSizing` and `Extrapolation`). The hook no longer exists, so the code would fail to import/run. Rewrote the example to the v5 pattern: `enableDynamicSizing={true}` (default in v5) with content wrapped in `BottomSheetView`, which the library measures automatically. Removed the now-unused `useMemo` import.

2. **Invalid `'CONTENT_HEIGHT'` magic-string snap point** (3 occurrences). The post passed `snapPoints={['CONTENT_HEIGHT']}` directly to `<BottomSheet>` in the "Dynamic Snap Points" example, the `DynamicSizingBottomSheet` example, and the `ConstrainedDynamicSheet` example. `'CONTENT_HEIGHT'` is not a recognized snap-point value in v5 (snap points accept numbers, percentage strings, or a mix). In v5 you rely on `enableDynamicSizing` plus `BottomSheetView` instead. Removed the invalid `snapPoints` props from these examples so they correctly rely on `enableDynamicSizing` (and `maxDynamicContentSize` where shown).

3. **Missing `BottomSheetBackdrop` import** (Modal vs Inline section). The shared code block imported `{ BottomSheetModal, BottomSheetModalProvider }` but the `HybridExample` component referenced `<BottomSheetBackdrop>`, which would be an undefined identifier. Added `BottomSheetBackdrop` to the import.

Also fixed a minor consequence of issue #2: the "Dynamic Snap Points" example referenced `LayoutChangeEvent` without importing it — added it to the `react-native` import and dropped the now-unused `useMemo`.

## Review Notes
- The custom from-scratch implementation follows the well-known William Candillon Reanimated/Gesture-Handler pattern. The `'worklet'`-annotated `scrollTo` is exposed via `useImperativeHandle` and also invoked from gesture worklets; this is the canonical pattern and works as written. Left unchanged.
- `Extrapolation.CLAMP` is the correct Reanimated 3 export (the older `Extrapolate` alias is deprecated). Correct throughout.
- `babel.config.js` uses `module:metro-react-native-babel-preset`. This is valid for older React Native versions; newer RN templates (0.73+) use `@react-native/babel-preset`. Not changed since the post does not pin an RN version and both remain in use. With recent Reanimated, projects may also migrate the plugin to `react-native-worklets/plugin`, but `react-native-reanimated/plugin` remains valid for Reanimated 3.
- Several illustrative snippets reference symbols not imported in their excerpt (e.g., `data`, `Text`/`Button`/`View` in the testing and performance blocks, `useFocusEffect` passed to `focusHook`). These are intentional partial excerpts rather than complete runnable files, consistent with the post's style, so they were left as-is.
- The `@gorhom/bottom-sheet` props used (`enablePanDownToClose`, `enableOverDrag`, `overDragResistanceFactor`, `keyboardBehavior`, `keyboardBlurBehavior`, `android_keyboardInputMode`, `animationConfigs`, `maxDynamicContentSize`, `backdropComponent`, `BottomSheetTextInput`, `BottomSheetFlatList`/`ScrollView`/`SectionList`) are all valid v5 APIs.
