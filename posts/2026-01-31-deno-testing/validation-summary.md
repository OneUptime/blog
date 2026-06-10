# Validation Summary: How to Write Tests with Deno Test Runner

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Deno runtime (Deno.test API)
- TypeScript
- Deno standard library: `@std/assert`, `@std/testing/mock`, `@std/testing/time`, `@std/testing/snapshot`, `@std/testing/bdd`
- BDD-style testing (describe/it)
- Snapshot testing
- Code coverage (deno coverage)

## Sources Consulted
- Deno testing fundamentals: https://docs.deno.com/runtime/fundamentals/testing/
- Deno test CLI reference: https://docs.deno.com/runtime/reference/cli/test/
- Deno snapshot testing tutorial: https://docs.deno.com/examples/snapshot_test_tutorial/
- Deno blog on JSR: https://deno.com/blog/std-on-jsr
- Deno 1.42 release notes: https://deno.com/blog/v1.42
- Deno standard library reference: https://docs.deno.com/runtime/reference/std/

## Issues Found
1. **Incorrect claim that tests run in parallel by default.**
   - Original: "Parallel execution: Tests run in parallel by default for faster feedback"
   - Per the official docs, Deno executes tests sequentially by default. Parallel execution of test modules requires the `--parallel` flag (parallelism defaults to CPU count or `DENO_JOBS`).
   - Changed to: "Parallel execution: Test modules can be executed in parallel with the `--parallel` flag".

2. **Non-existent `--allow-only` flag for the `only` option.**
   - Original: "The `only` option requires the `--allow-only` flag when running tests to prevent accidentally committing focused tests."
   - There is no such flag in Deno's test CLI. The actual safety mechanism is that when any test is flagged with `only`, the overall test run always exits with a non-zero status code (even if all focused tests pass).
   - Changed to a correct description of the actual behavior.

3. **Outdated `https://deno.land/std/...` import URLs.**
   - Deno's standard library has moved to JSR. The unversioned `deno.land/std` HTTPS URLs no longer receive new features and the modern recommendation is to use `jsr:@std/*` specifiers.
   - Replaced all standard library imports with their JSR equivalents:
     - `https://deno.land/std/assert/mod.ts` → `jsr:@std/assert`
     - `https://deno.land/std/testing/mock.ts` → `jsr:@std/testing/mock`
     - `https://deno.land/std/testing/time.ts` → `jsr:@std/testing/time`
     - `https://deno.land/std/testing/snapshot.ts` → `jsr:@std/testing/snapshot`
     - `https://deno.land/std/testing/bdd.ts` → `jsr:@std/testing/bdd`

## Review Notes
- All `Deno.test()` API usage (string + function form and object form with `name`/`fn`/`ignore`/`only`/`permissions`) is correct.
- The assertion functions (`assertEquals`, `assertNotEquals`, `assertStrictEquals`, `assertThrows`, `assertRejects`, `assertExists`, `assertInstanceOf`, `assertStringIncludes`, `assertArrayIncludes`, `assertMatch`) are all valid members of `@std/assert`.
- Test step usage (`t.step`) and nested steps are correct.
- `spy`, `stub`, `assertSpyCall`, `assertSpyCalls`, `returnsNext` from `@std/testing/mock` are correct.
- `FakeTime` from `@std/testing/time` is correct.
- `assertSnapshot` and the `-- --update` (or `-- -u`) update command are correct.
- BDD-style hooks (`describe`, `it`, `beforeAll`, `afterAll`, `beforeEach`, `afterEach`) are correct.
- The `--filter` flag supports both string substring matches and `/pattern/flags` regex form, so `--filter "/user/i"` is valid.
- Coverage commands (`deno test --coverage=<dir>`, `deno coverage <dir> --html`, `deno coverage <dir> --lcov`) are correct.
- Permission specification at the test level (`permissions: { read: true }`, `permissions: { net: true }`, `permissions: {}`) is correct.
- Best practices listed are reasonable and not technically incorrect.
- Minor stylistic note (not changed): the post does not pin a specific std/Deno version. Users may wish to pin versions in production code (e.g., `jsr:@std/assert@^1.0.0`) for reproducibility, but using unpinned specifiers is a common pattern in tutorials.
