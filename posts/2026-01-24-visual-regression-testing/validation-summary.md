# Validation Summary: How to Handle Visual Regression Testing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Visual regression testing
- Playwright Test screenshot assertions and configuration
- Cypress with Percy
- BackstopJS
- Git LFS
- GitHub Actions CI/CD
- Storybook test runner and visual testing
- Docker-based Playwright test environments

## Sources Consulted
- Playwright Visual Comparisons: https://playwright.dev/docs/test-snapshots
- Playwright PageAssertions `toHaveScreenshot`: https://playwright.dev/docs/api/class-pageassertions
- Playwright TestConfig and TestProject configuration: https://playwright.dev/docs/api/class-testconfig and https://playwright.dev/docs/api/class-testproject
- Playwright TestOptions `reducedMotion`: https://playwright.dev/docs/api/class-testoptions
- Playwright Docker documentation: https://playwright.dev/docs/docker
- Playwright CI documentation: https://playwright.dev/docs/ci-intro
- Percy Cypress package documentation: https://www.npmjs.com/package/@percy/cypress
- Percy per-snapshot configuration: https://www.browserstack.com/docs/percy/percy-snapshot-config/per-snapshot-config
- BackstopJS README/configuration reference: https://github.com/garris/backstopjs
- GitHub Actions contexts reference: https://docs.github.com/en/actions/reference/workflows-and-actions/contexts
- GitHub Actions runner ADR for step outcome and conclusion: https://github.com/actions/runner/blob/main/docs/adrs/0274-step-outcome-and-conclusion.md
- Storybook test runner documentation: https://storybook.js.org/docs/writing-tests/integrations/test-runner
- Storybook visual testing documentation: https://storybook.js.org/docs/writing-tests/visual-testing

## Issues Found
- The Playwright configuration used a raw Chromium launch argument to force reduced motion. Replaced it with Playwright's documented `reducedMotion: 'reduce'` test option so the example uses the supported API.
- The comment for `animations: 'disabled'` described it as an animation timeout. Updated the comment to correctly describe that the option disables animations during screenshots.
- The cross-browser Playwright example placed `snapshotPathTemplate` inside each project. Moved it to the top-level Playwright config, where `snapshotPathTemplate` is documented, while retaining `{projectName}` to keep browser-specific snapshots separate.
- The pull request workflow combined `continue-on-error: true` with later `if: failure()` steps. Because continued failures have `steps.<id>.outcome == 'failure'` but a successful conclusion, changed the upload/comment conditions to check `steps.visual_tests.outcome == 'failure'` and added a final step to fail the workflow after artifacts and comments are created.
- The Playwright Docker image examples pinned an old `v1.40.0-jammy` image. Updated both examples to the current official `mcr.microsoft.com/playwright:v1.61.0-noble` tag.
- The GitHub Script API call for creating a PR comment was not awaited. Added `await` for correctness inside the async script environment.

## Review Notes
- The examples are illustrative and assume the application provides the referenced test IDs, routes, scripts, and placeholder assets.
- Storybook's older test runner remains available, but official Storybook documentation now recommends the Vitest addon for Vite-powered Storybook projects and Chromatic for native visual testing workflows.
- The GitHub Actions snippets use `actions/checkout@v4` and `actions/setup-node@v4`; newer major versions exist, but these versions remain commonly usable and were not technically incorrect.
