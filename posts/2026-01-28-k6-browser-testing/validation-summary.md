# Validation Summary: How to Implement k6 Browser Testing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- k6
- k6 browser module
- JavaScript
- Chromium browser automation
- Core Web Vitals
- k6 scenarios, checks, thresholds, and custom metrics

## Sources Consulted
- Grafana k6 install documentation: https://grafana.com/docs/k6/latest/set-up/install-k6/
- Grafana k6 browser documentation: https://grafana.com/docs/k6/latest/using-k6-browser/
- Grafana k6 browser options documentation: https://grafana.com/docs/k6/latest/using-k6-browser/options/
- Grafana k6 browser metrics documentation: https://grafana.com/docs/k6/latest/using-k6-browser/metrics/
- Grafana k6 browser API documentation: https://grafana.com/docs/k6/latest/javascript-api/k6-browser/
- Grafana k6 BrowserContext API documentation: https://grafana.com/docs/k6/latest/javascript-api/k6-browser/browsercontext/
- Grafana k6 BrowserContext newContext documentation: https://grafana.com/docs/k6/latest/javascript-api/k6-browser/newcontext/
- Grafana k6 check documentation: https://grafana.com/docs/k6/latest/javascript-api/k6/check/
- Grafana k6 browser async operations documentation: https://grafana.com/docs/k6/latest/using-k6-browser/how-to-write-browser-tests/asynchronous-operations/
- web.dev INP Core Web Vital announcement: https://web.dev/blog/inp-cwv-march-12
- web.dev Interaction to Next Paint documentation: https://web.dev/articles/inp
- web.dev Largest Contentful Paint documentation: https://web.dev/articles/lcp
- web.dev Cumulative Layout Shift documentation: https://web.dev/articles/cls

## Issues Found
- The Debian/Ubuntu install commands used an older keyserver-based GPG flow. Updated them to the current official `curl ... | gpg --dearmor` command from Grafana k6 docs.
- The Web Vitals section treated FID as a current Core Web Vital. Updated the text and code to use INP, because INP replaced FID as a Core Web Vital in March 2024.
- The custom Web Vitals example attempted to read LCP and layout shifts with `performance.getEntriesByType()`. Replaced that logic with `PerformanceObserver` for LCP, CLS, and INP-style event duration collection.
- Several examples passed async callbacks to the built-in `k6` `check()` function. Updated those checks to await browser locator calls first and pass synchronous boolean checks to `check()`.
- Some selectors used Playwright-style pseudo selectors such as `:has-text()` and `:first-child` in ways that are not the recommended k6 locator API. Updated them to use k6 locator chaining, `first()`, `hasText`, and `getByText()`.
- The authentication example used browser automation from `setup()`. Reworked it to cache authentication cookies per VU from the iteration body, where the k6 browser module is available.
- The network throttling example used `context.newCDPSession()`, which is not exposed by k6 browser. Replaced it with the documented `BrowserContext.setOffline()` API and clarified that bandwidth/latency throttling requires external network shaping or a proxy.
- The headed/headless example configured `headless` inside script options, but k6 documents `K6_BROWSER_HEADLESS` as an environment variable. Updated the run command and removed the unsupported script option.
- The resource usage example configured Chromium `args` inside script options and included arguments with `--` prefixes. Updated it to use `K6_BROWSER_ARGS` and documented arguments without leading dashes, as required by k6.
- The "Resource Usage Considerations" label was missing Markdown heading syntax. Updated it to a proper section heading.

## Review Notes
The local environment did not have `k6` installed, so the examples were reviewed against official Grafana k6 documentation rather than executed locally.
