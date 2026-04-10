# Validation Summary: How to Configure CSI Read Affinity in Rook-Ceph

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph (distributed storage system)
- Ceph CSI driver (Container Storage Interface for RBD and CephFS)
- Kubernetes (ConfigMaps, DaemonSets, CRDs, node labels)
- CRUSH map topology

## Sources Consulted
- Rook CSI drivers documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Ceph-CSI/ceph-csi-drivers/
- Rook v1.11.0 release notes: https://github.com/rook/rook/releases/tag/v1.11.0
- Rook v1.10 CSI documentation (verified absence of read affinity): https://rook.io/docs/rook/v1.10/Storage-Configuration/Ceph-CSI/ceph-csi-drivers/
- Rook v1.14 upgrade notes (CSI_ENABLE_READ_AFFINITY removal): https://rook.io/docs/rook/v1.14/Upgrade/rook-upgrade/
- rbd(8) manpage: https://manpages.debian.org/unstable/ceph-common/rbd.8.en.html
- Ceph erasure code documentation: https://docs.ceph.com/en/latest/rados/operations/erasure-code/
- Rook GitHub issue #7987 (operator overwrites ConfigMap): https://github.com/rook/rook/issues/7987
- Rook advanced configuration docs: https://rook.io/docs/rook/v1.12/Storage-Configuration/Advanced/ceph-configuration/

## Issues Found

1. **Incorrect Rook version requirement**: The post stated "Rook-Ceph v1.10 or later." CSI read affinity was introduced in Rook v1.11 (which shipped with ceph-csi v3.8). Changed to "Rook-Ceph v1.11 or later."

2. **Missing Linux kernel requirement**: The post omitted the critical prerequisite that Linux kernel 5.8 or higher is required on all nodes for the `read_from_replica` and `crush_location` kernel RBD options. Added this to prerequisites.

3. **Incorrect configuration method**: The post instructed users to manually edit the `rook-ceph-csi-config` ConfigMap. This ConfigMap is managed by the Rook operator, which will overwrite manual edits during reconciliation. The correct approach is to configure read affinity through the `CephCluster` custom resource at `spec.csi.readAffinity`. Rewrote the configuration section to use the CephCluster CR with both `kubectl apply` and `kubectl patch` examples.

4. **Incorrect erasure-coded pool claim**: The post stated "For erasure-coded pools, read affinity applies to the primary shard only." This is incorrect — read affinity (`read_from_replica`) does not apply to erasure-coded pools at all, as EC pools require reading from multiple OSDs to reconstruct data. Fixed the statement.

5. **Incorrect restart instructions**: Since the correct configuration method is via the CephCluster CR, the Rook operator handles reconciliation automatically. Changed from manually rolling CSI DaemonSets to restarting the operator pod if needed.

6. **Summary section reference**: Updated the summary to reference the `CephCluster` CR instead of the `rook-ceph-csi-config` ConfigMap.

## Review Notes
- The `crushLocationLabels` explanation and CRUSH key mapping table are accurate and well-explained.
- The DaemonSet names `csi-rbdplugin` and `csi-cephfsplugin` are correct.
- The verification approach (checking CSI plugin logs for affinity messages) is valid.
- In Rook v1.13+, `spec.csi.readAffinity` on the CephCluster CR is the canonical configuration path. Earlier versions (v1.11-v1.12) used the `CSI_ENABLE_READ_AFFINITY` key in the `rook-ceph-operator-config` ConfigMap. The post's audience likely targets newer Rook versions, so the CephCluster CR approach is appropriate.
