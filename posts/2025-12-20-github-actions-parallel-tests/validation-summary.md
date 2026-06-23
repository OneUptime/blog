# Validation Summary: How to Run Tests in Parallel in GitHub Actions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitHub Actions workflow matrices
- GitHub Actions artifacts and caching
- Jest
- Vitest
- Playwright Test
- pytest, pytest-split, and pytest-xdist
- RSpec and parallel_tests
- JUnit test result aggregation

## Sources Consulted
- GitHub Actions matrix documentation: https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/run-job-variations
- GitHub Actions workflow syntax: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub Actions contexts reference: https://docs.github.com/en/actions/reference/workflows-and-actions/contexts
- Playwright sharding documentation: https://playwright.dev/docs/test-sharding
- Playwright reporters documentation: https://playwright.dev/docs/test-reporters
- Jest CLI options: https://jestjs.io/docs/cli
- Vitest CLI documentation: https://vitest.dev/guide/cli
- pytest command-line reference: https://docs.pytest.org/en/stable/reference/reference.html
- pytest-split documentation / PyPI page: https://pypi.org/project/pytest-split/
- pytest-xdist documentation: https://pytest-xdist.readthedocs.io/
- RSpec `--only-failures` documentation: https://rspec.info/features/3-12/rspec-core/command-line/only-failures/
- parallel_tests repository documentation: https://github.com/grosser/parallel_tests
- actions/setup-node documentation: https://github.com/actions/setup-node
- actions/setup-python documentation: https://github.com/actions/setup-python
- actions/upload-artifact documentation: https://github.com/actions/upload-artifact

## Issues Found
- The post said "Most test frameworks support sharding" and listed RSpec as using `--only-failures` with custom splitting. RSpec's `--only-failures` reruns examples that failed in the previous run; it is not a sharding mechanism. Changed the wording to "Many test frameworks support sharding" and replaced the RSpec entry with `parallel_tests` gem or custom splitting.
- The Playwright merge example uploaded `playwright-report/` from each shard and then ran `playwright merge-reports` on those HTML report directories. Playwright's official merge flow requires blob reports as the merge input. Updated the example to upload `blob-report/`, added the CI blob reporter config, download `blob-report-*` artifacts, and merge from `all-blob-reports`.
- The Jest section claimed timing-based splitting, but the example only captured JSON timing/results data and did not use it to split tests by duration. Renamed the section to "Jest with Timing Data" and adjusted the lead sentence to describe collecting data for later rebalancing.
- The Jest path filtering examples used `--testPathPattern`, which is not the current Jest 30 CLI option. Updated both examples to `--testPathPatterns`.

## Review Notes
- The GitHub Actions matrix examples, `fail-fast`, `max-parallel`, and `strategy.job-total` usage match current GitHub Actions documentation.
- The pytest example assumes `pytest-split` is installed through `requirements.txt`; without that plugin, `--splits` and `--group` are not core pytest flags.
- The GitHub Actions examples use v4 of checkout/setup-node/upload-artifact/download-artifact in most places, while some upstream official examples now show newer major versions for checkout and setup-node. The v4 usages are still valid and not inherently incorrect.
