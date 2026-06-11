# Validation Summary: How to Build Latency Percentile SLOs

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Site Reliability Engineering SLOs and error budgets
- Latency SLIs and percentile-based latency analysis
- OpenTelemetry JavaScript metrics SDK
- OpenTelemetry Python metrics SDK
- Prometheus histograms, PromQL, and alerting rules
- ClickHouse aggregate quantile functions
- Mermaid diagrams

## Sources Consulted
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript metrics documentation: https://github.com/open-telemetry/opentelemetry-js/blob/main/doc/metrics.md
- OpenTelemetry Metrics SDK specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk/
- OpenTelemetry Python metrics view documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/metrics.view.html
- OpenTelemetry Python metrics export documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/metrics.export.html
- Prometheus histogram best practices: https://prometheus.io/docs/practices/histograms/
- Prometheus query function documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Google SRE Workbook, Implementing SLOs: https://sre.google/workbook/implementing-slos/
- Google SRE Workbook, Alerting on SLOs: https://sre.google/workbook/alerting-on-slos/
- ClickHouse quantile documentation: https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/quantile
- ClickHouse quantiles documentation: https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/quantiles
- Mermaid XY chart documentation: https://mermaid.ai/open-source/syntax/xyChart.html

## Issues Found
- The JavaScript OpenTelemetry example configured `MeterProvider.readers` with a plain object containing an exporter. The SDK expects metric reader instances. Changed the example to create a `PeriodicExportingMetricReader` with the `OTLPMetricExporter` and pass that reader to `MeterProvider`.
- The Python OpenTelemetry example claimed to create a histogram with explicit bucket boundaries but did not configure any boundaries. Added a `View` with `ExplicitBucketHistogramAggregation` for the histogram instrument.
- The SLO examples combined percentile wording with a separate target percentage, such as "p99 latency under 500ms for 99.5% of requests." For request-based latency SLOs and error budgets, the SLI should be the proportion of requests faster than a threshold. Updated the SLO formula and examples to use request proportions directly.
- The error-budget example said slow requests exceeding 500ms were allowed "at p99." Updated the wording because the calculation counts requests over the threshold.
- The Prometheus fast-burn and slow-burn alert examples checked raw `histogram_quantile()` thresholds while describing burn-rate alerting. Replaced them with slow-request-ratio burn-rate calculations over long and short windows.
- The fast-burn alert lacked the short confirmation window expected in a multi-window, multi-burn-rate alert. Added a 5-minute burn-rate condition alongside the 1-hour condition.
- The slow-burn comment understated budget consumption for a 3x burn rate over 6 hours in a 28-day window. Corrected it to about 2.7%.
- The alert flow diagram still described raw p99 threshold checks after the alerting section was corrected. Updated it to describe burn-rate checks over the configured windows.
- The ClickHouse example calculated multiple `quantile()` values separately. ClickHouse documentation recommends `quantiles()` when multiple quantiles are needed because it computes them in one pass, so the query was updated.

## Review Notes
- JavaScript and Python code blocks were syntax-checked locally.
- The YAML alerting block was parsed successfully with PyYAML.
- The Prometheus examples assume classic histogram bucket series with a `le="500"` bucket matching the millisecond-based OpenTelemetry histogram boundaries.
