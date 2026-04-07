# Validation Summary: How to Upgrade Rook-Ceph with Zero Downtime

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- Rook (Kubernetes Ceph operator)
- Ceph (distributed storage system)
- Kubernetes (kubectl, Helm, pod management)
- Helm (chart-based operator upgrades)

## Sources Consulted
- Rook official upgrade documentation: https://rook.io/docs/rook/latest/Upgrade/rook-upgrade/
- Ceph official documentation for `ceph versions`, `ceph osd set noscrub/nodeep-scrub`: https://docs.ceph.com/en/reef/
- Rook GitHub repository for manifest paths: https://github.com/rook/rook/tree/master/deploy/examples
- Rook Helm chart repository: https://charts.rook.io/release
- Ceph container image registry: https://quay.io/repository/ceph/ceph

## Issues Found
No technical issues found.

- The upgrade order (MON -> MGR -> OSD -> MDS -> RGW) is correct per Rook documentation.
- All `kubectl exec` commands targeting `deploy/rook-ceph-tools` use correct syntax.
- Ceph CLI commands (`ceph status`, `ceph health detail`, `ceph osd stat`, `ceph pg stat`, `ceph version`, `ceph versions`, `ceph osd set/unset noscrub/nodeep-scrub`) are all valid.
- The Helm upgrade commands including `--reuse-values` and `--version` flags are correct.
- The raw GitHub URL for the operator manifest follows Rook's repository structure.
- The CephCluster CR uses the correct API version (`ceph.rook.io/v1`) and valid spec fields (`cephVersion.image`, `allowUnsupported`).
- `quay.io/ceph/ceph:v18.2.4` is a valid Ceph Reef image tag.
- Pod label selectors (`app=rook-ceph-mon`, `app=rook-ceph-mgr`, `app=rook-ceph-osd`) are correct for Rook-managed pods.

## Review Notes
- The post uses Rook v1.14.0 and Ceph Reef v18.2.4 as examples. Readers should check for the latest stable versions before upgrading.
- The post correctly notes that the Rook operator must be upgraded before updating the Ceph image version, and that these are two separate steps.
- The recommendation to disable scrub/deep-scrub during OSD rolling updates is a well-known best practice to reduce I/O overhead during upgrades.
- One minor consideration: the post does not mention checking the Rook upgrade compatibility matrix (which Rook versions support which Ceph versions), but this is a nice-to-have rather than an error.
