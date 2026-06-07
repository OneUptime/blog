# Validation Summary: How to Use React Native with TypeScript

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- React Native (CLI, project scaffolding)
- TypeScript (tsconfig, strict mode, generics, discriminated unions, type guards)
- React (functional components, hooks: useState, useRef, useReducer, useCallback, useMemo, useContext)
- React Navigation (`@react-navigation/native`, `@react-navigation/native-stack`, `@react-navigation/bottom-tabs`)
- Zustand state management (with `persist` middleware and `createJSONStorage`)
- AsyncStorage (`@react-native-async-storage/async-storage`)
- React Native NativeModules / NativeEventEmitter (custom native module typings)
- VS Code TypeScript settings

## Sources Consulted
- React Native official TypeScript docs — https://reactnative.dev/docs/typescript
- React Native 0.71 TypeScript-first announcement — https://reactnative.dev/blog/2023/01/03/typescript-first
- React Native Community CLI — https://github.com/react-native-community/cli
- React Navigation typing docs — https://reactnavigation.org/docs/typescript/
- `@types/react` v18 changelog (removal of implicit `children` in `React.FC`) — https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/react/v17/README.md and https://github.com/facebook/react/blob/main/packages/react/index.d.ts
- Zustand TypeScript guide — https://docs.pmnd.rs/zustand/guides/typescript
- TypeScript handbook (tsconfig reference) — https://www.typescriptlang.org/tsconfig

## Issues Found

1. **Outdated project-creation command.** The post used `npx react-native init MyApp --template react-native-template-typescript`. Both pieces are stale:
   - The legacy `react-native init` command was deprecated and removed; the official path is now `npx @react-native-community/cli@latest init MyApp`.
   - Since React Native 0.71 (Jan 2023), TypeScript is the default — the `react-native-template-typescript` template is archived and no longer needed.
   Fixed by replacing the command with the current Community-CLI invocation and adjusting the surrounding prose.

2. **`@types/react-native` is deprecated.** The "Adding TypeScript to an Existing Project" section recommended installing `@types/react-native`. As of RN 0.71, React Native ships its own bundled TypeScript types and `@types/react-native` is deprecated. Removed it from the install command and added a brief note.

3. **`React.FC` implicit `children` claim is outdated.** The Functional Components section claimed `React.FC` "provides implicit children typing." That was true under `@types/react` 17 but was removed in `@types/react` 18. Updated the prose to clarify that implicit `children` is no longer included and to direct readers to `PropsWithChildren` (which the post itself already uses in the next subsection).

4. **Missing import in `services/biometric.ts` example.** The example referenced `BiometricEventPayload` but never imported it (the type is defined in the preceding `types/native-modules.d.ts` snippet). Added the appropriate `import { BiometricEventPayload } from '../types/native-modules';` so the snippet compiles as written.

## Review Notes
- The path alias `"@types/*": ["src/types/*"]` in the tsconfig example overlaps with the conventional `@types/*` namespace used for ambient declaration packages (e.g. `@types/react`). It will still work because path mapping only affects module resolution after node_modules, but readers may want to rename it (e.g. `@app-types/*`) to avoid confusion. Left as-is to preserve author intent.
- The `default` case in the `cartReducer` is unreachable thanks to the exhaustive discriminated union, but it's a reasonable defensive pattern; left unchanged.
- The Zustand `create<AppState>()(...)` curried form is correct and is the recommended pattern in Zustand v4+ for proper inference with middlewares.
- React Navigation 6 / 7 typing examples (`NativeStackScreenProps`, `BottomTabScreenProps`, `CompositeScreenProps`) match current official docs.
- The example `tsconfig.json` uses `"lib": ["es2017"]`, which mirrors older RN templates. Current RN templates extend `@react-native/typescript-config` and target a newer lib; the example will still compile but is conservative. Not changed because it is functional and consistent with the rest of the post.
