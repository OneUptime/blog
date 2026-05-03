# Validation Summary: How to Set Up Custom Metrics Collection in Rancher

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- Rancher (Kubernetes management platform)
- Prometheus / Prometheus Operator
- ServiceMonitor CRD (`monitoring.coreos.com/v1`)
- Kubernetes Services
- Python `prometheus_client` library
- Flask
- Grafana (PromQL queries)
- kubectl

## Sources Consulted
- prometheus_client GitHub repository: https://github.com/prometheus/client_python
- prometheus_client documentation (Counter, Histogram, Gauge, `start_http_server`, `generate_latest`, `CONTENT_TYPE_LATEST`)
- Direct verification by installing `prometheus_client` 0.25.0 and inspecting `start_http_server` signature and Counter/Histogram positional-argument behavior
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/ (ServiceMonitor `apiVersion: monitoring.coreos.com/v1`, `endpoints[].port` references a named Service port, Prometheus scrapes the corresponding `targetPort` on each pod)
- kube-prometheus-stack Helm chart (prometheus-community): https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack
- Prometheus PromQL documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/ (`rate`, `histogram_quantile`, `sum by`)

## Issues Found
1. **Inconsistency between Python `/metrics` route and Service metrics port (FIXED).**
   - **What was wrong:** The original Python code exposed `/metrics` as a Flask route, which means metrics would only be reachable on whatever port the Flask app listens on (implied to be `8080` from the Service's `http` port). However, the Kubernetes Service in Step 2 declared a separate `metrics` port `9090` with `targetPort: 9090`, and the ServiceMonitor scrapes that port. Since nothing was actually listening on pod port `9090`, the scrape would have failed for anyone following the tutorial verbatim.
   - **What I changed:** Replaced the `@app.route('/metrics')` Flask route with `start_http_server(9090)` from `prometheus_client`. This starts a dedicated HTTP server on port `9090` exposing `/metrics`, which matches the Service's `metrics` port and `targetPort: 9090`. Updated the imports accordingly (added `start_http_server`, removed the now-unused `generate_latest` and `CONTENT_TYPE_LATEST`).
   - **Why:** This is the smallest change that makes the configuration internally consistent and runnable as written, while preserving the article's pedagogical structure of a separate metrics port. `start_http_server` is the idiomatic `prometheus_client` pattern for a dedicated metrics endpoint on a separate port.

## Review Notes
- **Counter/Histogram positional `labelnames`** — verified by direct execution: passing label names as the third positional argument (e.g., `Counter('name', 'desc', ['method', 'endpoint'])`) is valid `prometheus_client` syntax; `labelnames` is documented as a positional-or-keyword parameter. No change needed.
- **ServiceMonitor `release: monitoring` label** — this label value must match whatever the Prometheus Operator's `serviceMonitorSelector` is configured to look for. The article correctly notes this in an inline comment. The chosen value (`monitoring`) is illustrative and customary when the Helm release is named "monitoring"; users with a different release name will need to adjust.
- **`prometheus-kube-prometheus-prometheus` service name** — this is the canonical name produced by installing `kube-prometheus-stack` via Helm with release name `prometheus`; the chart's fullname template historically resolves to `<release>-kube-prometheus-<component>`. Users with a different release name should adjust accordingly.
- **`start_http_server` and multi-process WSGI** — under multi-worker WSGI servers (e.g., gunicorn with multiple workers), each worker would start its own `start_http_server`, and metrics would not be aggregated across workers. For production multi-process deployments, `prometheus_client.multiprocess` mode is the recommended approach. The tutorial's single-process example is fine as-is, but readers deploying with multiple workers should be aware.
- **Flask `before_request` / `after_request` middleware** — correctly used to time and label requests. Note that the latency `Histogram` excludes requests that raise unhandled exceptions before `after_request` runs; this is acceptable behavior for an introductory example.
