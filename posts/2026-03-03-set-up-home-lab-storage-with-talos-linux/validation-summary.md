# Validation Summary: How to Set Up Home Lab Storage with Talos Linux

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Talos Linux
- Kubernetes PersistentVolumes, PersistentVolumeClaims, and StorageClasses
- Rancher local-path-provisioner
- Longhorn
- Rook-Ceph
- Ceph RBD
- NFS CSI Driver
- Helm
- kubectl

## Sources Consulted
- Kubernetes StorageClasses documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes default StorageClass documentation: https://kubernetes.io/docs/tasks/administer-cluster/change-default-storage-class/
- Rancher local-path-provisioner documentation: https://github.com/rancher/local-path-provisioner
- Longhorn Talos Linux support documentation: https://longhorn.io/docs/1.11.0/advanced-resources/os-distro-specific/talos-linux-support/
- Longhorn Helm installation documentation: https://longhorn.io/docs/1.11.0/deploy/install/install-with-helm/
- Longhorn backup target documentation: https://longhorn.io/docs/1.11.2/snapshots-and-backups/backup-and-restore/set-backup-target/
- Talos Linux storage documentation: https://www.talos.dev/v1.10/kubernetes-guides/configuration/storage/
- Talos Linux CLI documentation: https://www.talos.dev/v1.11/reference/cli/
- Rook-Ceph quickstart documentation: https://rook.io/docs/rook/latest-release/Getting-Started/quickstart/
- Rook-Ceph CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook-Ceph block storage documentation: https://rook.io/docs/rook/latest-release/Storage-Configuration/Block-Storage-RBD/block-storage/
- Rook-Ceph operator Helm chart documentation: https://rook.io/docs/rook/latest-release/Helm-Charts/operator-chart/
- Kubernetes CSI NFS driver documentation: https://github.com/kubernetes-csi/csi-driver-nfs
- Kubernetes CSI NFS driver parameters: https://github.com/kubernetes-csi/csi-driver-nfs/blob/master/docs/driver-parameters.md
- Kubernetes CSI NFS Helm chart documentation: https://raw.githubusercontent.com/kubernetes-csi/csi-driver-nfs/master/charts/README.md

## Issues Found
- The local-path-provisioner install command used the `master` branch manifest. Changed it to the current stable release manifest (`v0.0.36`) so the example is reproducible.
- The Longhorn Talos prerequisite snippet was incomplete and included a systemd drop-in, which is not appropriate for Talos Linux. Replaced it with the required Talos system extensions, kubelet extra mount, `UserVolumeConfig`-based data path configuration, and an upgrade note for activating extensions on existing nodes.
- The Longhorn installation did not account for Talos pod security defaults. Added namespace creation and the required `pod-security.kubernetes.io/enforce=privileged` label before installing Longhorn.
- The Longhorn Helm command did not set the data path to match the Talos mount configuration. Added `defaultSettings.defaultDataPath=/var/mnt/longhorn`.
- The Rook-Ceph Helm commands omitted the official Rook chart repository setup. Added `helm repo add rook-release` and `helm repo update`.
- The Rook-Ceph cluster example pinned Ceph `v18.2.0`, which is older than the Ceph versions supported by current Rook documentation. Updated it to `quay.io/ceph/ceph:v19.2.3`.
- The Rook-Ceph RBD StorageClass omitted several parameters included in the official Rook example. Added `failureDomain`, `imageFeatures`, controller expand/publish secrets, filesystem type, and `allowVolumeExpansion`.
- The NFS CSI Helm install command omitted the official chart repository setup. Added `helm repo add csi-driver-nfs` and `helm repo update`.
- The monitoring section used `kubectl top nodes` for disk usage, but that command reports CPU and memory metrics. Replaced it with `talosctl usage` for Talos node disk usage.

## Review Notes
The examples are now technically aligned with current upstream documentation. Users still need to adapt node IPs, disk selectors, disk names, NAS addresses, backup credentials, and version pins to their own cluster and Talos release.
