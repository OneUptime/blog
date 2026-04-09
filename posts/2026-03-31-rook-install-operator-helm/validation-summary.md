# Validation Summary: How to Install the Rook Operator on Kubernetes Using Helm

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (cloud-native storage orchestrator)
- Ceph (distributed storage system)
- Kubernetes
- Helm 3.x
- kubectl

## Sources Consulted
- Rook Operator Helm Chart documentation: https://rook.io/docs/rook/latest-release/Helm-Charts/operator-chart/
- Rook v1.14 Prerequisites: https://rook.io/docs/rook/v1.14/Getting-Started/Prerequisites/prerequisites/
- Rook v1.14 CRD Specification: https://rook.io/docs/rook/v1.14/CRDs/specification/
- Rook v1.14.0 values.yaml: https://github.com/rook/rook/blob/v1.14.0/deploy/charts/rook-ceph/values.yaml
- Rook GitHub Releases: https://github.com/rook/rook/releases
- Rook Cluster Teardown guide: https://rook.io/docs/rook/latest-release/Getting-Started/ceph-teardown/
- Kubernetes kubectl version changelog (--short flag removal in 1.28)

## Issues Found
1. **Incorrect Kubernetes version requirement**: The post stated "Kubernetes 1.22 or later" but Rook v1.14.0 requires Kubernetes v1.25 or later. Fixed to "Kubernetes 1.25 or later".

2. **Deprecated `kubectl version --short` flag**: The `--short` flag was removed in Kubernetes 1.28. Since Rook v1.14 requires K8s 1.25+, users on K8s 1.28+ would get an error. Changed `kubectl version --short` to `kubectl version`.

3. **Incomplete CRD list**: The post listed 15 CRDs but Rook v1.14 ships 17. Added the two missing CRDs: `cephcosidrivers.ceph.rook.io` (CephCOSIDriver) and `cephnfs.ceph.rook.io` (CephNFS).

## Review Notes
- The Rook versions referenced (v1.14.0 for install, v1.15.0 for upgrade) are real releases but are outdated. The latest stable Rook release is v1.19.x. The commands and procedures are still valid for v1.14, but readers may want to use a newer version.
- The uninstall procedure is simplified compared to the full official teardown guide. The official docs recommend first deleting all applications and PVCs consuming Rook storage, deleting other Ceph CRs (CephBlockPool, CephFilesystem, etc.), and optionally setting a `cleanupPolicy` before deleting the CephCluster. The post's simplified procedure is acceptable for a quick guide but could lead to hung volumes in production.
- The custom values example uses `resources.requests.cpu: 100m` which differs from the chart default of `200m`. This is a valid customization but is not called out as a change from the default.
- The Helm repo URL (`https://charts.rook.io/release`), chart name (`rook-ceph`), namespace convention, and all Helm commands are correct.
- The mermaid diagram accurately represents the operator's relationship to CRDs and Ceph daemon pods.
