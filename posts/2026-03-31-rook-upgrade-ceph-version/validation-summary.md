# Validation Summary: How to Upgrade the Ceph Version in Rook

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage system)
- Kubernetes (container orchestration)
- kubectl CLI

## Sources Consulted
- Rook official upgrade documentation: https://rook.io/docs/rook/latest/Upgrade/rook-upgrade/
- Rook CephCluster CRD reference: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Ceph official documentation on upgrade procedures: https://docs.ceph.com/en/latest/rados/operations/health-checks/
- Quay.io Ceph container image tags: https://quay.io/repository/ceph/ceph?tab=tags

## Issues Found
1. **Incorrect explanation of `ceph osd set noout` during upgrades**: The post originally stated that setting the `noout` flag would "force the cluster health check to allow the upgrade to proceed on HEALTH_WARN." This is incorrect. The `noout` flag prevents OSDs from being marked out during rolling restarts (a maintenance best practice), but does not bypass Rook's upgrade health checks. Fixed by correcting the description of `noout` and adding the correct approach: using `continueUpgradeAfterChecksEvenIfNotHealthy: true` in the CephCluster spec to allow upgrades to proceed despite health warnings.

## Review Notes
- The upgrade order (MONs, MGRs, OSDs, MDSs, RGWs) is accurate per Rook's implementation.
- All kubectl and ceph CLI commands are syntactically correct.
- The CephCluster YAML spec is accurate for the `ceph.rook.io/v1` API version.
- The compatibility matrix link points to the quickstart page rather than the dedicated upgrade page; the upgrade docs at `https://rook.io/docs/rook/latest/Upgrade/rook-upgrade/` would be a more direct reference, but the quickstart page does include version compatibility information.
- The post correctly advises against skipping major Ceph versions and using specific image tags rather than `latest`.
