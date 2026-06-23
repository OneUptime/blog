# Validation Summary: How to Configure Kubernetes Persistent Volumes

## Status
validated

## Post Type
Tutorial / How-To guide

## Technologies Covered
- Kubernetes (PersistentVolume, PersistentVolumeClaim, StorageClass, VolumeSnapshot, CSI)
- Ubuntu (apt, systemd)
- NFS (nfs-kernel-server, nfs-common, /etc/exports)
- iSCSI (open-iscsi, iscsid)
- Helm (nfs-subdir-external-provisioner, csi-driver-nfs, Longhorn)
- Longhorn distributed block storage
- kubectl

## Sources Consulted
- Kubernetes Persistent Volumes docs — https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes StorageClasses docs — https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes Access Modes / Local volumes — https://kubernetes.io/docs/concepts/storage/persistent-volumes/#access-modes
- Kubernetes Volume Snapshots — https://kubernetes.io/docs/concepts/storage/volume-snapshots/
- Kubernetes field selectors — https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- ReadWriteOncePod feature history — https://kubernetes.io/docs/concepts/storage/persistent-volumes/#access-modes
- NFS subdir external provisioner — https://github.com/kubernetes-sigs/nfs-subdir-external-provisioner
- csi-driver-nfs — https://github.com/kubernetes-csi/csi-driver-nfs
- external-snapshotter — https://github.com/kubernetes-csi/external-snapshotter
- Longhorn docs (StorageClass parameters, RecurringJob, prerequisites) — https://longhorn.io/docs/
- Ubuntu NFS server guide — https://ubuntu.com/server/docs/network-file-system-nfs

## Issues Found
1. **Broken `kubectl get events` field selector (Troubleshooting diagnostic script).** The command used
   `--field-selector reason=FailedMount,reason=FailedAttachVolume,reason=ProvisioningFailed`. Kubernetes field
   selectors are combined with logical AND, and a key cannot have multiple values, so this selector can never match
   any event and would always return nothing. Replaced with a valid single-key selector (`type=Warning`) piped to
   `grep -iE 'FailedMount|FailedAttachVolume|ProvisioningFailed'`, which preserves the original intent.

2. **Incorrect comment on Longhorn `staleReplicaTimeout` parameter.** The inline comment read
   "# Spread replicas across different nodes", which describes replica anti-affinity / soft node anti-affinity, not
   `staleReplicaTimeout`. `staleReplicaTimeout` is the time in minutes Longhorn waits before cleaning up a
   stale/failed replica (2880 = 48h). Corrected the comment to accurately describe the parameter.

## Review Notes
- **NFS provisioner name caveat:** The `nfs-client` and `expandable-nfs` StorageClass examples reference
  `provisioner: cluster.local/nfs-provisioner`. The nfs-subdir-external-provisioner Helm chart's default
  provisioner name is `cluster.local/nfs-subdir-external-provisioner` and the post does not set
  `storageClass.provisionerName`. The examples are internally consistent with each other, but a reader must ensure
  the StorageClass `provisioner` value matches whatever the provisioner actually registers (via
  `--set storageClass.provisionerName=...`). Left as-is since it is a deployment-specific configuration value rather
  than an outright error.
- **ReadWriteOncePod version:** Listed as "K8s 1.22+". RWOP first appeared as alpha in 1.22 (behind a feature gate),
  went beta/on-by-default in 1.27, and GA in 1.29. "1.22+" is the earliest-availability statement and is acceptable,
  though clusters before 1.27 require the feature gate.
- All YAML manifests (PV/PVC/StorageClass/Pod/VolumeSnapshot/RecurringJob) use correct apiVersions and field names
  (`storage.k8s.io/v1`, `snapshot.storage.k8s.io/v1`, `longhorn.io/v1beta2`).
- CSI snapshot CRD/controller URLs, csi-driver-nfs and Longhorn Helm repos, NFS export options, and the access-mode
  compatibility matrix were checked and are accurate.
- The `no_root_squash` NFS export option works as written but loosens security; this is a hardening consideration,
  not a technical error.
