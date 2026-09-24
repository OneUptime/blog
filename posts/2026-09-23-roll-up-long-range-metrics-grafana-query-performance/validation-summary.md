# Validation Summary: How to Roll Up Long-Range Metrics Without Making Grafana Queries Slow

## Status
validated

## Post Type
Technical guide with PromQL examples, a Prometheus recording-rule configuration, and Thanos Compactor retention flags.

## Technologies Covered
- Prometheus and PromQL
- Prometheus recording rules and external labels
- Classic and native histograms
- Grafana Prometheus queries and interval variables
- Thanos Compactor, Query, downsampling, and retention

## Sources Consulted
- Prometheus recording-rule configuration and evaluation behavior: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus recording-rule naming and aggregation practices: https://prometheus.io/docs/practices/rules/
- Prometheus query functions, including rate and histogram_quantile: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus histograms and summaries: https://prometheus.io/docs/practices/histograms/
- Prometheus configuration, including external_labels: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus querying basics and avoiding slow queries: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Grafana Prometheus query editor: https://grafana.com/docs/grafana/latest/datasources/prometheus/query-editor/
- Grafana Prometheus template variables and $__rate_interval: https://grafana.com/docs/grafana/latest/datasources/prometheus/template-variables/
- Thanos Compactor downsampling, retention, and CLI flags: https://thanos.io/tip/components/compact.md/#downsampling
- Thanos Query source-resolution parameters and automatic downsampling: https://thanos.io/tip/components/query.md/#auto-downsampling

## Issues Found
No technical issues found.

## Review Notes
- Reviewed all four code/configuration blocks against the official syntax and documented behavior. The YAML group fields, one-minute evaluation interval, recording name, metric selector, rate-before-sum expressions, and retention flags are valid. README.md required no changes.
- Independently checked the sizing illustration: 20,000 × (30 × 24 × 60 × 60 / 15) = 3,456,000,000 samples, which rounds to 3.46 billion. This estimates stored sample volume, not the exact samples read by every query.
- A small query result does not imply low backend work. Aggregations can process many input series, and recording rules precompute reusable results without deleting source data or automatically producing historical results.
- The recording rule assumes application counters and the intended service and cluster labels exist. External labels used for remote communication are not automatically available on local rule inputs. The article correctly calls out this distinction.
- The histogram example preserves le and calculates counter rates before aggregation. Histogram quantiles are estimates from bucket distributions; averaging recorded quantiles cannot reconstruct a combined distribution. Weighted duration means require aggregating sums and counts before division.
- The fixed five-minute windows in the examples describe rolling statistics at each evaluation time, not a percentile or total across the full displayed month. Grafana's $__rate_interval can vary with the query interval and configured scrape interval, whereas the recording-rule window remains fixed.
- Confirmed the documented 40-hour and 10-day downsampling thresholds. The proposed 30-day raw and 90-day five-minute retention periods exceed the respective input-age requirements. Different retention periods intentionally limit historical drill-down; downsampling itself is not a storage-saving guarantee.
- max_source_resolution is an upper bound on source resolution. Explicit auto chooses a resolution automatically; when the parameter is omitted, the query.auto-downsampling flag controls the default behavior. The documentation describes automatic selection using step / 5. A client requesting raw-only data cannot recover raw samples after their retention period.
- Recording rules also set the output sampling cadence through their evaluation interval. Their benefit is not limited to reducing label combinations, although that is the purpose of the example shown.
- Slow rule groups can miss scheduled evaluations and leave gaps. The recommendation to monitor evaluation duration and missed iterations is supported by Prometheus documentation.
- All five technical documentation links in the post resolved to the intended official resources. The post does not pin software versions; Thanos tip and Grafana/Prometheus latest documentation can change over time.
- Validation was a documentation-based syntax and semantics review, not an execution against a live Prometheus, Grafana, or Thanos deployment. No deployment-specific performance benchmark was performed.
