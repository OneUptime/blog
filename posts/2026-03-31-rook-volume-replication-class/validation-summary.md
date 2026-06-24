# Validation Summary: How to Configure VolumeReplicationClass Scheduling Intervals in Rook

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Rook-Ceph (RBD mirroring, CephBlockPool CRD, ceph.rook.io/v1)
- CSI-Addons / VolumeReplicationClass + VolumeReplication (replication.storage.openshift.io/v1alpha1)
- kubernetes-csi-addons v0.14.0 (formerly the standalone volume-replication-operator)
- Ceph RBD snapshot-based mirroring (`rbd mirror image snapshot schedule`)

## Sources Consulted
- Rook RBD Mirroring docs — https://rook.io/docs/rook/latest-release/Storage-Configuration/Block-Storage-RBD/rbd-mirroring/ (schedulingInterval suffix formats m/h/d, schedulingStartTime ISO 8601, secret patch flow)
- Rook official example volume-replication-class.yaml — https://raw.githubusercontent.com/rook/rook/master/deploy/examples/volume-replication-class.yaml (provisioner `rook-ceph.rbd.csi.ceph.com`, parameters mirroringMode/schedulingInterval/schedulingStartTime and replication-secret-name/namespace)
- Rook official example volume-replication.yaml — https://raw.githubusercontent.com/rook/rook/master/deploy/examples/volume-replication.yaml (VolumeReplication spec: volumeReplicationClass, replicationState, dataSource apiGroup/kind/name)
- Rook CephBlockPool CRD docs — https://rook.io/docs/rook/latest-release/CRDs/Block-Storage/ceph-block-pool-crd/ (mirroring.enabled/mode, snapshotSchedules interval + startTime field names)
- csi-addons kubernetes-csi-addons VolumeReplicationClass docs v0.14.0 — https://github.com/csi-addons/kubernetes-csi-addons/blob/v0.14.0/docs/volumereplicationclass.md (apiVersion/kind, provisioner, parameters prefix, schedulingInterval)
- csi-addons kubernetes-csi-addons VolumeReplication docs v0.14.0 — https://github.com/csi-addons/kubernetes-csi-addons/blob/v0.14.0/docs/volumereplication.md (spec fields)
- volume-replication-operator repo README + CRD — https://github.com/csi-addons/volume-replication-operator (confirmed repository archived Dec 12, 2024; autoResync confirmed a valid boolean field in the VolumeReplication CRD)
- Rook Ceph CSI Drivers docs — https://rook.io/docs/rook/latest-release/Storage-Configuration/Ceph-CSI/ceph-csi-drivers/ (kubernetes-csi-addons install via crds.yaml/rbac.yaml/setup-controller.yaml, csi-addons-system namespace, CSI_ENABLE_CSIADDONS)

## Issues Found
- Step 1 installed the operator from the archived `csi-addons/volume-replication-operator` repo (`config/crd/bases/...` and `config/manager/manager.yaml`) and verified pods in the non-existent `volume-replication-operator-system` namespace. That repo was archived on Dec 12, 2024 and superseded by `kubernetes-csi-addons`. Fixed: Step 1 now installs `crds.yaml`, `rbac.yaml`, and `setup-controller.yaml` from `kubernetes-csi-addons` release v0.14.0, verifies pods in `csi-addons-system`, and notes the `CSI_ENABLE_CSIADDONS: "true"` operator ConfigMap requirement.
- Troubleshooting referenced `kubectl logs -n volume-replication-operator-system deploy/volume-replication-operator-controller-manager`. Fixed to `-n csi-addons-system deploy/csi-addons-controller-manager`, matching the current controller deployment name and namespace.
- Intro stated the CRD is "provided by the Volume Replication Operator (VRO)." Clarified that it is now provided by CSI-Addons, which absorbed the former standalone VRO.

## Review Notes
- The core VolumeReplicationClass YAML in Steps 2-3 is byte-accurate against Rook's official example: apiVersion `replication.storage.openshift.io/v1alpha1`, kind `VolumeReplicationClass`, `spec.provisioner: rook-ceph.rbd.csi.ceph.com`, and parameters `mirroringMode: snapshot`, `schedulingInterval`, `schedulingStartTime`, plus `replication.storage.openshift.io/replication-secret-name` and `-namespace`. The secret value `rook-csi-rbd-provisioner` matches the official example.
- `schedulingInterval` values "15m"/"1h"/"24h" are valid per the documented m/h/d suffix format. `schedulingStartTime` values like "02:00:00" are valid ISO 8601 times.
- CephBlockPool `mirroring.snapshotSchedules` with `interval` and `startTime` field names verified against the CephBlockPool CRD docs; `mode: snapshot` is valid.
- VolumeReplication spec (Step 5): `volumeReplicationClass`, `replicationState: primary`, `dataSource` (apiGroup/kind/name) match the official example. `autoResync` is not in Rook's minimal example but is confirmed a valid boolean field in the VolumeReplication CRD, so it was left as-is.
- `rbd mirror image snapshot schedule list/ls` and `rbd mirror image status` commands are valid Ceph RBD subcommands and were left unchanged. The Prometheus metric `rbd_mirror_image_replaying_lag_seconds` is referenced illustratively and was not independently confirmed against a metrics reference; left as-is as a non-load-bearing note.
