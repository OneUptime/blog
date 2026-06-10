# Validation Summary: How to Build Visual Regression Testing

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- Playwright (`@playwright/test`) — visual comparison via `toHaveScreenshot`
- Percy (`@percy/cli`, `@percy/playwright`) — hosted visual testing service
- GitHub Actions — CI workflow YAML for visual regression
- TypeScript — for test and config examples
- Storybook — used as a component playground host in one example
- Mermaid — for workflow diagrams

## Sources Consulted
- Playwright TestConfig docs (top-level config, `expect.toHaveScreenshot` config options): https://playwright.dev/docs/api/class-testconfig
- Playwright TestProject docs: https://playwright.dev/docs/api/class-testproject
- Playwright PageAssertions `toHaveScreenshot` per-call options (`mask`, `maskColor`, `fullPage`, etc.): https://playwright.dev/docs/api/class-pageassertions#page-assertions-to-have-screenshot-1
- Playwright snapshots guide: https://playwright.dev/docs/test-snapshots
- Playwright devices descriptors (`Desktop Chrome`, `iPhone 13`): https://playwright.dev/docs/emulation
- Percy + Playwright integration docs: https://docs.percy.io/docs/playwright
- GitHub Actions used in workflow (`actions/checkout@v4`, `actions/setup-node@v4`, `actions/upload-artifact@v4`) — current major versions verified on GitHub Marketplace

## Issues Found

1. **`snapshotDir` placed under `expect.toHaveScreenshot` in `playwright.config.ts`.**
   - What was wrong: In the "Basic Configuration" snippet, `snapshotDir: './screenshots/baseline'` was nested inside `expect.toHaveScreenshot`. `snapshotDir` is not a valid option in the `expect.toHaveScreenshot` config block; it is a top-level `TestConfig`/`TestProject` option. Nested there it is silently ignored.
   - Fix applied: Moved `snapshotDir: './screenshots/baseline'` out of `expect.toHaveScreenshot` and placed it as a top-level option in the `defineConfig({ ... })` object, leaving `maxDiffPixelRatio` inside `expect.toHaveScreenshot` where it belongs.
   - Why: Matches the Playwright TestConfig schema so the directory override will actually take effect.

## Review Notes

- `maskColor` is used correctly in the post: it appears only on a per-call `expect(page).toHaveScreenshot({ mask, maskColor })` assertion (where it is valid as a `PageAssertions` option). It is not used in the global `expect.toHaveScreenshot` config block (where it would be ignored). No change needed.
- `snapshotDir` is technically a legacy/discouraged option in current Playwright docs in favor of `snapshotPathTemplate`, but it is still supported and the simplest way to express the author's intent. Left as-is.
- The `Date` override inside `addInitScript` is a common pattern. It works for most cases but does not patch `Intl`, performance timers, or other time-sensitive APIs; for fully deterministic time, libraries like `@sinonjs/fake-timers` are stronger. Not a correctness issue for the tutorial's stated purpose.
- `actions/checkout@v4`, `actions/setup-node@v4`, `actions/upload-artifact@v4` are all current major versions as of the post's date.
- `npx playwright install --with-deps chromium`, `npx playwright test --update-snapshots`, and `npx percy exec -- npx playwright test ...` are all current, supported CLI invocations.
- The device descriptors `Desktop Chrome` and `iPhone 13` are valid Playwright device entries.
- `threshold: 0` with `maxDiffPixels: 0` in the "pixel-perfect logo" example is genuinely strict and may produce false positives across rendering backends; the post acknowledges this is intentional ("zero tolerance"), so no change.
