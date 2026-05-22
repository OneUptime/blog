# Validation Summary: How to Deploy Monitoring Stack on Kubernetes with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Kubernetes
- Helm
- kube-prometheus-stack
- Prometheus
- Prometheus Operator ServiceMonitor and PrometheusRule CRDs
- Grafana
- Alertmanager
- Loki
- Promtail
- AWS S3 storage for Loki

## Sources Consulted
- Terraform Helm provider `helm_release` resource documentation: https://registry.terraform.io/providers/hashicorp/helm/latest/docs/resources/release
- Terraform language documentation for object expressions and `yamlencode`: https://developer.hashicorp.com/terraform/language/expressions/types and https://developer.hashicorp.com/terraform/language/functions/yamlencode
- kube-prometheus-stack chart 55.5.0 values and dependencies: https://github.com/prometheus-community/helm-charts/tree/kube-prometheus-stack-55.5.0/charts/kube-prometheus-stack
- prometheus-node-exporter chart values used by kube-prometheus-stack 55.5.0: https://github.com/prometheus-community/helm-charts/tree/prometheus-node-exporter-4.24.0/charts/prometheus-node-exporter
- Grafana Loki Helm chart 5.41.0 values: https://github.com/grafana/loki/tree/helm-loki-5.41.0/production/helm/loki
- Grafana Loki retention documentation: https://grafana.com/docs/loki/latest/operations/storage/retention/
- Grafana Loki storage configuration documentation: https://grafana.com/docs/loki/latest/configure/storage/
- Grafana Promtail Helm chart documentation: https://github.com/grafana/helm-charts/tree/main/charts/promtail
- Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/
- Prometheus Operator API reference for ServiceMonitor and PrometheusRule: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus query language documentation: https://prometheus.io/docs/prometheus/latest/querying/basics/

## Issues Found
- The Alertmanager child route used the deprecated `match` field. Changed it to `matchers` so the example follows current Alertmanager configuration guidance.
- The PagerDuty receiver used `service_key`, which is for PagerDuty's Prometheus integration type. Changed it to `routing_key` to align the example with PagerDuty Events API v2 integrations documented by Alertmanager.
- The Loki chart 5.41.0 snippet used an unsupported `deploymentMode` value and placed `bucketnames` under `loki.storage.s3`. Removed `deploymentMode` for this chart version and changed the storage configuration to the supported `loki.storage.bucketNames` structure.
- The Loki example set two write replicas while the chart default replication factor is three. Added `commonConfig.replication_factor = 2` so the sample deployment is internally consistent.
- The Loki retention example set only `limits_config.retention_period`. Added `loki.compactor.retention_enabled`, `working_directory`, and `delete_request_store` so the retention period can actually be enforced by Loki.
- The high-memory PromQL alert could divide by zero for containers without memory limits. Updated the expression to match on `namespace`, `pod`, and `container`, and to filter out zero memory limits.
- The kube-prometheus-stack customization used unquoted Terraform object keys with hyphens and the wrong node exporter subchart key. Quoted `"kube-state-metrics"` and `"prometheus-node-exporter"` and added the parent enable switches used by kube-prometheus-stack dependencies.

## Review Notes
- The examples assume supporting variables, providers, credentials, storage classes, ingress controller, cert-manager issuer, and object storage buckets already exist.
- The Loki chart version in the post is older than current releases, but the corrected values are accurate for the pinned 5.41.0 chart.
