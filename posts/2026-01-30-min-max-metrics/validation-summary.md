# Validation Summary: How to Implement Min/Max Metrics

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Observability metrics
- OpenTelemetry metrics and Python SDK
- Prometheus recording rules, alerting rules, and PromQL
- Python sliding-window and alerting examples
- Node.js interval-based metric tracking
- OpenTelemetry Collector metricstransform processor
- OneUptime metric ingestion and alerting concepts

## Sources Consulted
- OpenTelemetry Metrics Data Model: https://opentelemetry.io/docs/specs/otel/metrics/data-model/
- OpenTelemetry Metrics SDK specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk/
- OpenTelemetry Python metrics API: https://opentelemetry-python.readthedocs.io/en/latest/api/metrics.html
- Prometheus query functions: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus recording rules: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus alerting rules: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- OpenTelemetry Collector metricstransform processor: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/metricstransformprocessor/README.md
- Python collections.deque documentation: https://docs.python.org/3/library/collections.html
- Python dataclasses documentation: https://docs.python.org/3/library/dataclasses.html
- Node.js timers documentation: https://nodejs.org/api/timers.html
- Node.js CommonJS modules documentation: https://nodejs.org/api/modules.html

## Issues Found
- The histogram boundary description implied bucket boundaries define the full observable range. Updated it to clarify that boundaries define resolution and the final bucket captures values above the highest explicit boundary.
- The OpenTelemetry histogram wording said min/max are always automatic. Updated it to reflect the SDK specification: histogram aggregations collect min/max by default, but min/max recording is configurable.
- The Prometheus CPU recording rules used `node_cpu_seconds_total` directly as a utilization metric. Replaced those expressions with `rate()` over idle CPU time and `avg by (instance)` to calculate CPU utilization before applying `max_over_time`, `min_over_time`, and range calculations.
- The Prometheus histogram quantile examples did not aggregate classic histogram buckets by `le` before calling `histogram_quantile`. Updated the recording and alerting examples to use `sum by (le, service)`.
- The throughput recording and alerting examples operated on raw per-series request counters. Updated them to aggregate request rates by service before applying `min_over_time` and `avg_over_time`.
- The `NoHealthyInstances` alert used `min_over_time(up[1m]) == 0`, which detects any instance going down rather than all instances being down. Changed it to `sum(up{job="my-service"}) == 0`.
- The sustained CPU alert used raw per-CPU idle rates without averaging into instance utilization. Updated it to use the same utilization expression as the recording rules.
- The OpenTelemetry Collector storage snippet claimed `metricstransform` could keep only min, max, sum, and count from histograms. Updated the comment to accurately describe label aggregation for cardinality reduction.
- The peak detector checked optional thresholds using truthiness and divided by the previous maximum, which could skip zero-valued thresholds and divide by zero when the previous maximum was zero. Updated the checks to use `is not None` and handle a zero previous maximum.
- The OneUptime integration wording said OTLP histograms include min/max automatically. Updated it to clarify that min/max are included when the SDK records those fields.

## Review Notes
Local syntax checks passed for all Python, JavaScript, and YAML blocks in the post. `promtool` was not installed in the workspace, so PromQL expressions were reviewed manually against official Prometheus query function, recording rule, and alerting rule documentation.
