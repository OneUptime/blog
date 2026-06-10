# Validation Summary: How to Write Tests with Bun Test Runner

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Bun runtime
- Bun test runner (`bun:test`)
- TypeScript
- Jest-compatible testing APIs (assertions, matchers, mocks, spies, snapshots, lifecycle hooks)

## Sources Consulted
- Bun test runner CLI documentation: https://bun.sh/docs/cli/test
- Bun mocks documentation: https://bun.sh/docs/test/mocks
- Bun writing tests documentation: https://bun.sh/docs/test/writing-tests
- Jest matchers documentation (for matcher semantics that Bun is compatible with): https://jestjs.io/docs/expect

## Issues Found

1. **Incorrect test file discovery patterns.** The post listed `*.test.ts`/`*.test.js`, `*.spec.ts`/`*.spec.js`, and "any file in a `__tests__` directory". Per Bun's official docs, the actual patterns are `*.test.{js,jsx,ts,tsx}`, `*_test.{js,jsx,ts,tsx}`, `*.spec.{js,jsx,ts,tsx}`, and `*_spec.{js,jsx,ts,tsx}`. Bun does not have special discovery for `__tests__` directories — that is a Jest convention. Updated the list to reflect Bun's actual patterns.

2. **Misleading `mock.module()` ordering example.** The original example placed `mock.module(...)` before a static `import { getUser, saveUser } from "./database"` with the comment "Mock a module before importing it". Due to ES module hoisting, the static import actually runs before `mock.module()`; the example only works because Bun supports overriding already-imported modules via live bindings. Reordered the import to appear before the mock and updated the comment to explain that live bindings make the mock take effect on existing imports, with a pointer to `--preload` when callers need the mock to apply before module evaluation.

## Review Notes

- All other matchers (`toBe`, `toEqual`, `toStrictEqual`, `toBeNull`, `toBeUndefined`, `toBeDefined`, `toBeTruthy`, `toBeFalsy`, `toBeGreaterThan`, `toBeGreaterThanOrEqual`, `toBeLessThan`, `toBeLessThanOrEqual`, `toBeCloseTo`, `toContain`, `toMatch`, `toHaveLength`, `toContainEqual`, `toThrow`, `rejects.toThrow`, `resolves.toHaveProperty`) match the documented Bun/Jest API.
- Mock helpers (`mock`, `mockReturnValue`, `mockReturnValueOnce`, `mockImplementation`, `mockImplementationOnce`, `spyOn`, `mockRestore`) and lifecycle hooks (`beforeAll`, `afterAll`, `beforeEach`, `afterEach`) are all valid Bun APIs.
- CLI flags used in the post are all valid: `bun test`, `--test-name-pattern`, `--update-snapshots`, `--coverage`, `--coverage-reporter=text`. Per-test timeout passed as the third arg to `test(...)` is also documented.
- Minor stylistic note (not corrected): the `toContainEqual("apple")` example with a primitive string in `fruits` works but does not showcase the matcher's deep-equality strength — `toContainEqual` is most useful for arrays of objects. The example is technically correct, so it was left as-is.
- `it` is a documented alias for `test`; both are exported from `bun:test`. The post uses both, which is correct.
