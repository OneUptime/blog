# Validation Summary: How to Build Cost Optimization Dashboards That Track K8s Resource Efficiency

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- Helm
- kube-prometheus-stack
- Prometheus and PromQL
- Prometheus Operator PrometheusRule CRD
- kube-state-metrics
- node-exporter
- Grafana dashboards and reporting
- Python
- Kubernetes CronJob

## Sources Consulted
- kube-prometheus-stack Helm chart values: https://github.com/prometheus-community/helm-charts/blob/main/charts/kube-prometheus-stack/values.yaml
- Grafana Helm chart values: https://github.com/grafana-community/helm-charts/blob/main/charts/grafana/values.yaml
- Grafana Helm installation documentation: https://grafana.com/docs/grafana/latest/installation/helm/
- Grafana dashboard provisioning documentation: https://grafana.com/docs/grafana/latest/administration/provisioning/#dashboards
- Grafana reporting documentation: https://grafana.com/docs/grafana/latest/dashboards/create-reports/
- Prometheus querying basics and subquery syntax: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus operators documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus Operator API reference for PrometheusRule and rule selection: https://prometheus-operator.dev/docs/api-reference/api/
- kube-state-metrics pod metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/

## Issues Found
- The kube-prometheus-stack values file included an empty `additionalScrapeConfigs` field under `prometheus.prometheusSpec` with a comment about recording rules. That value configures additional scrape jobs, not recording rules, so it was removed.
- The Grafana dashboard JSON used the HTTP API wrapper shape with a top-level `dashboard` key, but the post saves it into a ConfigMap for dashboard provisioning. Provisioned dashboards should contain the dashboard model itself, so the JSON was changed to a direct dashboard object.
- The Grafana dashboard used legacy `graph` panels, old `yaxes` settings, and a legacy dashboard alert shape. These were updated to current `timeseries` panels with `fieldConfig`, and the legacy alert block was removed.
- The utilization trend PromQL example placed `by (namespace)` after `avg_over_time(...)`, which is invalid PromQL syntax. It was changed to aggregate with `avg by (namespace) (...)`.
- The reporting section implied Grafana reporting was generally available through the shown API call. Grafana reporting is an Enterprise/Grafana Cloud feature with SMTP and rendering requirements, so the section now states those constraints and avoids a misleading OSS API example.
- The Python report script used the third-party `requests` package while the CronJob image was `python:3.11-slim`, which does not include `requests` by default. The script now uses Python standard library HTTP APIs.
- The Python report script pointed at `prometheus-server.monitoring.svc:9090`, which is not the service created by kube-prometheus-stack in this installation. It now uses `prometheus-operated.monitoring.svc:9090`, matching the service used earlier for port-forwarding.
- The CronJob referenced a `cost-report-script` ConfigMap that was never created. Added the `kubectl create configmap` command before the CronJob manifest.
- The optimization impact PromQL example used a date picker variable and arithmetic inside the `@` modifier. PromQL's `@` modifier expects a timestamp, so the example now uses a Unix timestamp variable and a duration offset.

## Review Notes
The resource request metrics shown are valid kube-state-metrics metrics, but kube-state-metrics notes that scheduler-exposed `kube_pod_resource_request` metrics are more precise where available. The estimated cost formulas remain approximate and should be calibrated against actual cloud pricing or a cost allocation system.
