# Validation Summary: How to Deploy TiDB Operator with Flux CD - 2026-03-13

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Kubernetes
- HelmRelease and HelmRepository
- Flux Kustomization and GitRepository
- TiDB Operator
- TiDB, PD, TiKV, and TiFlash
- Prometheus and Grafana monitoring for TiDB

## Sources Consulted
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRepository guide: https://fluxcd.io/flux/guides/helmreleases/
- PingCAP TiDB Operator install documentation: https://docs.pingcap.com/tidb-in-kubernetes/stable/deploy-tidb-operator
- PingCAP TiDB cluster configuration documentation: https://docs.pingcap.com/tidb-in-kubernetes/stable/configure-a-tidb-cluster/
- PingCAP TiDB Operator v1.6.1 CRD manifests: https://github.com/pingcap/tidb-operator/tree/v1.6.1/manifests/crd/v1
- PingCAP TiDB Operator v1.6.1 Helm chart values: https://github.com/pingcap/tidb-operator/blob/v1.6.1/charts/tidb-operator/values.yaml
- TiDB v8.1 configuration reference: https://docs.pingcap.com/tidb/v8.1/tidb-configuration-file/
- PD v8.1 configuration reference: https://docs.pingcap.com/tidb/v8.1/pd-configuration-file/
- TiKV configuration reference: https://docs.pingcap.com/tidb/stable/tikv-configuration-file/
- TiFlash v8.1 configuration reference: https://docs.pingcap.com/tidb/v8.1/tiflash-configuration/
- TiDB monitoring on Kubernetes documentation: https://docs.pingcap.com/tidb-in-kubernetes/stable/monitor-a-tidb-cluster/

## Issues Found
- The post referenced a `tidb-operator-crds` Helm chart, but the official PingCAP chart index does not publish that chart. Replaced it with a Flux-managed CRD installation from the tagged PingCAP `tidb-operator` Git repository path `manifests/crd/v1`.
- The TiDB Operator chart version was shown as `"1.6.1"`, but the PingCAP Helm chart uses the version string `"v1.6.1"`. Updated the HelmRelease version.
- The TiDB Operator Helm values used top-level `resources`, which the chart ignores. Moved the controller resource settings under `controllerManager.resources`, matching the official chart values.
- The operator and cluster namespaces were required but not created by the examples. Added a namespace manifest for `tidb-admin` and `tidb-cluster`.
- The PD and TiKV specs used duplicate `requests` keys, so the storage request would overwrite CPU and memory requests in YAML parsers. Combined CPU, memory, and storage under a single `requests` map for each component.
- The TiDB service configured `mysqlNodePort: 0` while using `type: ClusterIP`. Removed the NodePort-only field from the ClusterIP service example.
- The Flux Kustomization depended on `tidb-operator` as though it were another Kustomization while also applying the operator and `TidbCluster` in one path. Split the flow into CRD, operator, and cluster Kustomizations so the `TidbCluster` is applied only after CRDs and the operator are ready.
- The Kustomization health check watched the underlying Deployment for a HelmRelease-managed operator. Updated it to health-check the HelmRelease, which Flux documents as the recommended pattern for Kustomizations containing HelmRelease resources.
- The optional TiFlash snippet included an undocumented `flash.overlap_threshold` setting. Removed that custom TiFlash config and kept the documented component and storage configuration.
- The monitoring best practice referenced `tidb-cluster.grafana` as a Helm chart value. Updated it to recommend creating a `TidbMonitor` CR, which is the documented TiDB Operator monitoring path.

## Review Notes
The examples assume `premium-ssd` exists as a StorageClass and that the `infrastructure/sources` path is already reconciled by Flux. The `location-labels` example is valid when Kubernetes nodes expose compatible topology labels.
