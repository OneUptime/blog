# Validation Summary: How to Quarantine Flaky Tests Without Training the Team to Ignore Red Builds

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Playwright Test
- pytest
- Python
- TypeScript
- TOML
- YAML
- GitHub Actions and required status checks
- CI/CD test quarantine workflows

## Sources Consulted
- [Playwright command line](https://playwright.dev/docs/test-cli)
- [Playwright test retries](https://playwright.dev/docs/test-retries)
- [Playwright test annotations and tags](https://playwright.dev/docs/test-annotations)
- [Playwright auto-retrying assertions](https://playwright.dev/docs/test-assertions)
- [Playwright timeouts](https://playwright.dev/docs/test-timeouts)
- [Playwright trace viewer](https://playwright.dev/docs/trace-viewer-intro)
- [pytest configuration](https://docs.pytest.org/en/stable/reference/customize.html)
- [pytest custom markers](https://docs.pytest.org/en/stable/example/markers.html)
- [pytest API and command-line reference](https://docs.pytest.org/en/stable/reference/reference.html)
- [pytest skip and xfail](https://docs.pytest.org/en/stable/how-to/skipping.html)
- [pytest exit codes](https://docs.pytest.org/en/stable/reference/exit-codes.html)
- [GitHub Actions workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)
- [GitHub Actions job conditions](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-jobs-with-conditions)
- [GitHub status checks](https://docs.github.com/en/pull-requests/reference/status-checks)

## Issues Found
- The lead-in to the reproduction commands said to run repetitions and order changes, but `--repeat-each=20` repeats Playwright tests and pytest's `-x` only exits on the first error or failure; neither shown command changes test order. Changed the lead-in so it describes the demonstrated behavior accurately.
- The quarantine manifest required an issue URL but showed only the tracker key `ENG-4821`. Replaced it with an illustrative full issue URL so the example matches the stated schema and link-validation policy.
- The Playwright configuration enabled retries in CI, but Playwright does not fail a run for a test that passes on retry by default. Added the current `--fail-on-flaky-tests` option for a retry-enabled stable gate so retry-recovered tests cannot silently satisfy the required check.

## Review Notes
- The post does not pin framework versions; it was reviewed against the stable official documentation available on 2026-07-28.
- `[tool.pytest.ini_options]` has been supported in `pyproject.toml` since pytest 6.0 and remains valid. Pytest 9.0 also supports native TOML configuration under `[tool.pytest]`, but migration is not required for the shown configuration.
- The remaining quarantine budgets, ownership checks, dashboards, and alerting behavior are organizational policy recommendations and require project-specific CI implementation.
