# Validation Summary: How to Set Up SLO Monitoring with Istio Metrics

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio standard metrics
- Prometheus and PromQL
- Prometheus recording rules
- Prometheus Operator PrometheusRule resources
- SLOs, SLIs, error budgets, and burn-rate alerting
- Grafana dashboard queries
- Kubernetes ConfigMaps

## Sources Consulted
- Istio standard metrics documentation: https://istio.io/latest/docs/reference/config/metrics/
- Prometheus querying functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus operators and vector matching documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus recording rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus Operator API reference for PrometheusRule: https://prometheus-operator.dev/docs/api-reference/api/
- Google SRE Workbook, Alerting on SLOs: https://sre.google/workbook/alerting-on-slos/
- Kubernetes ConfigMap documentation: https://kubernetes.io/docs/concepts/configuration/configmap/

## Issues Found
- Istio request and latency queries did not filter on the `reporter` label. Updated the examples to use `reporter="destination"` so the SLIs are calculated from destination-side telemetry and avoid mixing source and destination reporter series.
- The initial SLI wording implied Istio provides SLIs directly. Updated it to say Istio provides metrics that can be used to build common SLIs.
- The 99.9% error budget explanation mixed request-based availability with time-based downtime. Clarified that 43 minutes is the time-based interpretation over a 30-day window.
- The one-minute recording rules were labeled and named as counters even though `increase()` records per-window values, not monotonic counters. Renamed those examples to `istio_slo:requests_1m` and `istio_slo:errors_1m` and corrected the comments.
- The burn-rate note attributed 14.4x, 6x, and 1x together to the Google SRE recommended configuration. Clarified that 14.4x and 6x are page-worthy alert examples and that the 1x rule is a slower ticket-style alert.
- The practical tip used rate limiting returning 503 as an expected 5xx example. Reworded it to a more general expected-5xx case because rate limiting commonly returns 429.

## Review Notes
The PrometheusRule shape, PromQL functions, histogram bucket usage, Grafana panel query examples, and Kubernetes ConfigMap example are technically plausible after the corrections. The long-window `increase(...[30d])` recording rules can still be expensive in high-cardinality meshes; a production setup may prefer lower evaluation frequency, pre-aggregated shorter-window rules, or a dedicated SLO tooling layer.
