# Validation Summary: How to Implement Visual Regression Testing with Percy

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Percy / BrowserStack Percy
- Percy CLI
- Percy SDKs for Playwright, Cypress, Puppeteer, and Storybook
- Playwright
- Cypress
- Storybook
- GitHub Actions
- YAML configuration
- TypeScript and JavaScript test examples

## Sources Consulted
- BrowserStack Percy configuration options: https://www.browserstack.com/docs/percy/references/config-options
- BrowserStack Percy commands reference: https://www.browserstack.com/docs/percy/references/commands
- BrowserStack Percy Cypress integration docs: https://www.browserstack.com/docs/percy/cypress/getting-started/integrate-your-tests
- BrowserStack Percy Storybook integration docs: https://www.browserstack.com/docs/percy/storybook/getting-started/integrate-your-tests
- BrowserStack Percy Storybook advanced topics: https://www.browserstack.com/docs/percy/references/storybook-advance-topics
- BrowserStack Percy specific CSS docs: https://www.browserstack.com/docs/percy/advanced-snapshots/percy-css
- BrowserStack Percy parallel test suites docs: https://www.browserstack.com/docs/percy/troubleshoot/parallel-test-suites
- Official Percy Playwright package types and README: https://github.com/percy/percy-playwright
- Official Percy Storybook package README and distributed schema: https://github.com/percy/percy-storybook
- Official Percy Core and Cypress package types: https://www.npmjs.com/package/@percy/core and https://www.npmjs.com/package/@percy/cypress

## Issues Found
- The Playwright example imported `expect` but did not use it. Removed the unused import so the snippet remains clean and avoids `noUnusedLocals` failures in stricter TypeScript projects.
- The `enable-javascript` comment said it waits for fonts to load. Percy documentation defines this option as enabling JavaScript in the Percy rendering environment, so the comment was corrected.
- The Storybook `include` and `exclude` examples used glob-like patterns. The current `@percy/storybook` SDK treats these values as regular expression strings, so the examples were changed to valid regex patterns.
- The GitHub Actions workflow called `npx percy build:finalize` after a normal, non-parallel `percy exec` run. Percy finalizes normal `percy exec` builds automatically; `build:finalize` is for parallel builds, so the extra step was removed.

## Review Notes
- Percy Storybook also supports CLI `--include` and `--exclude` options; the post keeps the config-file approach, which is valid when using the Storybook SDK.
- The examples assume the application and test framework are already configured with suitable base URLs and routes.
