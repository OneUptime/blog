# Validation Summary: How to Deploy Mimir with ArgoCD

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Grafana Mimir
- Grafana Mimir distributed Helm chart
- Argo CD Applications and sync options
- Kubernetes
- Prometheus remote write
- Prometheus Operator / kube-prometheus-stack
- Grafana Prometheus datasource configuration
- Amazon S3-compatible object storage

## Sources Consulted
- Grafana Mimir Helm chart documentation: https://grafana.com/docs/mimir/latest/set-up/helm-chart/
- Grafana Labs mimir-distributed Helm chart documentation: https://grafana.com/docs/helm-charts/mimir-distributed/latest/
- Grafana Mimir Helm chart production guidance: https://grafana.com/docs/helm-charts/mimir-distributed/latest/run-production-environment-with-helm/
- Grafana Mimir Helm chart configuration guidance: https://grafana.com/docs/helm-charts/mimir-distributed/latest/run-production-environment-with-helm/configuration-with-helm/
- Grafana Mimir runtime configuration documentation: https://grafana.com/docs/mimir/latest/configure/about-runtime-configuration
- Grafana Mimir configuration parameters reference: https://grafana.com/docs/mimir/latest/configure/configuration-parameters/
- Grafana Mimir rolling update documentation: https://grafana.com/docs/mimir/latest/manage/run-production-environment/perform-a-rolling-update/
- Grafana rollout-operator documentation: https://github.com/grafana/rollout-operator
- Grafana Mimir Helm chart v5.5.1 values and Chart.yaml: https://github.com/grafana/mimir/tree/mimir-distributed-5.5.1/operations/helm/charts/mimir-distributed
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Prometheus remote write tuning documentation: https://prometheus.io/docs/practices/remote_write/
- Prometheus configuration reference: https://prometheus.io/docs/prometheus/latest/configuration/configuration/

## Issues Found
- The external S3 example did not disable the bundled MinIO deployment. Added `mimir-distributed.minio.enabled: false`, matching Grafana's Helm chart production guidance for external object storage.
- The repository structure and runtime configuration section showed a standalone `runtime-config.yaml` ConfigMap, but the wrapper chart would not render or mount that file unless it lived under chart templates and was wired into Mimir. Replaced it with the chart-supported `mimir-distributed.runtimeConfig` value in `values-production.yaml`.
- The ingester rollout section said the rollout operator ensures data is flushed before pod termination. The rollout operator coordinates StatefulSet pod rollouts; Mimir's rolling update guidance is about limiting unavailable stateful replicas. Reworded this to avoid overstating the operator behavior.

## Review Notes
- The post pins `mimir-distributed` chart version `5.5.1`, which is valid but no longer the latest chart line as of this review. Future updates should account for the Helm chart 6.x migration and the chart's newer default ingest storage architecture.
