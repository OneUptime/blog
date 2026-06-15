# Validation Summary: How to Set Up Prometheus Monitoring for Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Prometheus
- Prometheus Operator
- kube-prometheus-stack Helm chart
- kube-state-metrics
- node_exporter
- Alertmanager
- Grafana
- PromQL
- Helm
- kubectl

## Sources Consulted
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus configuration documentation, including Kubernetes service discovery and relabeling: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/
- Prometheus Operator ServiceMonitor user guide: https://github.com/prometheus-operator/prometheus-operator/blob/main/Documentation/user-guides/running-exporters.md
- kube-prometheus-stack Helm chart values and chart metadata: https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack

## Issues Found
- The additional scrape configuration was shown as a standalone Kubernetes Secret, but kube-prometheus-stack does not use that Secret unless it is referenced by Helm values or the Prometheus spec. Changed the example to use `prometheus.prometheusSpec.additionalScrapeConfigs` in a Helm values file and added the matching `helm upgrade` command.
- The install command configured Prometheus persistent storage with only a storage request. Added `ReadWriteOnce` to the PVC template access modes and used `--reuse-values` on the later scrape-config upgrade so the previously configured Helm values are preserved.
- The pod scrape annotation used `prometheus.io/port: "8080"` while the Deployment and Service examples exposed metrics on port `9090`. Updated the annotation to `9090`.
- The high-memory alert divided by `container_spec_memory_limit_bytes` without filtering out containers with no configured memory limit. Added container filters and a `container_spec_memory_limit_bytes > 0` guard to avoid false alerts for unlimited containers.
- The Alertmanager route examples used deprecated `match` and `match_re` keys. Updated them to the current `matchers` syntax.

## Review Notes
- The examples are generally accurate for modern kube-prometheus-stack and Prometheus Operator usage. The Alertmanager Secret example is valid for the operator's default `configSecret` behavior, but chart-managed deployments usually keep this configuration in Helm values so upgrades do not overwrite manual changes.
