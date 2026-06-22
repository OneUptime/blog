# Validation Summary: How to Set Up Prometheus and Grafana on Kubernetes from Scratch

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Helm
- Prometheus
- Prometheus Operator / kube-prometheus-stack
- Alertmanager
- Grafana
- kube-state-metrics
- node-exporter
- NGINX Ingress
- cert-manager

## Sources Consulted
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/
- kube-prometheus-stack values for chart v55.0.0: https://raw.githubusercontent.com/prometheus-community/helm-charts/kube-prometheus-stack-55.0.0/charts/kube-prometheus-stack/values.yaml
- Current kube-prometheus-stack values: https://raw.githubusercontent.com/prometheus-community/helm-charts/main/charts/kube-prometheus-stack/values.yaml
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Grafana provisioning documentation: https://grafana.com/docs/grafana/latest/administration/provisioning/
- Grafana Alertmanager data source documentation: https://grafana.com/docs/grafana/latest/datasources/alertmanager/

## Issues Found
- Alertmanager routes used the deprecated `match` field. Updated them to `matchers` to match current Alertmanager configuration guidance and avoid future UTF-8 matcher compatibility issues.
- The PagerDuty receiver used `service_key`, which is deprecated in Alertmanager configuration. Updated it to `routing_key`.
- The manual kubelet and cAdvisor scrape jobs used the Kubernetes service account CA but did not account for kubelet serving certificate name mismatches that commonly occur with node IP targets. Added `insecure_skip_verify: true`, matching the common Prometheus Kubernetes scrape pattern for kubelet HTTPS targets.
- The manual Grafana Deployment mounted `grafana-dashboards-provider` and `grafana-dashboards` ConfigMaps that the post never created. Removed those mounts and volumes so the shown manifest can start with only the included datasource ConfigMap.
- The annotated application Deployment omitted the required `.spec.selector` and matching pod template labels for an `apps/v1` Deployment. Added both fields.
- The ServiceMonitor comment said the `release: prometheus` label must match the Prometheus selector, but the provided Helm values set `serviceMonitorSelector: {}`. Adjusted the comment to clarify that the label is required only when keeping the chart's default selector.

## Review Notes
- The Helm example pins kube-prometheus-stack chart `55.0.0`, and the manual examples pin Prometheus `v2.48.0` and Grafana `10.2.0`. These are reproducible version pins but are not current as of this review date; future maintenance should consider updating the chart and image versions after testing the generated manifests.
- `helm` and `kubectl` were not installed in the review environment, so CLI behavior was checked against documentation and the YAML snippets were statically parsed instead of applied to a live cluster.
