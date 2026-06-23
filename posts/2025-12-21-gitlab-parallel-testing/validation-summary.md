# Validation Summary: How to Use Parallel Testing in GitLab CI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitLab CI/CD (`parallel`, `parallel:matrix`, parent-child pipelines, predefined variables)
- Jest (`--shard`)
- pytest / pytest-split (`--splits`, `--group`, `--store-durations`, `--durations-path`)
- RSpec (RspecJunitFormatter)
- Cypress (manual spec splitting)
- nyc / Istanbul (`nyc merge`, `nyc report`)
- PostgreSQL / Redis CI services

## Sources Consulted
- GitLab CI/CD `parallel` keyword reference — https://docs.gitlab.com/ci/yaml/#parallel
- GitLab "Control how jobs run" / parallelize large jobs — https://docs.gitlab.com/ci/jobs/job_control/
- GitLab predefined variables (`CI_NODE_INDEX`, `CI_NODE_TOTAL`) — https://docs.gitlab.com/ci/variables/predefined_variables/
- Jest CLI options — https://jestjs.io/docs/cli
- pytest-split documentation — https://github.com/jerry-git/pytest-split
- nyc (Istanbul) CLI / `nyc merge` usage — https://github.com/istanbuljs/nyc and https://www.npmjs.com/package/nyc

## Issues Found
1. **"Combining Parallel and Matrix" used an invalid construct.** The original example tried to combine a `parallel:matrix` with a hardcoded `--shard=$CI_NODE_INDEX/3` and an overridden `variables: CI_NODE_TOTAL: 3`. GitLab's `parallel` keyword is either an integer **or** a `matrix` — they cannot be nested — and `CI_NODE_TOTAL`/`CI_NODE_INDEX` are set automatically by GitLab and cannot be overridden via `variables`. As written, the matrix produces only 2 jobs with `CI_NODE_INDEX` = 1 and 2, so shard `3/3` would never run and ~1/3 of tests would be silently skipped. Rewrote the example to add `SHARD: ["1", "2", "3"]` as a matrix dimension (2 versions × 3 shards = 6 jobs) using `--shard=$SHARD/3`, which is the correct, documented pattern, and corrected the surrounding explanation.

2. **"Time-Based Test Splitting" used non-existent Jest flags.** The example used `--timing-file` and `--save-timing` with `npm test` (Jest). Neither flag exists in the Jest CLI (verified against Jest CLI docs); Jest's `--shard` does not do timing-based balancing. Replaced the example with pytest-split, which genuinely supports timing-based distribution, using its real flags (`--splits`, `--group`, `--durations-path`) and noting that `.test_durations` is generated with `pytest --store-durations`.

3. **`nyc merge` was given a directory as its output.** The original used `npx nyc merge coverage/ merged-coverage/` and `npx nyc merge coverage/ .nyc_output/`. The `nyc merge` signature is `nyc merge <input-directory> [output-file]` — the second argument must be a file. Fixed both occurrences to write a single combined JSON file (`merged-coverage/coverage.json` and `.nyc_output/out.json`) created the parent directory first, and added `--report-dir=coverage-report` so the `nyc report` HTML output matches the artifact path declared in the jobs.

## Review Notes
- The core claims are accurate: `CI_NODE_INDEX` starts at 1, `CI_NODE_TOTAL` is the total instance count, and both are available for `parallel` integer and `parallel:matrix` jobs; the 2×3 matrix producing 6 jobs is correct; the statement that `parallel` requires a static integer and does not support CI/CD variable expansion (hence the parent-child pipeline workaround) is correct.
- Jest `--shard=$CI_NODE_INDEX/$CI_NODE_TOTAL` and pytest-split `--splits/--group` usage are correct.
- The Cypress section uses manual spec splitting rather than Cypress's built-in `--parallel` (which requires Cypress Cloud); the manual approach shown is valid.
- RSpec's `--format RspecJunitFormatter` requires the `rspec_junit_formatter` gem to be installed/required via the Gemfile; assumed present given `bundle install`.
- Minor stylistic caveat (not changed): the integration_tests job in the complete pipeline shares a single `POSTGRES_DB: test` across parallel instances rather than isolating per-instance as the earlier dedicated section recommends; functional but not ideal for true isolation.
