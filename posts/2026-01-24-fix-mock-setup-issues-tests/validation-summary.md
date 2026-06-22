# Validation Summary: How to Fix 'Mock' Setup Issues in Tests

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- JavaScript
- Jest
- Jest mock functions
- Jest module mocking
- Jest configuration
- ECMAScript modules

## Sources Consulted
- Jest docs: The Jest Object - https://jestjs.io/docs/jest-object
- Jest docs: Mock Functions API - https://jestjs.io/docs/mock-function-api
- Jest docs: Configuring Jest - https://jestjs.io/docs/configuration
- Jest docs: Setup and Teardown - https://jestjs.io/docs/setup-teardown
- Jest docs: ECMAScript Modules - https://jestjs.io/docs/ecmascript-modules
- Jest docs: Manual Mocks - https://jestjs.io/docs/manual-mocks

## Issues Found
- The import-order example said a `jest.mock` call after static imports was inherently too late, while Jest hoists `jest.mock` in Babel-transformed CommonJS-style tests. Changed the broken example to use non-hoisted `jest.doMock`, and clarified the difference between hoisted transformed tests and native ESM.
- The named-export ES module wording was too broad for native ESM. Updated it to refer to transformed ES module syntax, because native ESM mocking requires different loading behavior.
- The scope example said a mock might be cleared by a previous test file. Jest test files do not normally share mock state that way, so this was changed to automatic mock cleanup.
- The default-export broken example used `jest.mock('./api', () => jest.fn())`, which can work with common Babel default-import interop. Changed the example to a factory object missing `__esModule`, which matches the documented reason for needing the `default` property with `__esModule: true`.
- The partial-module example said `jest.mock('./utils')` makes all functions undefined. Jest automocking replaces functions with mock functions, so the wording now says real behavior is gone.
- The async setup section claimed a test might run before an async `beforeEach` finishes. Jest waits for a returned promise or async hook to resolve before running the test, so the section now describes the real risk: configuring a mock after async setup that may itself use the mocked dependency.

## Review Notes
The Jest APIs used in the examples are current in the official Jest 30.4 documentation. Native ESM module mocking remains documented as experimental and uses `jest.unstable_mockModule`; the post now avoids presenting transformed CommonJS-style `jest.mock` behavior as universal ESM behavior.
