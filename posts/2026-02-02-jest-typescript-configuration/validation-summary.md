# Validation Summary: How to Configure Jest for TypeScript

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Jest (test runner)
- ts-jest (TypeScript transformer for Jest)
- TypeScript (tsconfig, compilerOptions, path aliases)
- Node.js / npm
- Code coverage tooling (lcov, html reporters)

## Sources Consulted
- ts-jest official documentation: https://kulshekhar.github.io/ts-jest/
- ts-jest Getting Started / Presets: https://kulshekhar.github.io/ts-jest/docs/getting-started/presets
- ts-jest Options: https://kulshekhar.github.io/ts-jest/docs/getting-started/options
- ts-jest `isolatedModules` option (DEPRECATED): https://kulshekhar.github.io/ts-jest/docs/getting-started/options/isolatedModules
- ts-jest CHANGELOG (v29 release notes): https://github.com/kulshekhar/ts-jest/blob/main/CHANGELOG.md
- Jest configuration reference: https://jestjs.io/docs/configuration
- TypeScript compiler options reference: https://www.typescriptlang.org/tsconfig

## Issues Found

1. **Deprecated `globals: { 'ts-jest': {...} }` configuration syntax (3 occurrences).**
   - What was wrong: The post used the legacy `globals['ts-jest']` block to pass options like `tsconfig` and `isolatedModules` to ts-jest. This approach has been deprecated since ts-jest v29 (October 2022) and emits runtime deprecation warnings: *"Define `ts-jest` config under `globals` is deprecated. Please do transformer's options in `transform` option instead."* It is slated for removal in the next major release.
   - What I changed: Replaced all three `globals['ts-jest']` blocks (in "TypeScript Configuration for Tests", "Performance Optimization", and "Complete Configuration Example") with the current `transform` array-tuple syntax: `transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }] }`.
   - Why: The blog presents itself as a "production-ready setup", so following the documented, non-deprecated API is essential to avoid warnings and ensure forward compatibility.

2. **`isolatedModules` configured as a ts-jest option instead of a tsconfig compilerOption.**
   - What was wrong: The post set `isolatedModules: true` inside ts-jest's options. The ts-jest-level `isolatedModules` option is itself now marked DEPRECATED in the official docs; the recommendation is to set `"isolatedModules": true` in `tsconfig.json`'s `compilerOptions` (which is also where TypeScript natively documents it).
   - What I changed: Moved `isolatedModules: true` into the `tsconfig.test.json` example in the Performance Optimization section, and updated the surrounding prose to explain that as of ts-jest v29 this option belongs in tsconfig.
   - Why: This aligns with the canonical TypeScript compiler option location and avoids relying on an option ts-jest plans to remove.

## Review Notes
- The post still uses the legacy string preset (`preset: 'ts-jest'`) rather than the newer utility-function approach (`createDefaultPreset()` from `ts-jest`). The string preset is still supported and works correctly today, but the official docs now prefer the utility-function approach. This was left as-is because it is not technically incorrect and is the form most readers will encounter in existing codebases.
- `npx ts-jest config:init` remains the correct initialization command.
- The JSDoc type reference `/** @type {import('ts-jest').JestConfigWithTsJest} */` is correct and current.
- The `jest.MockedClass<typeof X>` and `jest.Mocked<X>` type helpers used in the mocking section are correct and current (Jest 27+).
- `expect.extend`, `jest.setTimeout`, `mockResolvedValue`, `mockRejectedValue`, `toHaveBeenCalledWith`, and `rejects.toThrow` are all valid and current Jest APIs.
- The `coverageReporters` values (`text`, `lcov`, `html`), `coverageThreshold` shape, `collectCoverageFrom` glob syntax, `moduleNameMapper`, `maxWorkers: '50%'`, `setupFilesAfterEnv`, `clearMocks`, `restoreMocks`, and `transformIgnorePatterns` examples are all syntactically correct per the Jest docs.
- The `tsconfig.json` compiler options used (`target: ES2020`, `module: commonjs`, `strict`, `esModuleInterop`, `skipLibCheck`, `forceConsistentCasingInFileNames`, `declaration`, etc.) are all valid. Note: as of TypeScript 5.0, `forceConsistentCasingInFileNames` defaults to `true`, so specifying it is optional but harmless.
