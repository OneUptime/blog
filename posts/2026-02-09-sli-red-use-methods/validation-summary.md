# Validation Summary: How to Implement Kubernetes Service Level Indicators Using RED and USE Methods

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes
- Prometheus and PromQL
- Prometheus Operator PrometheusRule resources
- Prometheus Go client library
- Grafana dashboards
- GitLab CI/CD
- kubectl

## Sources Consulted
- Prometheus querying operators and vector matching: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus histogram and `histogram_quantile` guidance: https://prometheus.io/docs/practices/histograms/
- Prometheus HTTP API: https://prometheus.io/docs/prometheus/3.0/querying/api/
- Prometheus Go client `promauto` package documentation: https://pkg.go.dev/github.com/prometheus/client_golang/prometheus/promauto
- Prometheus Operator API reference for `PrometheusRule`: https://prometheus-operator.dev/docs/api-reference/api/
- Grafana time series visualization documentation: https://grafana.com/docs/grafana/latest/panels-visualizations/visualizations/time-series/
- Grafana alerting documentation: https://grafana.com/docs/grafana/latest/alerting/
- GitLab CI/CD YAML `when` documentation: https://docs.gitlab.com/ee/ci/yaml/
- Kubernetes `kubectl apply` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply
- Kubernetes `kubectl rollout` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/
- Brendan Gregg's USE Method reference: https://www.brendangregg.com/Articles/The_USE_Method.pdf

## Issues Found
- The Go instrumentation emitted `method`, `endpoint`, and textual `status` labels, while the PromQL recording rules grouped by `service` and `namespace` and matched error statuses with `status=~"5.."`. I added `service` and `namespace` labels to the Go metrics and changed the status label to the numeric HTTP status code so the RED recording rules work as written.
- The Go example needed `os` and `strconv` imports after adding environment-based service metadata and numeric status conversion. I added those imports and a small `getEnv` helper.
- The pod CPU and memory utilization rules did not aggregate by pod and could divide by unlimited or zero resource limits. I filtered out empty infrastructure containers and zero/unlimited limits, then aggregated by `pod` and `namespace`.
- The CPU saturation rule divided `node_load1` by a per-instance CPU count without explicit PromQL vector matching. I added `on(instance)` so the binary operation matches as intended.
- The disk saturation comment and alert description called `node_disk_io_time_seconds_total` "I/O wait time". That metric represents disk busy time, so I corrected the wording.
- The Grafana dashboard snippet used the legacy `graph` panel type and embedded legacy-style panel alerts. I changed the panels to `timeseries` and removed the embedded alert blocks, leaving alerting to the PrometheusRule section.
- The Prometheus API calls in the GitLab CI example placed raw PromQL expressions directly in the query string. I changed them to `curl -sG --data-urlencode` so label matchers and quotes are encoded correctly.

## Review Notes
- The examples are intentionally generic and assume Prometheus is already scraping the application, node exporter, and container/cAdvisor metrics.
- The CI example treats USE threshold breaches as warnings, while RED threshold breaches fail the validation job and trigger rollback.
