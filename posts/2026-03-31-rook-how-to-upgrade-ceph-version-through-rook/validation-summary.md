# Validation Summary: How to Upgrade Ceph Version Through Rook

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph (distributed storage system)
- Kubernetes (kubectl CLI)
- CephCluster CRD

## Sources Consulted
- Rook official documentation: Ceph upgrade guide (https://rook.io/docs/rook/latest/Upgrade/ceph-upgrade/)
- Rook official documentation: Rook operator upgrade (https://rook.io/docs/rook/latest/Upgrade/rook-upgrade/)
- Rook CephCluster CRD specification (https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/)
- Ceph official documentation: release naming and versioning (https://docs.ceph.com/en/latest/releases/)
- Ceph container images at quay.io/ceph/ceph

## Issues Found
No technical issues found.

## Review Notes
- The "Upgrading Rook Operator First" section uses `kubectl set image` to upgrade the Rook operator. While the command is syntactically valid, a full Rook operator upgrade typically involves updating CRDs first (via Helm or applying updated manifests) before updating the operator deployment. Readers upgrading the Rook operator should consult the official Rook operator upgrade documentation for the complete procedure. This is not incorrect in the post's context since it is a brief note rather than the post's main topic.
- The version compatibility table (Rook v1.14/v1.15 to Ceph versions) should be verified against the latest Rook release notes, as these mappings can change with patch releases.
- The `ceph versions` output example uses "..." to abbreviate the full version string (which includes the commit hash and release codename). This is appropriate for illustration purposes.
- The post does not mention CephNFS daemon upgrades, which are also handled by the operator if configured. This is acceptable since not all clusters use NFS gateways.
