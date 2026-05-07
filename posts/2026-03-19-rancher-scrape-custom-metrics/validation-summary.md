# Validation Summary: How to Scrape Custom Application Metrics in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Monitoring
- Kubernetes
- Prometheus
- Prometheus Operator
- ServiceMonitor
- PrometheusRule
- Grafana
- Go
- Python / Flask
- Node.js / Express

## Sources Consulted
- Rancher: ServiceMonitor and PodMonitor Configuration - https://ranchermanager.docs.rancher.com/v2.14/reference-guides/monitoring-v2-configuration/servicemonitors-and-podmonitors
- Rancher: Persistent Grafana Dashboards - https://ranchermanager.docs.rancher.com/v2.14/how-to-guides/advanced-user-guides/monitoring-alerting-guides/create-persistent-grafana-dashboard
- Rancher: How Monitoring Works - https://ranchermanager.docs.rancher.com/integrations-in-rancher/monitoring-and-alerting/how-monitoring-works
- Prometheus Operator API reference - https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus Operator troubleshooting - https://prometheus-operator.dev/docs/platform/troubleshooting/
- Prometheus Python client: Flask exporting - https://prometheus.github.io/client_python/exporting/http/flask/
- Prometheus Python client: Counter - https://prometheus.github.io/client_python/instrumenting/counter/
- Prometheus Python client: Histogram - https://prometheus.github.io/client_python/instrumenting/histogram/
- Prometheus Python client: Labels - https://prometheus.github.io/client_python/instrumenting/labels/
- Prometheus Go client `promhttp` docs - https://pkg.go.dev/github.com/prometheus/client_golang/prometheus/promhttp
- Node `prom-client` README - https://github.com/siimon/prom-client
- Rancher chart values used to confirm dashboard namespace and additional scrape config support - https://github.com/rancher/charts/blob/dev-v2.14/charts/rancher-monitoring/106.0.1+up66.7.1-rancher.10/values.yaml
- Rancher chart Prometheus service template used to confirm the default Prometheus service name pattern - https://github.com/rancher/charts/blob/dev-v2.14/charts/rancher-monitoring/106.0.1+up66.7.1-rancher.10/templates/prometheus/service.yaml

## Issues Found
- The original Go, Python, and Node.js snippets exposed metrics endpoints but did not actually record request count or latency metrics, so the later PromQL, alert, and dashboard examples would not work as described. I updated all three examples to serve application traffic on `:8080`, expose metrics on `:9090`, and record the counter, histogram, and gauge values used later in the post.
- The Python snippet defined `active_users`, while the alerting example referenced `active_connections`. I standardized the Python example on `active_connections` so the metric name matches the rest of the post.
- The `NoActiveConnections` alert evaluated `active_connections{job="my-app"} == 0`, which would fire whenever any one replica had zero active connections. I changed it to `sum(active_connections{job="my-app"}) == 0` so it evaluates the workload as a whole.
- The Grafana dashboard ConfigMap was placed in `cattle-monitoring-system`, but Rancher Monitoring watches `grafana_dashboard` ConfigMaps in `cattle-dashboards` by default. I changed the namespace to `cattle-dashboards`.
- The Grafana dashboard example used a `grafana_folder` annotation, but Rancher’s default Grafana sidecar configuration does not enable a folder annotation by default. I removed the unsupported annotation.
- The annotation-based discovery example was written in Helm values format but described generically as Prometheus configuration. I clarified that the snippet belongs in the `rancher-monitoring` Helm values.
- The verification step queried a labeled counter without telling readers to generate traffic first. I added that instruction so the expected series exists before querying.

## Review Notes
- The `kubectl port-forward` example assumes the monitoring chart uses the default Helm release name `rancher-monitoring`. If the release name differs, the Prometheus service name will differ as well.
- The examples retain the `release: rancher-monitoring` label on `ServiceMonitor` and `PrometheusRule` resources for compatibility, although current Rancher Monitoring chart defaults use empty selectors and do not strictly require that label.
