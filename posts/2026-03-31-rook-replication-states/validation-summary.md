# Validation Summary: How to Manage Replication States (Primary, Secondary, Resync) in Rook

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook
- Ceph (RBD mirroring)
- Kubernetes
- Volume Replication Operator (VRO) / CSI Addons
- VolumeReplication CRD (`replication.storage.openshift.io/v1alpha1`)

## Sources Consulted
- Rook documentation on RBD mirroring: https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/rbd-mirroring/
- CSI Addons Volume Replication documentation: https://github.com/csi-addons/kubernetes-csi-addons
- Ceph RBD mirror CLI reference: https://docs.ceph.com/en/latest/rbd/rbd-mirroring/
- Kubernetes VolumeReplication CRD spec from CSI Addons project

## Issues Found
No technical issues found.

## Review Notes
- The API group `replication.storage.openshift.io/v1alpha1` is correct for the VolumeReplication CRD from the CSI Addons project. Despite the `openshift.io` domain, this CRD works on any Kubernetes cluster with the Volume Replication Operator installed.
- The three replication states (`primary`, `secondary`, `resync`) and their descriptions are accurate.
- RBD mirror CLI commands (`rbd mirror image status/demote/promote/resync`) are all valid Ceph commands with correct syntax.
- The expected mirror states (`up+stopped` for primary, `up+replaying` for secondary) are correct.
- The automation script correctly uses capitalized state values (e.g., `"Primary"`) when checking `.status.state`, which matches the VolumeReplication status reporting format.
- The `resync` state description mentions "full resync" — in practice, whether the resync is full or incremental depends on journal availability, but in the failback scenario described (post-promotion), a full resync is the typical outcome, making this accurate in context.
- The operator namespace (`volume-replication-system`) and deployment name (`volume-replication-operator`) may vary by installation method but are reasonable defaults.
