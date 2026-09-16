# Validation Summary: How to Upload Custom Test Framework Results to Buildkite Test Engine

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- Buildkite Test Engine
- Buildkite JSON test result format
- Buildkite Upload API
- Bash
- curl
- CI/CD test result ingestion

## Sources Consulted

- [Buildkite: Importing JSON](https://buildkite.com/docs/pipelines/configure/tests/test-collection/importing-json)
- [Buildkite: CI environments](https://buildkite.com/docs/pipelines/configure/tests/test-collection/ci-environments)
- [Buildkite: Test collection overview](https://buildkite.com/docs/pipelines/configure/tests/test-collection)
- [Buildkite: Test suites overview](https://buildkite.com/docs/pipelines/configure/tests/test-suites)
- [curl: form options](https://curl.se/docs/manpage.html#-F)

## Issues Found

- The CI environment guide link used an outdated path. Updated it to the current official documentation URL under `test-collection/ci-environments`.

## Review Notes

The JSON fields, supported result values, native JSON format distinction, upload endpoint, authorization syntax, multipart form fields, Buildkite run metadata mappings, and 5,000-results-per-file limit agree with the current official Buildkite documentation. The Bash wrapper is syntactically valid and correctly preserves a failing test runner's exit status while still surfacing an upload failure when the test runner succeeds.
