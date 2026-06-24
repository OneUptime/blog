# Validation Summary: How to Use Rook-Ceph with Helm Chart Deployments

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Rook-Ceph Helm charts: `rook-ceph` (operator) and `rook-ceph-cluster` (cluster), v1.15.0 / v1.16.0
- Helm 3 (repo add/update, install, upgrade, search)
- CephCluster / CephBlockPool / CephObjectStore via chart values
- Kustomize helmCharts inflation generator (GitOps)

## Sources Consulted
- Rook Ceph Cluster Helm Chart docs — https://rook.io/docs/rook/latest-release/Helm-Charts/ceph-cluster-chart/ (operatorNamespace, cephClusterSpec, cephBlockPools[].name/.spec.replicated.size/.storageClass.{enabled,name,isDefault,reclaimPolicy,parameters}, cephObjectStores[].name/.spec.gateway.instances/.storageClass.{enabled,name})
- Rook Ceph Operator Helm Chart docs / Helm Charts Overview — https://rook.io/docs/rook/latest-release/Helm-Charts/operator-chart/ and https://rook.io/docs/rook/latest-release/Helm-Charts/helm-charts/ (repo `https://charts.rook.io/release`, chart names rook-ceph / rook-ceph-cluster)
- Rook chart values.yaml (master) — https://github.com/rook/rook/blob/master/deploy/charts/rook-ceph-cluster/values.yaml (cephClusterSpec keys: dataDirHostPath, mon.count, mon.allowMultiplePerNode, storage.useAllNodes/useAllDevices, resources.mgr)

## Issues Found
- None — code examples, commands, and technical claims were verified against the sources above and are accurate.

## Review Notes
- Helm repo URL `https://charts.rook.io/release` and chart names `rook-release/rook-ceph` and `rook-release/rook-ceph-cluster` are correct.
- Chart versions v1.15.0 (install) and v1.16.0 (upgrade) are real published Rook releases; `--create-namespace`, `--namespace`, `--set operatorNamespace=rook-ceph`, `-f values.yaml`, and `helm search repo ... --versions` usage is valid.
- The `cephClusterSpec` keys used (dataDirHostPath, mon.count, mon.allowMultiplePerNode, storage.useAllNodes/useAllDevices, resources.mgr.requests) match the CephCluster spec embedded in the chart values.
- `cephBlockPools` entry structure (name, spec.replicated.size, storageClass.enabled/name/isDefault/reclaimPolicy) and `cephObjectStores` entry structure (name, spec.gateway.instances, storageClass.enabled/name) match the documented chart value schema.
- The Kustomize `helmCharts` generator fields (name, repo, version, releaseName, namespace, valuesFile) are valid kustomize HelmChartInflationGenerator keys.
- Minor non-error left as-is: the cluster chart is shown installed twice (once with `--set`, once with `-f values.yaml`); these are presented as alternative illustrations rather than sequential commands, so no change was made.
