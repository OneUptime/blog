# Validation Summary: How to Implement Capacity Planning for Services

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Capacity planning and SRE practices
- Prometheus configuration, metrics, PromQL, and alerting rules
- Python prometheus_client instrumentation
- TimescaleDB/PostgreSQL time-series SQL
- pandas, NumPy, and scikit-learn LinearRegression
- Kubernetes HorizontalPodAutoscaler autoscaling/v2
- Locust load testing

## Sources Consulted
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus subquery syntax documentation: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus Python client labels documentation: https://prometheus.github.io/client_python/instrumenting/labels/
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Locust configuration and command-line options documentation: https://docs.locust.io/en/stable/configuration.html
- TimescaleDB time_bucket documentation: https://www.tigerdata.com/docs/reference/timescaledb/hyperfunctions/time-series-utilities/time_bucket
- PostgreSQL aggregate functions documentation for percentile_cont and WITHIN GROUP: https://www.postgresql.org/docs/current/functions-aggregate.html
- scikit-learn LinearRegression documentation: https://scikit-learn.org/stable/modules/generated/sklearn.linear_model.LinearRegression.html
- pandas time series documentation: https://pandas.pydata.org/docs/user_guide/timeseries.html

## Issues Found
- The baseline SQL averaged `http_requests_total`, which is normally a cumulative Prometheus counter. Changed it to average `requests_per_second` so the requests-per-core calculation uses a rate-like value instead of a monotonically increasing total.
- The bottleneck detection script used `rate()` on `request_queue_size`, which is a gauge-style metric. Changed it to `deriv()` because Prometheus documents `rate()` for counters and `deriv()` for gauge trend analysis.
- The predictive Prometheus alert applied `predict_linear()` directly to `http_requests_total`, a cumulative counter. Changed it to forecast `sum(rate(http_requests_total[5m]))` over a 7-day subquery window, which predicts request rate rather than cumulative counter value.

## Review Notes
- Python and YAML snippets were parsed locally and are syntactically valid.
- `promtool` and `locust` were not installed in the local environment, so Prometheus rule and Locust CLI validation used official documentation rather than local command execution.
- The Kubernetes HPA snippet uses the current `autoscaling/v2` API and valid behavior and metric target fields, assuming the custom pod metric is exposed through a Kubernetes custom metrics adapter.
