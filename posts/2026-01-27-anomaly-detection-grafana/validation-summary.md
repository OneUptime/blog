# Validation Summary: How to Implement Anomaly Detection in Grafana

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Grafana Cloud AI/ML
- Grafana Alerting
- Prometheus
- PromQL
- Alertmanager
- Python
- Prophet
- prometheus-api-client
- prometheus_client

## Sources Consulted
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/
- Grafana AI/ML outlier detection documentation: https://grafana.com/docs/plugins/grafana-ml-app/latest/dynamic-alerting/outlier-detection/
- Grafana Cloud AI and machine learning documentation: https://grafana.com/docs/grafana-cloud/machine-learning/
- Prophet quick start documentation: https://facebook.github.io/prophet/docs/quick_start.html
- prometheus-api-client documentation: https://prometheus-api-client-python.readthedocs.io/en/latest/source/prometheus_api_client.html
- Prometheus Python client Gauge documentation: https://prometheus.github.io/client_python/instrumenting/gauge/

## Issues Found
- The introductory standard-deviation example used the raw `http_requests_total` counter with `avg_over_time` and `stddev_over_time`. Changed it to use `sum(rate(http_requests_total[5m]))` with subqueries so the example analyzes request rate rather than a monotonically increasing counter.
- The quantile example used `http_request_duration_seconds > on() quantile_over_time(...)`, which can create invalid many-to-many matching and is misleading for histogram metrics. Changed it to a per-series gauge-style example using `request_latency_seconds`.
- The Grafana ML section described an Enterprise "Machine Learning condition" flow and a non-documented `grafana_ml_outlier_score` metric. Updated it to the current Grafana Cloud AI/ML Outlier Detector flow and documented `<detector_name>:outliers` binary metric pattern.
- The Prophet snippet used `datetime` and `timedelta` without imports. Added the missing imports and updated the pandas frequency alias from uppercase `H` to lowercase `h`.
- The Prometheus exporter snippet said to "push" metrics back to Prometheus, but `start_http_server` exposes a scrape endpoint. Changed the wording to "Expose" and added missing `time`, `services`, and `detect_anomaly_score` definitions so the snippet is syntactically complete.
- The anomaly band examples applied range selectors to aggregate expressions without explicit parentheses. Added parentheses around subquery expressions for clarity and correctness.
- The Alertmanager inhibition example used deprecated `source_match` and `target_match_re` fields. Updated it to `source_matchers` and `target_matchers`.
- The latency alert example used `histogram_quantile` without aggregating histogram buckets by `le`. Updated it to `histogram_quantile(0.99, sum(rate(..._bucket[5m])) by (le))`.
- The error-rate alert had an invalid subquery placement that `promtool` rejected. Wrapped the full ratio expression before applying `[7d:1h]`.

## Review Notes
Verified representative Prometheus alert-rule expressions with `promtool` 3.11.3. Verified the Python snippets with `python3 -m py_compile`; they were syntax-checked but not run against live Prometheus, Grafana, or Prophet installations.
