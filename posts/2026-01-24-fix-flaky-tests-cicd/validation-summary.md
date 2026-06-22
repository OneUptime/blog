# Validation Summary: How to Fix 'Flaky Tests' in CI/CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- JavaScript
- Node.js
- Jest
- npm scripts
- GitHub Actions
- CI/CD test automation
- Mermaid diagrams

## Sources Consulted
- Jest CLI Options: https://jestjs.io/docs/cli
- Jest v29 to v30 upgrade guide: https://jestjs.io/docs/upgrading-to-jest30
- Jest object API for fake timers and `jest.setSystemTime`: https://jestjs.io/docs/jest-object#jestsetsystemtimenow-number--date
- npm run-script documentation: https://docs.npmjs.com/cli/v10/commands/npm-run-script/
- GitHub Actions workflow syntax, including `strategy.fail-fast`: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub Actions expressions, including `always()` and `failure()`: https://docs.github.com/en/actions/reference/workflows-and-actions/expressions
- actions/checkout README: https://github.com/actions/checkout
- actions/upload-artifact README: https://github.com/actions/upload-artifact
- nick-fields/retry README: https://github.com/nick-fields/retry

## Issues Found
- The first CI snippet used `npm test -- --json --outputFile=results.json || true`, which captured results but also masked genuine test failures. Changed it to capture the exit code, run flaky detection if results exist, and then exit with the original test status.
- The detection script read `results.testResults` as if each entry were an individual test. Jest's JSON result structure has file-level `testResults` entries containing nested assertion results. Updated the script to collect failed assertions from `testFile.testResults`.
- The detection script used shell interpolation with `execSync` and `--testNamePattern="${testName}"`, which could break or be unsafe for test names containing quotes or regex/shell metacharacters. Replaced it with `execFileSync`, passed arguments as an array, escaped regex metacharacters, and restricted reruns to the original test file with `--runTestsByPath`.
- The GitHub Actions snippets used older action references. Updated `actions/checkout@v4` to `actions/checkout@v7`, `actions/upload-artifact@v4` to `actions/upload-artifact@v7`, and the transferred retry action from `nick-invision/retry@v2` to `nick-fields/retry@v3`.
- The Jest quarantine example used `--testPathPattern`, which was renamed in Jest 30. Updated it to `--testPathPatterns`.
- The comment for `strategy.fail-fast` said "other jobs", but GitHub Actions documents `fail-fast` as applying to matrix jobs. Updated the comment to say "other matrix jobs".

## Review Notes
The code snippets are illustrative and assume a Jest-based project with an `npm test` script. The custom `waitFor`, server lifecycle, and application API examples are technically plausible but depend on project-specific helpers such as `loadData`, `startServer`, and `isActive`.
