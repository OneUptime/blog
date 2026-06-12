# Validation Summary: How to Implement Playwright Visual Testing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Playwright Test
- Playwright visual comparisons and snapshot assertions
- TypeScript
- GitHub Actions
- Docker and Docker Compose
- CI/CD test configuration

## Sources Consulted
- Playwright visual comparisons documentation: https://playwright.dev/docs/test-snapshots
- Playwright `PageAssertions.toHaveScreenshot()` API reference: https://playwright.dev/docs/api/class-pageassertions
- Playwright `LocatorAssertions.toHaveScreenshot()` API reference: https://playwright.dev/docs/api/class-locatorassertions
- Playwright `TestConfig.snapshotPathTemplate` and `updateSnapshots` API reference: https://playwright.dev/docs/api/class-testconfig
- Playwright command line documentation for `--update-snapshots`: https://playwright.dev/docs/test-cli
- Playwright CI documentation: https://playwright.dev/docs/ci
- Playwright Docker documentation: https://playwright.dev/docs/docker
- Playwright `page.waitForLoadState()` / navigation readiness documentation: https://playwright.dev/docs/api/class-page

## Issues Found
- The post implied that first visual-test runs simply create passing baselines. Updated the wording to clarify that missing baselines are written for review and should be committed before later comparison runs.
- Several examples and the best-practices section recommended `networkidle` as a general stability wait. Playwright documentation discourages relying on `networkidle` for testing readiness, so examples were adjusted to wait for visible DOM state and the best-practice wording now recommends app-specific readiness checks.
- The per-test configuration example included a placeholder comment suggesting a per-assertion option to fail when a baseline is missing. No such `toHaveScreenshot()` option exists; the post now points readers to `updateSnapshots: 'none'` in CI configuration.
- The CI config did not enforce committed baselines. Added `updateSnapshots: isCI ? 'none' : 'missing'` to prevent CI from creating missing snapshots.
- The Docker example used the outdated `mcr.microsoft.com/playwright:v1.40.0-jammy` image. Updated it to the current documented `mcr.microsoft.com/playwright:v1.60.0-noble` image.
- A misleading comment described the `expect.toHaveScreenshot` config block as a screenshot directory. Reworded it to describe comparison defaults; `snapshotPathTemplate` is the setting that controls snapshot locations.

## Review Notes
Most APIs and options used in the post are current and valid, including `toHaveScreenshot()`, `toMatchSnapshot()`, `maxDiffPixels`, `maxDiffPixelRatio`, `threshold`, `animations`, `caret`, `mask`, `maskColor`, `scale`, `snapshotPathTemplate`, the `github` reporter, and `npx playwright test --update-snapshots`. GitHub Actions examples still use `actions/checkout@v4`, `actions/setup-node@v4`, and `actions/upload-artifact@v4`; current Playwright docs show newer major versions, but the v4 examples remain technically plausible rather than invalid.
