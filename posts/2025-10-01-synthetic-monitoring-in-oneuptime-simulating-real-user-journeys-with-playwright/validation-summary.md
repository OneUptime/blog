# Validation Summary: Synthetic Monitoring in OneUptime: Simulating Real User Journeys with Playwright

## Status
validated

## Post Type
Tutorial / Product guide (explains and demonstrates OneUptime's synthetic monitoring feature with Playwright code examples)

## Technologies Covered
- OneUptime synthetic monitoring (Probe execution, sandboxed VM runner)
- Playwright (browser automation: Chromium, Firefox)
- JavaScript / TypeScript sandbox scripts
- Mermaid (flow diagram)

## Sources Consulted
- OneUptime source — `Probe/Utils/Monitors/MonitorTypes/SyntheticMonitor.ts` (sandbox context, execution flow, screenshot collection, proxy handling, browser disposal)
- OneUptime source — `Common/Server/Utils/Browser.ts` (viewport sizes, browser launch, Chromium/Firefox support)
- OneUptime source — `Common/Types/Monitor/SyntheticMonitors/SyntheticMonitorResponse.ts` (response shape: screenshots, logMessages, executionTimeInMS, result, scriptError)
- Playwright official docs (https://playwright.dev/) — `page.goto`, `page.textContent`, `page.fill`, `page.click`, `page.waitForSelector`, `page.screenshot` API signatures and `waitUntil` options

## Issues Found
1. **Incorrect claim that the `browser` object is exposed to scripts.** The post stated the script context "includes Playwright's `browser` and `page`," and a code comment said APIs are available "via the provided page/browser." This is wrong: `SyntheticMonitor.ts` deliberately exposes only `page` (plus `screenSizeType`, `browserType`, and a `screenshots` side-channel object) to the sandbox, and includes an explicit comment that exposing `browser` would allow RCE (sandbox escape via `browser.browserType().launch({executablePath: "/bin/sh"})`). A reader following the post would write code referencing an undefined `browser`.
   - **Fix:** Updated the "Writing your synthetic script" paragraph to describe only the `page`, the `browserType`/`screenSizeType` metadata, and the `screenshots` object, and added a note that `browser` is intentionally not exposed for security. Updated the minimal example's leading comment to reference "the provided page object" instead of "page/browser."

## Review Notes
- Viewport dimensions in the post (Desktop 1920×1080, Tablet 1024×768, Mobile 360×640) exactly match `getViewportHeightAndWidth` in both `Browser.ts` and `SyntheticMonitor.ts`.
- Browser matrix (Chromium, Firefox) is accurate; WebKit is referenced only in the general "What is Playwright?" description, which is correct as a Playwright capability statement (WebKit is commented out in OneUptime's launcher).
- The return-shape contract (`data`, `screenshots` as name→Buffer maps converted to base64, `logMessages`, `executionTimeInMS`, `result`, `scriptError`) all match the response interface and `collectScreenshots`/execution logic.
- Proxy claim (auto-applies HTTPS/HTTP proxy, prefers HTTPS, parses basic-auth username/password from the proxy URL) matches `getPageByBrowserType`'s proxy configuration block.
- "Browsers are always closed after execution" is accurate — disposal runs in a `finally` block.
- All Playwright API calls in the examples are current, non-deprecated, and have correct signatures.
- The `.ts` label on the multi-step example is cosmetic; the snippet is valid JavaScript/TypeScript either way.
