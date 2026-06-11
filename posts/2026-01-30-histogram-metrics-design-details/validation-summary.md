# Validation Summary: How to Create Histogram Metrics Design Details

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Prometheus classic histograms
- Prometheus native histograms
- PromQL `histogram_quantile()`
- Node.js `prom-client`
- Express
- TypeScript

## Sources Consulted
- Prometheus Histograms and Summaries: https://prometheus.io/docs/practices/histograms/
- Prometheus Native Histograms specification: https://prometheus.io/docs/specs/native_histograms/
- Prometheus configuration reference: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus query functions reference: https://prometheus.io/docs/prometheus/latest/querying/functions/
- `prom-client` official README and TypeScript definitions: https://github.com/siimon/prom-client
- Express 5.x API reference: https://expressjs.com/en/5x/api/

## Issues Found
- The histogram bucket flowchart incremented buckets whose upper bounds were below the observed value. I corrected the flow so a 150ms observation increments only buckets with upper bounds of 250ms, 500ms, and +Inf.
- The cardinality section counted only explicit bucket series and omitted the automatic +Inf bucket plus `_sum` and `_count` series. I corrected the formula and example from 3000 to 3900 active series for the example label set.
- The summary metric recommendation implied summaries solve high cardinality. I changed it to describe summaries as useful for per-instance quantiles when aggregation is not required.
- The Apdex PromQL subtracted the satisfied bucket before dividing, which simplified to half of the tolerating threshold bucket rather than the Apdex formula for cumulative histogram buckets. I corrected the expression to add the satisfied threshold and tolerating threshold, then divide by 2 and by the total count.
- The native histogram section described Prometheus 2.40+ support as if it were stable and enabled by scrape protocol alone. I updated it to note that native histograms were experimental in Prometheus 2.40, stable in Prometheus 3.8, require `scrape_native_histograms: true`, and require the `--enable-feature=native-histograms` flag on Prometheus 2.x.
- The post overstated histogram precision by referring to a full distribution and precise percentile calculations. I changed those descriptions to bucketed distributions and more accurate percentile estimates near important boundaries.
- The +Inf bucket pitfall said outliers are simply lost without +Inf. I corrected it to explain that classic Prometheus histograms need +Inf, most clients add it automatically, and `histogram_quantile()` returns `NaN` without it.

## Review Notes
- The TypeScript `prom-client` and Express example was compiled successfully with `prom-client` 15.1.3, Express 5 typings, and TypeScript 5.9.3.
- The example records `status_code: '200'` before the handler completes. A production Express middleware would usually observe duration after the response finishes so status labels reflect actual outcomes, but the simplified example is syntactically valid and illustrates histogram usage.
