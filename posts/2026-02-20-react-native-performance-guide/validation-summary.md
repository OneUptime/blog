# Validation Summary: How to Optimize React Native App Performance

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- React Native
- FlatList and VirtualizedList
- React Native Image
- React Hooks
- React.memo
- React Native Animated API
- TypeScript

## Sources Consulted
- React Native FlatList documentation: https://reactnative.dev/docs/flatlist
- React Native Optimizing FlatList Configuration documentation: https://reactnative.dev/docs/0.74/optimizing-flatlist-configuration
- React Native Image documentation: https://reactnative.dev/docs/0.83/image
- React Native Animated documentation: https://reactnative.dev/docs/0.82/animated
- React Native Threading Model documentation: https://reactnative.dev/architecture/threading-model
- React Native New Architecture overview: https://reactnative.dev/blog/2024/10/23/the-new-architecture-is-here
- React useMemo documentation: https://react.dev/reference/react/useMemo
- React useCallback documentation: https://react.dev/reference/react/useCallback
- React memo documentation: https://react.dev/reference/react/memo

## Issues Found
- The FlatList example imported `useMemo` but did not use it. Removed the unused import so the snippet is cleaner and avoids TypeScript or lint failures in projects with unused-local checks enabled.
- The FlatList `windowSize` comment said it rendered 5 items beyond the visible area. React Native defines `windowSize` in viewport units, so the comment now says it keeps a 5-viewport render window.
- The `removeClippedSubviews` explanation said items were removed from the component tree. Official documentation says off-screen child views are detached from the native view hierarchy, not deallocated or removed from React state, so the comment and flowchart were corrected.
- The image example used `<Text>` without importing `Text` from `react-native`. Added the missing import.
- The image source comment implied `width` and `height` request exact-size downloads. React Native's `Image` source size describes the intended display size; it does not by itself resize the remote asset. Updated the comment.
- The `progressiveRenderingEnabled` comment said it lowered quality for thumbnails. The official API enables progressive JPEG rendering on Android, so the comment was corrected.
- The dashboard example referenced a `Transaction` type without defining it. Added a small TypeScript interface so the snippet is self-contained.
- The architecture section mixed the old bridge and JSI in a way that implied all React Native interop uses serialized bridge messages. Updated the diagram label and explanation to distinguish old bridge costs from New Architecture JSI behavior.
- The animation section said the fade-in animation runs entirely on the native thread and guarantees 60fps. React Native's native driver sends the animation to native before it starts so JavaScript does not update every frame, but actual frame rate still depends on device and workload. Updated the wording.

## Review Notes
- The FlatList values shown are plausible examples, but optimal values depend on item complexity, screen size, and target devices.
- React's current documentation notes that React Compiler can reduce the need for manual `memo`, `useMemo`, and `useCallback` in compiled projects. The post's guidance remains valid for projects that are not relying on the compiler or that still need explicit memoization.
