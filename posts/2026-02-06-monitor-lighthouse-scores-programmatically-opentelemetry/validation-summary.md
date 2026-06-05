# Validation Summary: How to Monitor Lighthouse Scores Programmatically with OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Lighthouse
- OpenTelemetry JavaScript SDK
- OTLP HTTP exporters
- Node.js
- Chrome Launcher
- GitHub Actions
- Core Web Vitals and Lighthouse performance metrics

## Sources Consulted
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- Lighthouse programmatic usage documentation: https://github.com/GoogleChrome/lighthouse/blob/main/docs/readme.md
- Lighthouse result object documentation: https://github.com/GoogleChrome/lighthouse/blob/main/docs/understanding-results.md
- Lighthouse score variability documentation: https://github.com/GoogleChrome/lighthouse/blob/main/docs/variability.md
- Chrome for Developers Lighthouse performance scoring documentation: https://developer.chrome.com/docs/lighthouse/performance/performance-scoring/
- web.dev Web Vitals documentation: https://web.dev/articles/vitals
- GitHub Actions events documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows
- npm package metadata for lighthouse, chrome-launcher, and OpenTelemetry JavaScript packages

## Issues Found
- The OpenTelemetry setup used `new Resource(...)` from `@opentelemetry/resources`, but current OpenTelemetry JavaScript packages no longer export `Resource` from that package. Changed the example to use `resourceFromAttributes(...)`.
- The Lighthouse runner used CommonJS `require()` for current ESM packages. Changed the runner to dynamically import `lighthouse` and `chrome-launcher`.
- The trace example described child spans, but `tracer.startSpan()` was called without passing a parent context, so the spans would not reliably be children of the audit span. Added `context` and `trace.setSpan(...)` usage and passed the root context when creating child spans.
- The post referred to LCP, CLS, and TBT collectively as Core Web Vitals. Updated the wording to state that LCP and CLS are Core Web Vitals and TBT is a lab proxy for responsiveness issues that can affect INP.
- The metric and trace comments referred to all recorded performance audits as Core Web Vitals, even though FCP, Speed Index, TBT, and Interactive are not Core Web Vitals. Changed those comments and explanations to "key Lighthouse metrics" and "key Lighthouse performance audits."
- The GitHub Actions example used Node.js 20, but the current Lighthouse package requires Node.js 22.19 or newer. Changed the workflow to use Node.js 22.
- The `deployment_status` workflow was described as running after successful deployments, but the event triggers for deployment status events generally. Added a job-level condition so deployment-status runs proceed only for successful deployment statuses while scheduled runs still execute.
- The alerting section said a Lighthouse performance score below 80 is Google's threshold for a good score and could impact search rankings. Updated it to the current Lighthouse good threshold of 90 and framed it as a regression signal rather than a direct ranking claim.

## Review Notes
Lighthouse scores can vary between runs because of page, network, server, browser, and machine variability. For production alerting, consider running multiple audits and alerting on representative or aggregate values rather than a single run.
