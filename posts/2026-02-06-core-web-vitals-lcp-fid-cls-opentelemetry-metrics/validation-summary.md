# Validation Summary: How to Capture Core Web Vitals (LCP, FID, CLS) as OpenTelemetry Metrics

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry JavaScript metrics SDK
- OpenTelemetry OTLP HTTP metrics exporter
- OpenTelemetry resource and semantic conventions packages
- Google `web-vitals` JavaScript library
- Core Web Vitals: LCP, INP, CLS
- Browser Performance Observer and Navigation Timing APIs

## Sources Consulted
- OpenTelemetry JavaScript `@opentelemetry/resources` API docs: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_resources.html
- OpenTelemetry JavaScript `@opentelemetry/sdk-metrics` API docs: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_sdk-metrics.html
- OpenTelemetry JavaScript `MeterProvider` API docs: https://open-telemetry.github.io/opentelemetry-js/classes/_opentelemetry_sdk-node.metrics.MeterProvider.html
- Google web.dev Web Vitals docs: https://web.dev/articles/vitals
- Google web.dev Core Web Vitals threshold docs: https://web.dev/articles/defining-core-web-vitals-thresholds
- Google web.dev INP Core Web Vital launch post: https://web.dev/blog/inp-cwv-launch
- Google web.dev FID deprecation post: https://web.dev/blog/fid
- GoogleChrome `web-vitals` README: https://github.com/GoogleChrome/web-vitals
- Current npm package exports checked locally for `web-vitals@5.3.0`, `@opentelemetry/sdk-metrics@2.7.1`, `@opentelemetry/resources@2.7.1`, and `@opentelemetry/exporter-metrics-otlp-http@0.218.0`

## Issues Found
- The post treated FID as a current Core Web Vital and used `onFID` from `web-vitals`. INP replaced FID as a Core Web Vital in 2024, and `web-vitals` v5 removes `onFID`, so I updated the post to use LCP, INP, and CLS and removed the FID histogram and callback code.
- The OpenTelemetry resource example imported and instantiated `Resource` directly. Current `@opentelemetry/resources` docs show `resourceFromAttributes()` as the valid public helper, and the current package export does not include `Resource`, so I changed the example to use `resourceFromAttributes`.
- The initialization example defined a `metrics-lifecycle.js` flush handler but did not import it. I added `import './metrics-lifecycle';` so the page visibility flush handler is registered.
- The text said each web-vitals callback fires once. Current `web-vitals` docs note callbacks can be called more than once, especially for CLS, INP, and bfcache restores, so I changed the wording to say callbacks fire when metrics are available and ready to report.

## Review Notes
The examples are accurate for the current unpinned npm install command as of the review date. If the post intentionally needs to cover legacy FID collection, it should pin `web-vitals` to a pre-v5 version and clearly mark FID as legacy rather than a current Core Web Vital.
