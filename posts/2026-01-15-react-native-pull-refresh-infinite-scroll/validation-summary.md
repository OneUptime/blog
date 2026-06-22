# Validation Summary: How to Implement Pull-to-Refresh and Infinite Scroll in React Native

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- React Native (FlatList, RefreshControl, PanResponder, Animated, ActivityIndicator, InteractionManager)
- React (hooks: useState, useCallback, useRef, useEffect, useMemo, React.memo)
- TypeScript
- @shopify/flash-list (FlashList)
- react-native-fast-image (FastImage)
- @testing-library/react-native + Jest (testing section)

## Sources Consulted
- React Native FlatList documentation — https://reactnative.dev/docs/flatlist
- React Native VirtualizedList documentation (inherited props) — https://reactnative.dev/docs/virtualizedlist
- React Native RefreshControl documentation — https://reactnative.dev/docs/refreshcontrol
- React Native PanResponder documentation — https://reactnative.dev/docs/panresponder
- Shopify FlashList documentation — https://shopify.github.io/flash-list/

## Issues Found
1. **Incorrect explanation of `onEndReachedThreshold` units.** In the "onEndReached Configuration" section, the code comments described the prop as a percentage of content:
   - `onEndReachedThreshold={0.5}` was commented "Trigger when user is within last 50% of content"
   - `onEndReachedThreshold={0.2}` was commented "Trigger when user is within last 20% of content"

   This is factually wrong. Per the official VirtualizedList docs, the threshold is measured "in units of visible length of the list" (i.e., screen heights), not as a percentage of total content. A value of `0.5` triggers `onEndReached` when the end of the content is within half the *visible list length* of the end, regardless of how much total content exists.

   **Fix applied:** Updated the intro sentence to clarify the prop is measured in units of the visible length of the list (screen heights), not a percentage of content, and noted the default value is `2`. Corrected the `0.5` and `0.2` comments to describe screen-height units. The `={0}` and `={1}` comments were already accurate and were left/adjusted to match phrasing ("Trigger only when the end of content is reached").

## Review Notes
- **`MemoizedItem` defined inside the component body** (Performance Optimization section): wrapping a component with `React.memo` but declaring it inside the parent's render creates a new component type on every render, which defeats the memoization. This is a common pitfall but not a syntax/API error; consider hoisting the memoized item component outside the parent in a future revision.
- **FlashList `estimatedItemSize`**: correct and required for FlashList v1. In FlashList v2 the prop is no longer required (and is deprecated), though it is still accepted. The example remains valid; worth a version note if the post targets v2.
- **`useRef<NodeJS.Timeout | null>` in `useDebounce`**: works with the standard React Native type setup. On-device `setTimeout` returns a number, but the `NodeJS.Timeout` typing is the conventional cross-platform choice and compiles correctly.
- All RefreshControl props (`colors`, `tintColor`, `title`, `titleColor`), `getItemLayout` signature, `maintainVisibleContentPosition`, `windowSize`, `maxToRenderPerBatch`, `updateCellsBatchingPeriod`, and `removeClippedSubviews` are valid and used correctly.
- Cursor- and offset-based pagination hooks, duplicate-load guards, and the combined example are logically sound and follow current best practices.
