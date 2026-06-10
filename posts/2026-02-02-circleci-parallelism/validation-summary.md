# Validation Summary: How to Use Parallelism in CircleCI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- CircleCI (v2.1 configuration syntax)
- `circleci tests glob` / `circleci tests split` CLI commands
- CircleCI environment variables (`CIRCLE_NODE_INDEX`, `CIRCLE_NODE_TOTAL`)
- CircleCI orbs (e.g., `circleci/node@5.2`)
- CircleCI resource classes (small, medium, large)
- Jest (JavaScript testing) and `jest-junit` reporter
- pytest (Python testing) with JUnit XML output and coverage
- RSpec (Ruby testing) with `rspec_junit_formatter`
- Go testing with `gotestsum` for JUnit output
- Playwright (E2E testing)
- Docker images: `cimg/node`, `cimg/python`, `cimg/ruby`, `cimg/go`, `cimg/postgres`, `cimg/base`
- PostgreSQL service container usage

## Sources Consulted
- CircleCI Configuration Reference: https://circleci.com/docs/configuration-reference/
- CircleCI Parallelism docs: https://circleci.com/docs/parallelism-faster-jobs/
- CircleCI Test Splitting docs: https://circleci.com/docs/use-the-circleci-cli-to-split-tests/
- CircleCI Built-in environment variables: https://circleci.com/docs/variables/
- CircleCI Orbs Registry (node orb v5.2): https://circleci.com/developer/orbs/orb/circleci/node
- CircleCI Resource Classes: https://circleci.com/docs/resource-class-overview/
- CircleCI Docker convenience images (cimg): https://circleci.com/developer/images
- Jest CLI options: https://jestjs.io/docs/cli
- pytest CLI: https://docs.pytest.org/en/stable/how-to/usage.html
- gotestsum: https://github.com/gotestyourself/gotestsum
- rspec_junit_formatter: https://github.com/sj26/rspec_junit_formatter

## Issues Found
- **Invalid YAML structure for `when: always` on `store_test_results`** (line 662 in original): The `when: always` line was indented at the same column as `store_test_results:` rather than as a sub-key of it. As written, the YAML parsed as two top-level keys in the same list item (`store_test_results` and `when`), which is not valid CircleCI step syntax. Fixed by indenting `when: always` to the same level as `path:` so it becomes a proper sub-key of the `store_test_results` step.

## Review Notes
- The post predominantly uses the legacy `circleci tests glob` + `circleci tests split` syntax. CircleCI has been promoting a newer `circleci tests run` command (introduced in 2024) which combines globbing, splitting, retries, and timing data in a single invocation. The legacy commands still work and are not formally deprecated, so the post is correct as-is, but a future revision could mention the newer command.
- The "Resource Contention" section header at line 779 is missing the `###` markdown prefix and renders as a paragraph instead of a sub-heading. This is a markdown formatting/typo issue rather than a CircleCI technical error, so it was left unchanged per the review guidance to avoid stylistic edits.
- The `npm test -- $TESTS --retries=2` example in the "Handling Flaky Tests" section assumes a test runner that supports a `--retries` CLI flag. Jest does not have a built-in `--retries` CLI flag (it uses `jest.retryTimes()` in code). Mocha and some other runners do support `--retries`. The post does not specify which runner `npm test` invokes, so this is left as-is — it works for runners that support the flag and is a reasonable illustration of the concept.
- The RSpec example runs `gem install rspec_junit_formatter` after `bundle install`. When using `bundle exec rspec`, the formatter typically needs to be in the project's Gemfile to be discoverable; the standalone `gem install` may not always be picked up by Bundler. In practice this is a common pattern and usually works (especially with global gems), so it was left as-is.
- All CircleCI Docker image tags referenced (`cimg/node:20.10`, `cimg/python:3.11`, `cimg/ruby:3.2`, `cimg/go:1.21`, `cimg/postgres:15.0`, `cimg/base:current`, `cimg/node:20.10-browsers`) are valid in the CircleCI convenience image registry.
- Environment variable names `CIRCLE_NODE_INDEX` (0-based) and `CIRCLE_NODE_TOTAL` are correct per the CircleCI built-in variables reference.
- The `circleci-agent step halt` command in the caching example is correct for halting an individual step.
- Test-splitting strategies (`filename`, `filesize`, `timings`) are all valid `--split-by` values per CircleCI's CLI.
