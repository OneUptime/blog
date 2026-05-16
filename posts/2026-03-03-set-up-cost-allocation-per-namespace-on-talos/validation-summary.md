# Validation Summary: How to Set Up Cost Allocation per Namespace on Talos

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (Kubernetes distribution)
- OpenCost (open-source Kubernetes cost monitoring)
- OpenCost Helm chart
- Prometheus / kube-prometheus-stack
- Prometheus Operator (`PrometheusRule` CRD)
- kube-state-metrics (`kube_pod_container_resource_requests`, `kube_persistentvolumeclaim_resource_requests_storage_bytes`)
- Grafana (dashboard JSON model)
- Kubernetes `ConfigMap`, `Namespace`, `CronJob` (`batch/v1`)
- Kyverno (`kyverno.io/v1` `ClusterPolicy`)
- kubectl / Helm CLI
- jq

## Sources Consulted
- OpenCost API documentation: https://opencost.io/docs/integrations/api/
- OpenCost API examples: https://opencost.io/docs/integrations/api-examples/
- OpenCost installation docs (port-forward): https://opencost.io/docs/installation/install/
- OpenCost Helm chart repo: https://github.com/opencost/opencost-helm-chart
- kube-state-metrics docs for pod and PVC metrics
- Kyverno `ClusterPolicy` schema and `validationFailureAction` (v1.10+ uses capitalized `Enforce`/`Audit`)
- Kubernetes API references for `ConfigMap`, `Namespace`, `CronJob` (`batch/v1`)

## Issues Found
1. **Wrong port in OpenCost API curl commands.** The post used `http://localhost:9090/allocation/compute…` and `http://opencost.opencost:9090/allocation/compute…`. The OpenCost UI is exposed on port 9090, but the OpenCost REST API (including `/allocation/compute`) is served on port **9003**. Fixed all three local `curl` commands and both in-cluster `curl` commands in the CronJob to use port 9003.
2. **Port-forward only exposed the UI port.** The verification step ran `kubectl port-forward -n opencost svc/opencost 9090:9090`, which would have made the subsequent API `curl` examples fail because the API is on 9003. Updated to forward both ports (`9090 9003`) so that the UI and the API examples both work as written.

## Review Notes
- The OpenCost Helm values shown (`opencost.prometheus.internal.serviceName`, `namespaceName`, `port`, `opencost.ui.enabled`, `opencost.exporter.defaultClusterId`, `opencost.exporter.resources`) match the current upstream chart structure.
- The custom-pricing `ConfigMap` field names (`provider`, `description`, `CPU`, `RAM`, `GPU`, `storage`, `zoneNetworkEgress`, `regionNetworkEgress`, `internetNetworkEgress`) match OpenCost's custom pricing config schema.
- The kube-state-metrics metric names used (`kube_pod_container_resource_requests` with the `resource` label and `kube_persistentvolumeclaim_resource_requests_storage_bytes`) are correct for current kube-state-metrics releases.
- The Kyverno policy uses `validationFailureAction: Enforce` (capitalized), which is correct for Kyverno v1.10+; on older releases this would need to be lowercase `enforce`.
- The Kyverno `exclude.any.resources.names: [kube-*, default]` syntax does support wildcards, so this works as intended.
- The Grafana dashboard JSON is a minimal sketch — it omits `datasource`, `id`/`uid`, `schemaVersion`, and other fields that a real exported dashboard would include, but the panel `type` values (`barchart`, `stat`, `piechart`) and PromQL expressions are valid.
- Pricing values (e.g. CPU at $0.031/core/hr) are illustrative; the post correctly tells readers to calculate their own.
