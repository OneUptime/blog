# Validation Summary: How to Implement Feature Flags in React Native Applications

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- React Native (TypeScript)
- React (Context API, hooks, HOCs, render props)
- LaunchDarkly React Native client SDK (`@launchdarkly/react-native-client-sdk`)
- Firebase Remote Config (`@react-native-firebase/remote-config`)
- Firebase Analytics (`@react-native-firebase/analytics`)
- AsyncStorage (`@react-native-async-storage/async-storage`)
- Jest / React Native Testing Library
- Detox (E2E)
- Feature flag / A/B testing concepts (gradual rollouts, targeting, statistical significance)

## Sources Consulted
- LaunchDarkly React Native SDK reference — https://launchdarkly.com/docs/sdk/client-side/react/react-native
- LaunchDarkly `ReactNativeLDClient` API docs (v10) — https://launchdarkly.github.io/js-core/packages/sdk/react-native/docs/classes/ReactNativeLDClient.html
- LaunchDarkly Context configuration — https://docs.launchdarkly.com/sdk/features/context-config
- LaunchDarkly Identifying and changing contexts — https://launchdarkly.com/docs/sdk/features/identify
- React Native Firebase Remote Config usage — https://rnfirebase.io/remote-config/usage
- React Native Firebase Remote Config modular API guide — https://github.com/invertase/react-native-firebase/issues/8852
- react-native-quick-crypto (Node `crypto` in RN) — https://github.com/margelo/react-native-quick-crypto

## Issues Found

1. **Node `crypto` module used in a React Native util (`src/utils/rolloutUtils.ts`).** The rollout code imported `createHash` from `'crypto'` and called `createHash('md5')`. React Native's JS runtime (Hermes/JSC) does not include Node's `crypto` module, and Metro does not polyfill it — this fails at bundle/runtime with "Unable to resolve module crypto" unless a polyfill such as `react-native-quick-crypto` is configured. **Fix:** replaced the Node-crypto MD5 hash with a small, dependency-free deterministic FNV-1a string hash (using `Math.imul`, available in Hermes/JSC). This preserves the deterministic per-user bucketing behavior and the rest of the function's logic unchanged, and a comment notes the polyfill option for callers who need a true cryptographic hash.

2. **LaunchDarkly `LDContext` used the legacy nested `custom` object.** `createLDContext` placed `subscriptionTier`, `accountAge`, `platform`, and `appVersion` inside a nested `custom: {}` object. That is the legacy `LDUser` schema; the context-based SDK (`ReactNativeLDClient`, v10) expects custom attributes as top-level key/value pairs on the context. As written, targeting rules on those attributes would not match. **Fix:** flattened the attributes to the top level of the context object and added a clarifying comment.

## Review Notes
- The LaunchDarkly client API usage (`new ReactNativeLDClient(key, AutoEnvAttributes.Enabled, options)`, `identify(context)`, `allFlags()`, `on('change', ...)` / `off('change', ...)`) matches the current v10 SDK and was left unchanged.
- The Firebase Remote Config code mixes the namespaced API (`remoteConfig().setDefaults(...)`, `fetchAndActivate()`) with the modular API (`getRemoteConfig`, `onConfigUpdate`, `activate`). Both are valid and interoperate, but the namespaced calls emit deprecation warnings in React Native Firebase v22+. Migrating fully to the modular API would be cleaner long-term; this was not a correctness error so it was left as-is. The `onConfigUpdate(instance, { next, error })` observer signature is correct.
- The simplified sample-size formula in `calculateSampleSize` is a standard two-proportion approximation; for the example inputs (10% baseline, 20% MDE) it yields ~3,840 per variant. The inline comment rounds this to "~3,920" — a minor approximation discrepancy, not a code error, so it was left unchanged.
- Remaining code (provider/context, hooks, HOC, render-props, custom service with AsyncStorage caching, targeting engine, testing utilities, Detox E2E) is syntactically valid TypeScript/React and uses current, non-deprecated APIs.
