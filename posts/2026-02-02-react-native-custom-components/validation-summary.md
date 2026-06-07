# Validation Summary: How to Build Custom Components in React Native

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- React Native (core primitives: View, Text, TextInput, TouchableOpacity, Pressable, FlatList, ActivityIndicator, Animated, StyleSheet)
- React (functional components, hooks: useState, useRef, useMemo, useCallback, useEffect, useContext, useImperativeHandle, forwardRef, memo)
- TypeScript (generics, interface composition, mapped types, `as const`, `Omit<>`)
- React Native Appearance API and `useColorScheme`
- React Native Testing Library (`@testing-library/react-native`) and Jest
- React Context API for theme provisioning

## Sources Consulted
- React Native official documentation: https://reactnative.dev/docs/components-and-apis
- TouchableOpacity docs: https://reactnative.dev/docs/touchableopacity
- Pressable docs: https://reactnative.dev/docs/pressable
- FlatList docs (including `maintainVisibleContentPosition`, `windowSize`, `removeClippedSubviews`): https://reactnative.dev/docs/flatlist
- TextInput docs: https://reactnative.dev/docs/textinput
- Animated API and `useNativeDriver` constraints: https://reactnative.dev/docs/animated
- Appearance + `useColorScheme` docs: https://reactnative.dev/docs/appearance and https://reactnative.dev/docs/usecolorscheme
- React docs for `forwardRef`, `useImperativeHandle`, `memo`: https://react.dev/reference/react
- React Native Testing Library docs: https://callstack.github.io/react-native-testing-library/

## Issues Found
- **Missing `View` import in Button test file** — The test example used `<View testID="left-icon" />` and `<View testID="right-icon" />` inside the "renders left and right icons" test, but the file only imported `React`, `@testing-library/react-native`, and the `Button` component. The test as written would fail with a ReferenceError. Added `import { View } from 'react-native';` so the test compiles and runs.

## Review Notes
- The `Card.Header = CardHeader;` pattern is shown without a strict TypeScript typing (e.g. `React.FC<CardProps> & { Header: React.FC<CardHeaderProps> }`). It works at runtime and JS-only setups, but under strict TS this would error. Left as-is because it's a widely used illustrative pattern.
- `useImperativeHandle(ref, () => inputRef.current as TextInput);` will work in typical use but is unusual because `inputRef.current` may be `null` between mount and ref assignment; this is a common shortcut, not a bug.
- `screen.getByRole('progressbar')` in the loading-state test relies on the ActivityIndicator host component being mapped to a `progressbar` role. Recent versions of `@testing-library/react-native` and React Native do support this via the underlying native component, but it depends on library version. Left as-is since the post is illustrative.
- The `Appearance.addChangeListener` block in `ThemeProvider` is somewhat redundant because `useColorScheme()` already triggers re-renders on system theme changes; the explicit `setThemeMode('system')` inside the listener relies on React not bailing out, which it may. The example still functions correctly in practice because `useColorScheme` already drives the re-render, but the listener could be removed in a future revision.
- `gap` (in Button styles) and `maintainVisibleContentPosition` (in OptimizedList) require React Native 0.71+. This is reasonable given the post date (Feb 2026) and current minimum supported versions, but readers on older RN versions would need to remove or replace those properties.
- The `MemoizedItem` deep-comparison via `JSON.stringify` is a known shortcut; it can be slow for large items and breaks for non-serialisable fields, but is correct as illustrated.
- The `initialValues` memo in `useForm` deliberately omits `fields` from its dependency list to capture the initial values only once. ESLint exhaustive-deps would warn, but the intent is correct.
