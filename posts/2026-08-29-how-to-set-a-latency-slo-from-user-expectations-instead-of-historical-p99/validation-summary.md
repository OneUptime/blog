# Validation Summary: How to Set a Latency SLO from User Expectations Instead of Historical P99

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Service level objectives (SLOs), service level indicators (SLIs), and error budgets
- User-centered latency measurement and percentile analysis
- Prometheus classic histograms
- PromQL `rate()` and `histogram_quantile()`

## Sources Consulted
- [Google SRE Book: Service Level Objectives](https://sre.google/sre-book/service-level-objectives/)
- [Google SRE Workbook: Implementing SLOs](https://sre.google/workbook/implementing-slos/)
- [Google Cloud Observability: Properties of a good SLI](https://docs.cloud.google.com/stackdriver/docs/solutions/slo-monitoring/sli-metrics/overview)
- [Google Cloud: Practical guide to setting SLOs](https://cloud.google.com/blog/products/management-tools/practical-guide-to-setting-slos)
- [Prometheus: Histograms and summaries](https://prometheus.io/docs/practices/histograms/)
- [Prometheus: Query functions (`rate()` and `histogram_quantile()`)](https://prometheus.io/docs/prometheus/latest/querying/functions/)
- [OpenTelemetry: .NET HTTP client and server metric semantic conventions](https://opentelemetry.io/docs/specs/semconv/dotnet/dotnet-http-metrics/)
- [W3C: Navigation Timing Level 2](https://www.w3.org/TR/navigation-timing-2/)

## Issues Found
- The example SLO specified a rolling 28-day window, but the PromQL expression calculated only a five-minute ratio. Both range selectors were changed from `[5m]` to `[28d]` so the query evaluates the stated compliance window.
- The statement that server duration always omits queues, response transfer, and other stages was too categorical because server-side metric boundaries vary by instrumentation. It now says those stages can be omitted and identifies work before the metric's start point and after its end point.
- The historical-latency statement was overly absolute. It now treats history primarily as feasibility and cost evidence without denying that observed performance can help inform user expectations when direct evidence is limited.
- The classic-histogram explanation did not state that the threshold bucket must be present on every aggregated time series. It now makes that requirement explicit and distinguishes a direct, non-interpolated threshold count from the estimate returned by `histogram_quantile()`.

## Review Notes
The PromQL is syntactically valid and applies `rate()` before aggregation, which preserves counter-reset handling. Filtering both the bucket numerator and count denominator with `outcome="success"` correctly implements the post's stated successful-outcomes-only latency policy. Current Prometheus guidance prefers native histograms where supported, but classic histograms remain supported and are valid for an exact configured SLO boundary. All referenced URLs resolve to the intended resources, and no version-specific claims were found.
