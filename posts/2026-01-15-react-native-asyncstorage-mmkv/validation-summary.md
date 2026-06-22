# Validation Summary: How to Persist State with AsyncStorage and MMKV in React Native

## Status
validated

## Post Type
Tutorial / Guide (in-depth, code-heavy implementation guide)

## Technologies Covered
- React Native
- AsyncStorage (`@react-native-async-storage/async-storage`)
- MMKV (`react-native-mmkv`)
- TypeScript
- Zustand (with `persist` / `createJSONStorage` middleware)
- Redux Toolkit + redux-persist
- react-native-keychain
- Jest (mocking + unit/integration tests)

## Sources Consulted
- react-native-mmkv official README and source: https://github.com/mrousavy/react-native-mmkv
- react-native-mmkv v2 source (`MMKV.ts`): https://unpkg.com/react-native-mmkv@2.10.2/src/MMKV.ts and https://unpkg.com/react-native-mmkv@2.12.2/src/MMKV.ts
- react-native-mmkv encryption/security docs: https://deepwiki.com/mrousavy/react-native-mmkv/7.1-encryption-and-security
- react-native-mmkv v3.0.0 release notes (added `trim()` / `size`): https://newreleases.io/project/github/mrousavy/react-native-mmkv/release/v3.0.0
- AsyncStorage docs (package name, 6MB Android limit, `mergeItem`, `multiGet`/`multiSet`): https://react-native-async-storage.github.io/async-storage/
- Zustand persist middleware docs: https://docs.pmnd.rs/zustand/integrations/persisting-store-data

## Issues Found
- **Overstated encryption claim (fixed):** The "Key Features of MMKV" list advertised "Built-in AES-256 encryption." react-native-mmkv defaults to **AES-128**; AES-256 is opt-in (via the `encryptionType` option in recent versions). Every encryption example in the post only passes `encryptionKey` and never sets `encryptionType`, so they all produce AES-128. Changed the bullet to "Built-in AES encryption (AES-128 by default, with AES-256 available)" to accurately reflect the library's behavior.

## Review Notes
- **MMKV API is correct.** All instance methods used (`set`, `getString`, `getNumber`, `getBoolean`, `delete`, `contains`, `getAllKeys`, `clearAll`, `recrypt`) and the constructor config (`id`, `encryptionKey`) match the documented `react-native-mmkv` API.
- **`storage.size` and `storage.trim()` require v3+.** These were added in `react-native-mmkv` v3.0.0 and do **not** exist in v2.x. The post's API surface is otherwise consistent across v2/v3, so the size-management examples are valid only on v3 and later. (Note: the in-development v4 renames `size` to `byteSize`.) Worth a version note for readers still on v2, but not incorrect as written for the current stable major.
- **`crypto.getRandomValues` needs a polyfill in React Native.** The `generateSecureKey()` example calls `crypto.getRandomValues(...)`, which is not available in the default RN/Hermes runtime. Production code should install and import `react-native-get-random-values` (or use `react-native-keychain`/native crypto) before this works. The pattern itself is sound; just environment-dependent.
- **MMKV encryption key length.** The underlying MMKV enforces a maximum encryption-key length of 16 bytes. `generateSecureKey()` produces a 64-character hex string, which exceeds that limit; in practice a shorter key (or raw 16-byte value) should be used. Conceptually the Keychain-backed key-management approach is good practice.
- **AsyncStorage facts verified:** package name (`@react-native-async-storage/async-storage`), unencrypted plain-text storage, default 6MB Android limit, string-only serialization, and the `mergeItem`/`multiGet`/`multiSet`/`getAllKeys` APIs are all accurate.
- **Benchmark numbers are illustrative.** The "~30x faster" headline matches the library's own marketing; the exact per-operation millisecond figures in the table are representative, not authoritative, which is reasonable for a guide.
- **State-management integrations are correct:** the Zustand `createJSONStorage` adapter shape (sync `getItem`/`setItem`/`removeItem`) and the redux-persist adapter (Promise-returning methods, `serializableCheck` ignoring persist actions) both follow the documented patterns.
