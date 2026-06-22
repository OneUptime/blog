# Validation Summary: How to Type Native Modules and Native Components in React Native

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- React Native
- React Native New Architecture
- TurboModules
- React Native Codegen
- Native UI Components / ViewManagers
- NativeEventEmitter
- TypeScript
- Zod
- CocoaPods and Gradle

## Sources Consulted
- React Native Native Modules guide: https://reactnative.dev/docs/turbo-native-modules-introduction
- React Native Using Codegen guide: https://reactnative.dev/docs/the-new-architecture/using-codegen
- React Native Codegen Appendix: https://reactnative.dev/docs/appendix
- React Native legacy native component commands guide: https://reactnative.dev/docs/0.83/legacy/native-components-ios
- React Native native module custom events guide: https://reactnative.dev/docs/next/the-new-architecture/native-modules-custom-events
- React Native Image type definitions: https://reactnative.dev/docs/image
- TypeScript declaration file module template: https://www.typescriptlang.org/docs/handbook/declaration-files/templates/module-d-ts.html
- TypeScript conditional types documentation: https://www.typescriptlang.org/docs/handbook/2/conditional-types.html
- TypeScript typeof type operator documentation: https://www.typescriptlang.org/docs/handbook/2/typeof-types.html
- Zod schema API documentation: https://zod.dev/api

## Issues Found
- TurboModule spec used an optional method and registered `DeviceInfo` while the spec filename was `NativeDeviceInfo.ts`. Updated the method to return `string | null` and registered `NativeDeviceInfo`, matching React Native Codegen's current naming guidance and nullable type support.
- iOS Codegen command used plain `pod install`. Updated it to `bundle exec pod install`, matching current React Native documentation.
- A `.d.ts` example exported a constant with a runtime initializer, which is invalid declaration-file syntax. Changed it to a declaration-only `export const CameraModule: CameraModuleInterface;`.
- Several copyable snippets were missing needed imports or exports: added `React` for `React.FC`, exported `BluetoothEventMap`, imported `DependencyList`, and imported `NativeModules` in the haptics example.
- Native video source typing used `{ require: number }`; changed it to `{ uri: string } | number`, consistent with React Native's static asset type shape where `require()` returns an opaque number.
- Platform conditional type used `Platform['OS']`, which is not valid for the claimed narrowing. Replaced it with a generic conditional type for explicit platform parameters and a union type for runtime platform checks.
- Zod runtime validation used `z.record(z.unknown())`, which is not the current Zod 4 record signature. Updated it to `z.record(z.string(), z.unknown())`. Also changed photo URI validation from `z.string().url()` to `z.string().min(1)` because native photo URIs may use schemes such as `content:` or `ph:` that URL validators may reject.
- Branded type example referenced factory functions and values that were not defined. Added `createServiceUUID`, `createCharacteristicUUID`, and `characteristicUuid`.

## Review Notes
The post is broadly accurate as a practical typing guide. Some snippets remain illustrative and depend on project-specific native implementations, but the concrete React Native, TypeScript, and Zod issues found during review were corrected.
