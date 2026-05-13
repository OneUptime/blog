# Validation Summary: How to Deploy VictoriaMetrics Single Node with Flux CD

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Flux CD HelmRepository, HelmRelease, and Kustomization resources
- Kubernetes
- VictoriaMetrics single-node
- VictoriaMetrics Agent
- Prometheus remote write and Prometheus Operator/kube-prometheus-stack values
- Grafana data source provisioning

## Sources Consulted
- Flux HelmRelease v2 API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization v1 API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- VictoriaMetrics Single Helm chart documentation: https://docs.victoriametrics.com/helm/victoriametrics-single/
- VictoriaMetrics Agent Helm chart documentation: https://docs.victoriametrics.com/helm/victoriametrics-agent/
- VictoriaMetrics Prometheus remote write integration: https://docs.victoriametrics.com/data-ingestion/prometheus/
- VictoriaMetrics Grafana integration documentation: https://docs.victoriametrics.com/victoriametrics/integrations/grafana/
- VictoriaMetrics capacity planning and operational metrics documentation: https://docs.victoriametrics.com/victoriametrics/
- Prometheus Operator API reference for RemoteWriteSpec and QueueConfig: https://prometheus-operator.dev/docs/api-reference/api/
- kube-prometheus-stack values: https://github.com/prometheus-community/helm-charts/blob/main/charts/kube-prometheus-stack/values.yaml
- Grafana Prometheus data source provisioning documentation: https://grafana.com/docs/grafana/latest/datasources/prometheus/configure/

## Issues Found
- The VictoriaMetrics single Helm values used `server.persistentVolume.storageClass`, but the current chart uses `server.persistentVolume.storageClassName`. Updated the key so the PVC storage class is applied.
- The VictoriaMetrics single ingress host used `path: /`, but the chart expects `path` as a list of paths. Updated it to `path: ["/"]` in block YAML form.
- The sample set `server.extraArgs.snapshotCreateURL`, which is not a VictoriaMetrics single-node server flag or chart value. Removed it; snapshot creation is available through the `/snapshot/create` endpoint without that server flag.
- The sample set `server.serviceMonitor.namespace`, which is not part of the current `victoria-metrics-single` chart values. Removed the unsupported key.
- The sample included `vmagent.enabled` under the `victoria-metrics-single` chart values, but vmagent is deployed by the separate `victoria-metrics-agent` chart in the following step. Removed the unsupported value.
- The VMAgent HelmRelease used the deprecated `remoteWriteUrls` value. Updated it to the current `remoteWrite` list with `url` entries.
- The Grafana data source snippet used `queryType: range` and described it as enabling MetricsQL functions. Grafana's Prometheus provisioning docs do not use that field for MetricsQL; VictoriaMetrics supports MetricsQL through the Prometheus-compatible endpoint. Replaced it with supported Prometheus data source settings.
- The verification command labeled `/api/v1/status/active_queries` as storage usage. That endpoint lists active queries. Updated the command to inspect the `vm_data_size_bytes` metric from `/metrics`.

## Review Notes
The Flux API versions, VictoriaMetrics remote write endpoint, Prometheus Operator remoteWrite/queueConfig field names, and Grafana Prometheus-compatible data source approach are current. The chart version range remains broad; pinning an exact tested chart version would improve reproducibility in the future.
