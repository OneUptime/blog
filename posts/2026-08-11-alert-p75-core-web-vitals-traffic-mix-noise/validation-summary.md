# Validation Summary: How to Alert on the 75th Percentile of Core Web Vitals Without Paging on Traffic-Mix Noise

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Core Web Vitals: Largest Contentful Paint (LCP), Interaction to Next Paint (INP), and Cumulative Layout Shift (CLS)
- GoogleChrome `web-vitals` v6
- JavaScript browser telemetry using the Beacon API and Fetch API
- Real User Monitoring (RUM)
- PostgreSQL ordered-set percentile aggregates
- YAML-style vendor-neutral alert policy pseudocode
- Chrome User Experience Report (CrUX)
- SRE alert design and validation

## Sources Consulted

- [Web Vitals: metrics, thresholds, p75 assessment, and JavaScript measurement](https://web.dev/articles/vitals)
- [How the Core Web Vitals metric thresholds were defined](https://web.dev/articles/defining-core-web-vitals-thresholds)
- [Best practices for measuring Web Vitals in the field](https://web.dev/articles/vitals-field-measurement-best-practices)
- [Interaction to Next Paint (INP)](https://web.dev/articles/inp)
- [Back/forward cache measurement semantics](https://web.dev/articles/bfcache)
- [`web-vitals` v6.1.0 README and API reference](https://github.com/GoogleChrome/web-vitals/blob/v6.1.0/README.md)
- [`web-vitals` v6 changelog](https://github.com/GoogleChrome/web-vitals/blob/v6.1.0/CHANGELOG.md)
- [Chrome soft-navigation measurement guidance](https://developer.chrome.com/docs/web-platform/soft-navigations)
- [CrUX API data model, percentiles, form factors, and rolling window](https://developer.chrome.com/docs/crux/api)
- [CrUX methodology](https://developer.chrome.com/docs/crux/methodology)
- [CrUX metrics methodology](https://developer.chrome.com/docs/crux/methodology/metrics)
- [PostgreSQL aggregate functions, including `percentile_cont`, `percentile_disc`, and `count`](https://www.postgresql.org/docs/current/functions-aggregate.html)
- [Beacon API and `navigator.sendBeacon()`](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/sendBeacon)
- [Fetch `keepalive` request option](https://developer.mozilla.org/en-US/docs/Web/API/RequestInit#keepalive)
- [W3C High Resolution Time](https://w3c.github.io/hr-time/)
- [Google SRE: Practical Alerting from Time-Series Data](https://sre.google/sre-book/practical-alerting/)

## Issues Found

- The collection example said ingestion should keep the newest report but supplied only a wall-clock report time. Requests can arrive out of order, and a wall clock is not a reliable per-instance ordering primitive. Added a monotonically increasing `report_sequence` for each metric object and changed the upsert comment to compare that sequence for each `(metric_id, metric_name)` key.
- The SQL window originally included navigation starts through the current time even though default Web Vitals callbacks can be delayed until interaction, backgrounding, or navigation and can sometimes never run. That right-censors the newest start-time bucket. Changed the example to a closed 30-minute window behind an explicitly illustrative five-minute lateness watermark, and added guidance to tune the watermark and monitor page-view-to-metric coverage independently.
- The post recommends replaying weeks of events, but a latest-value table alone cannot reconstruct the values available to an alert at earlier evaluation times. Added a requirement to retain append-only reports or equivalent version history alongside the latest-value view.

## Review Notes

- The five-minute reporting-lateness watermark is an example, not a guarantee that all visits have reported. Production values must come from observed reporting-delay and coverage data.
- `web-vitals` v6 soft-navigation reporting is opt-in and changes behavior only in browsers that support the underlying soft-navigation APIs. Browser and navigation-type coverage should be monitored when enabling it.
- The CrUX API and PageSpeed Insights use a 28-day rolling aggregation, while the public CrUX BigQuery dataset is monthly. The post's general recommendation to use CrUX for trends rather than minute-level paging remains correct.
- `navigationContext()` and `normalizedRoute()` are application-specific helpers rather than `web-vitals` exports; the post identifies the former as an integration helper. The JavaScript is otherwise syntactically valid and uses current APIs.
