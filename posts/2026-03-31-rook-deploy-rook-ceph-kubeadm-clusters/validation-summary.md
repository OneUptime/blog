# Validation Summary: How to Deploy Rook-Ceph on Kubeadm Clusters

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (v1.13.0)
- Ceph (v18.2.0 / Reef)
- Kubernetes (kubeadm-bootstrapped clusters)
- Helm
- Ceph CSI drivers (RBD, CephFS)
- Prometheus monitoring

## Sources Consulted
- Rook Helm chart values.yaml for v1.13.0: https://github.com/rook/rook/blob/v1.13.0/deploy/charts/rook-ceph/values.yaml
- Rook monitoring examples directory (master branch): https://github.com/rook/rook/tree/master/deploy/examples/monitoring
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest-release/CRDs/Cluster/ceph-cluster-crd/
- Ceph Reef (v18) release notes: https://docs.ceph.com/en/reef/

## Issues Found
1. **Incorrect Prometheus rules filename in Step 6 (Monitoring)**
   - **What was wrong:** The post referenced `prometheus-ceph-v15-rules.yaml`, which no longer exists in the Rook repository. The version-specific Prometheus rule files were removed and consolidated years before Rook v1.13.
   - **What was changed:** Replaced `prometheus-ceph-v15-rules.yaml` with `localrules.yaml`, which is the current consolidated Prometheus rules file in the Rook repository's monitoring examples.
   - **Why:** The old file returns a 404. The Rook project consolidated all version-specific rule files into `localrules.yaml` (for Ceph cluster alerting rules) and `externalrules.yaml` (for PVC usage alerts).

## Review Notes
- The Helm chart values `csi.enableRbdDriver` and `csi.enableCephfsDriver` both default to `true` in Rook v1.13, so setting them explicitly is redundant but not incorrect — it serves as documentation of intent.
- All raw GitHub URLs reference the `master` branch. Since the Rook operator is pinned to v1.13.0, readers should be aware that `master` branch example manifests may drift from what's compatible with v1.13.0 over time. Pinning URLs to a release tag (e.g., `v1.13.0`) would be more resilient, but this is a best-practice suggestion, not an error.
- The monitoring section could additionally reference `externalrules.yaml` for PVC usage alerting, but its omission is not an error.
- Rook v1.13.0 is a valid but not the latest release. The guide remains technically correct for v1.13.x deployments.
