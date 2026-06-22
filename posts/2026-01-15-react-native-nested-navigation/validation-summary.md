# Validation Summary: How to Implement Nested Navigation in React Native

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- React Native
- React Navigation
- React Navigation stack, bottom tab, and drawer navigators
- TypeScript
- React hooks and navigation events

## Sources Consulted
- React Navigation nested navigators documentation: https://reactnavigation.org/docs/nesting-navigators/
- React Navigation TypeScript documentation: https://reactnavigation.org/docs/typescript/
- React Navigation drawer navigator documentation: https://reactnavigation.org/docs/drawer-navigator/
- React Navigation navigator configuration documentation: https://reactnavigation.org/docs/navigator/
- React Navigation navigation actions documentation: https://reactnavigation.org/docs/navigation-actions/
- React Navigation stack actions documentation: https://reactnavigation.org/docs/stack-actions/
- React Navigation tab actions documentation: https://reactnavigation.org/docs/tab-actions/
- React Navigation navigation object reference: https://reactnavigation.org/docs/navigation-object/

## Issues Found
- The installation command for drawer-related dependencies omitted `react-native-worklets`, which current React Navigation drawer documentation lists alongside `react-native-gesture-handler` and `react-native-reanimated`. Added `react-native-worklets` to the dependency installation command.
- The `CompositeScreenProps` example omitted route names for parent tab and drawer screen props. Updated the example to use `BottomTabScreenProps<TabParamList, 'Home'>` and `DrawerScreenProps<DrawerParamList, 'MainTabs'>`, matching the official TypeScript pattern.
- The global navigation type declaration used the older `ReactNavigation.RootParamList` namespace pattern. Updated it to the current module augmentation pattern for `@react-navigation/native` using `RootNavigator`.
- The explanation of `initial: false` incorrectly described it as target-screen options that avoid resetting navigation state. Updated the text to describe its actual behavior: preserving the nested navigator's configured initial route before the requested nested screen in the back stack.
- The nested tab event listener used `navigation.addListener('tabPress', ...)` directly from a nested screen. React Navigation documents that nested screens do not automatically receive parent navigator events, so the example now uses `navigation.getParent('TabNavigator')?.addListener(...)`.
- The StackActions snippet imported `StackActions` from `@react-navigation/stack`, while current React Navigation action documentation imports it from `@react-navigation/native`. Updated the import.
- The tab reset snippet used `CommonActions.reset` without importing `CommonActions` in that snippet. Updated the import to include both `CommonActions` and `TabActions`.

## Review Notes
The post remains based on React Navigation's dynamic navigator API and `@react-navigation/stack`, both of which are still documented. React Navigation also recommends native stack for many new apps, but the stack package used here is not deprecated in the consulted documentation.
