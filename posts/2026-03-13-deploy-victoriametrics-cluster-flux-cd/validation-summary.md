# Validation Summary: How to Deploy VictoriaMetrics Cluster with Flux CD

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- VictoriaMetrics Cluster
- VictoriaMetrics Helm chart
- Flux CD HelmRepository, HelmRelease, and Kustomization APIs
- Kubernetes Deployments, StatefulSets, Services, PersistentVolumeClaims, and pod anti-affinity
- Prometheus remote write and Prometheus Operator remoteWrite configuration
- Grafana datasource provisioning

## Sources Consulted
- VictoriaMetrics Cluster documentation: https://docs.victoriametrics.com/victoriametrics/cluster-victoriametrics/
- VictoriaMetrics high availability Kubernetes guide: https://docs.victoriametrics.com/guides/k8s-ha-monitoring-via-vm-cluster.html
- VictoriaMetrics Cluster Helm chart documentation: https://docs.victoriametrics.com/helm/victoria-metrics-cluster/
- VictoriaMetrics Helm chart values and templates: https://github.com/VictoriaMetrics/helm-charts/tree/master/charts/victoria-metrics-cluster
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux Kustomization API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Prometheus remote write configuration: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The introduction described all three VictoriaMetrics cluster components as stateless. vmstorage is stateful because it stores persistent time series data, so the wording now distinguishes vmstorage from stateless vminsert and vmselect.
- The post claimed full Prometheus API compatibility. VictoriaMetrics provides Prometheus-compatible write and query APIs, so the wording was narrowed to avoid overstating compatibility.
- The vminsert `maxLabelsPerTimeseries` comment incorrectly described an in-memory queue. It now correctly says the flag limits labels per time series.
- `vmstorage.retentionPeriod: "90"` would mean 90 months in the Helm chart because no unit defaults to months. It was changed to `90d` for the stated 90-day retention.
- The Helm values used `persistentVolume.storageClass`, but the VictoriaMetrics cluster chart expects `persistentVolume.storageClassName`. Both vmstorage and vmselect examples were corrected.
- Replication was configured only on vminsert. VictoriaMetrics documentation also recommends setting `replicationFactor` on vmselect so it can correctly decide whether responses should be partial. The vmselect configuration now includes `replicationFactor: "2"`.
- The deduplication value for replicated data was set to `30s`. VictoriaMetrics recommends `dedup.minScrapeInterval=1ms` for application-level replication, with scrape interval values reserved for duplicate samples from identically configured Prometheus or vmagent instances. The vmselect and vmstorage examples and best-practice text were corrected.
- The vmstorage replica comment only said replicas must be greater than or equal to the replication factor. VictoriaMetrics documents that a cluster needs at least `2*N-1` vmstorage nodes to maintain replication factor when `N-1` nodes are unavailable, so the comment now reflects that.
- The best-practice claim that vmstorage nodes cannot be easily scaled horizontally was too broad. VictoriaMetrics can add vmstorage nodes, but historical data is not automatically rebalanced. The wording now reflects that behavior.

## Review Notes
The Flux API versions and Prometheus Operator-style camelCase `remoteWrite.queueConfig` fields are current. The verification commands are plausible, but they depend on the rendered Helm release names and on the local cluster having the Flux CLI and VictoriaMetrics pods available.
