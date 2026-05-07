# Validation Summary: How to Configure Prometheus in Rancher

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rancher
- Rancher Monitoring
- Kubernetes
- Prometheus
- Prometheus Operator
- Helm chart values
- `kubectl`

## Sources Consulted
- Rancher docs: How Monitoring Works — https://ranchermanager.docs.rancher.com/integrations-in-rancher/monitoring-and-alerting/how-monitoring-works
- Rancher docs: Monitoring Configuration Guides — https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/monitoring-v2-configuration-guides
- Rancher docs: Prometheus Configuration — https://ranchermanager.docs.rancher.com/v2.14/how-to-guides/advanced-user-guides/monitoring-v2-configuration-guides/advanced-configuration/prometheus
- Rancher official chart values: `rancher-monitoring` — https://raw.githubusercontent.com/rancher/charts/dev-v2.14/charts/rancher-monitoring/109.0.1%2Bup80.9.1-rancher.8/values.yaml
- Rancher official chart template: Prometheus resource — https://github.com/rancher/charts/blob/dev-v2.14/charts/rancher-monitoring/109.0.1%2Bup80.9.1-rancher.8/templates/prometheus/prometheus.yaml
- Rancher official chart template: Prometheus service — https://github.com/rancher/charts/blob/dev-v2.14/charts/rancher-monitoring/109.0.1%2Bup80.9.1-rancher.8/templates/prometheus/service.yaml
- Rancher official chart template: Alertmanager service — https://github.com/rancher/charts/blob/dev-v2.14/charts/rancher-monitoring/109.0.1%2Bup80.9.1-rancher.8/templates/alertmanager/service.yaml
- Prometheus Operator API reference — https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus docs: Storage — https://prometheus.io/docs/prometheus/latest/storage/
- Prometheus docs: HTTP API — https://prometheus.io/docs/prometheus/latest/querying/api/
- Kubernetes docs: `kubectl create secret generic` — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/

## Issues Found
1. The post incorrectly referred to the namespaced `Prometheus` object as a CRD. In Rancher and Prometheus Operator terminology, the CRD defines the resource type, while the object in `cattle-monitoring-system` is the Prometheus custom resource. I corrected that sentence.
2. The verification step used the Prometheus UI path `/config`, which is less precise than the documented status API. I replaced it with `curl http://localhost:9090/api/v1/status/config`, which matches the official Prometheus HTTP API for retrieving the active configuration.
3. The apply step said Prometheus would always restart after an upgrade. Rancher Monitoring is reconciled by the Prometheus Operator, and whether pods roll depends on which settings changed. I updated the wording to describe operator reconciliation and note that some changes trigger a rolling restart.

## Review Notes
- The Helm values shown for `retention`, `retentionSize`, `storageSpec`, `scrapeInterval`, `evaluationInterval`, `externalLabels`, `remoteWrite`, `additionalScrapeConfigs`, `alertingEndpoints`, `query`, and `walCompression` are valid in the current Rancher `rancher-monitoring` chart series.
- `walCompression: true` is already the default in the current chart, so that example is valid but not strictly a change from the default behavior.
- The post assumes the default Rancher Monitoring namespace `cattle-monitoring-system`. That is correct for the default installation path, but Rancher also allows overriding the namespace in the chart values.
