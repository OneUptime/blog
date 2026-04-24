# Validation Summary: How to Set Up Custom Metrics Collection in Rancher - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Monitoring
- Kubernetes
- Prometheus Operator
- ServiceMonitor
- PodMonitor
- PrometheusRule
- Prometheus Python client
- Prometheus Go client
- Prometheus JSON Exporter
- Grafana

## Sources Consulted
- Rancher: ServiceMonitor and PodMonitor Configuration - https://ranchermanager.docs.rancher.com/v2.13/reference-guides/monitoring-v2-configuration/servicemonitors-and-podmonitors
- Rancher: Monitoring Configuration Guides - https://ranchermanager.docs.rancher.com/v2.13/how-to-guides/advanced-user-guides/monitoring-v2-configuration-guides
- Rancher: Helm Chart Options - https://ranchermanager.docs.rancher.com/v2.14/reference-guides/monitoring-v2-configuration/helm-chart-options
- Rancher: Persistent Grafana Dashboards - https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/monitoring-alerting-guides/create-persistent-grafana-dashboard
- Rancher `rancher-monitoring` chart values - https://raw.githubusercontent.com/rancher/charts/main/charts/rancher-monitoring/values.yaml
- Prometheus Operator API reference - https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus Python client - https://github.com/prometheus/client_python
- Go `promhttp` package docs - https://pkg.go.dev/github.com/prometheus/client_golang/prometheus/promhttp
- Prometheus JSON Exporter README - https://github.com/prometheus-community/json_exporter
- Prometheus JSON Exporter example config - https://raw.githubusercontent.com/prometheus-community/json_exporter/master/examples/config.yml
- Prometheus JSON Exporter releases - https://github.com/prometheus-community/json_exporter/releases
- Grafana dashboard JSON model - https://grafana.com/docs/grafana/latest/reference/dashboard/
- Prometheus template reference - https://prometheus.io/docs/prometheus/latest/configuration/template_reference/
- Prometheus histogram guidance - https://prometheus.io/docs/practices/histograms/

## Issues Found
- The post said `ServiceMonitor` labels like `release: rancher-monitoring` must match Rancher's selector. Current `rancher-monitoring` chart defaults use empty selectors for `ServiceMonitor`, `PodMonitor`, and `PrometheusRule`, so these labels are not required unless the installation was customized. I removed the misleading requirement and replaced it with an accurate note.
- The annotation-based scrape section was inaccurate for Rancher Monitoring. Rancher documents custom scrape targets through `ServiceMonitor` and `PodMonitor`, with `additionalScrapeConfigSecret` reserved for cases those CRDs cannot express. I replaced the annotation example with a Rancher-specific note.
- The `json_exporter` deployment example was not valid Kubernetes as written because the `Deployment` lacked `spec.selector` and pod template labels. I added the required selector and labels.
- The `json_exporter` config used unsupported fields (`type: value`, `http_method`) for the current exporter format. I rewrote the config to match the documented module schema and JSONPath examples.
- The exporter image and registry were outdated. I updated the example from `prometheuscommunity/json-exporter:v0.6.0` to the current documented upstream release path and version, `quay.io/prometheuscommunity/json-exporter:v0.7.0`.
- The exporter section deployed the exporter but did not actually configure Rancher Monitoring to scrape it. I added a `PodMonitor` that scrapes `/probe` with the required `module` and `target` query parameters.
- The Go instrumentation example used `order_duration_seconds` and `category`, while the Python example and recording rules used `order_processing_seconds` and `product_category`. I aligned the Go example with the rest of the post so the PromQL examples match the exported metric names and labels.
- The recording rules referenced `order_revenue_total`, which was never instrumented anywhere in the post. I replaced that rule with a rule based on the already-defined `orders_processed_total{status="failed"}` series.
- The latency recording rule grouped by `category`, but the instrumentation example exported `product_category`. I corrected the query to group by the actual label name.
- The Grafana section used `admin:admin`, which is not Rancher's documented default Grafana password, and it used an API-based flow that was not the documented Rancher persistence path. I replaced that section with Rancher's supported ConfigMap-based dashboard persistence example.
- The Flask example accessed `request.json` directly, which can fail when the request body is empty or not JSON. I changed it to `request.get_json(silent=True) or {}`.
- The payment failure alert evaluated `rate(payment_failures_total[5m])` without aggregation, which would create one alert per `reason/gateway` label combination. I changed it to `sum(rate(payment_failures_total[5m]))`.

## Review Notes
- The Flask example still assumes `process_order(...)` and `PaymentError` are application-specific placeholders; that is acceptable for an instrumentation example, but the snippet is illustrative rather than a complete runnable service.
- The Grafana ConfigMap example intentionally expects exported dashboard JSON from Grafana to be pasted into the `data` field, matching Rancher's documented dashboard persistence workflow.
- The examples keep the monitoring CRs in `cattle-monitoring-system`, which is valid for cluster-level Rancher Monitoring setups. In environments with different RBAC patterns, creating them in the workload namespace may be more practical.
