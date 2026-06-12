# Validation Summary: How to Write Playwright Test Scripts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Playwright Test
- End-to-end testing
- JavaScript
- TypeScript
- Browser automation
- Test fixtures
- Page Object Model

## Sources Consulted
- Playwright documentation: Installation, https://playwright.dev/docs/intro
- Playwright documentation: Test configuration and use options, https://playwright.dev/docs/test-configuration and https://playwright.dev/docs/test-use-options
- Playwright documentation: Locators, https://playwright.dev/docs/locators and https://playwright.dev/docs/other-locators
- Playwright documentation: Actions and auto-waiting, https://playwright.dev/docs/actionability
- Playwright API documentation: Page, Keyboard, and navigation APIs, https://playwright.dev/docs/api/class-page and https://playwright.dev/docs/api/class-keyboard
- Playwright documentation: Assertions, https://playwright.dev/docs/test-assertions
- Playwright documentation: Screenshots, videos, and visual comparisons, https://playwright.dev/docs/screenshots, https://playwright.dev/docs/videos, and https://playwright.dev/docs/test-snapshots
- Playwright documentation: Fixtures and hooks, https://playwright.dev/docs/test-fixtures
- Playwright documentation: Page object models, https://playwright.dev/docs/pom
- Playwright documentation: Command line, https://playwright.dev/docs/test-cli
- Local Playwright CLI help output via `npx playwright test --help`

## Issues Found
- Replaced deprecated `page.waitForNavigation()` usage with `page.waitForURL()`, because the Playwright API documentation marks `waitForNavigation()` as deprecated and inherently racy.
- Changed relative `waitForURL('/dashboard')` examples to glob-style `waitForURL('**/dashboard')`, matching Playwright's documented URL waiting behavior for string patterns.
- Fixed the video configuration snippet so it no longer defines the `video` option multiple times in the same object. The corrected snippet uses the documented object form with `mode` and `size`, and leaves `retain-on-failure` as a commented alternative.
- Corrected the custom fixture type from `ReturnType<typeof base['page']>` to Playwright's `Page` type. The original type referenced a nonexistent `page` property on the `test` function.
- Added the missing `expect` import to the Page Object Model example, because the class method calls `expect(this.errorMessage)`.

## Review Notes
The remaining examples use current Playwright APIs and broadly match official guidance. `networkidle` is still a valid load state, but Playwright documentation discourages relying on it for test readiness; future revisions could emphasize web-first assertions over `page.waitForLoadState('networkidle')`.
