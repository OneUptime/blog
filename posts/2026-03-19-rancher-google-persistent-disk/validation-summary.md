# Validation Summary: How to Configure Google Persistent Disk in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Google Kubernetes Engine (GKE)
- Google Compute Engine Persistent Disk CSI Driver
- Google Cloud Persistent Disk
- Kubernetes StorageClass, PersistentVolumeClaim, StatefulSet, and VolumeSnapshot resources
- Google Cloud KMS / CMEK

## Sources Consulted
- Google Kubernetes Engine: Using the Compute Engine persistent disk CSI Driver - https://cloud.google.com/kubernetes-engine/docs/how-to/persistent-volumes/gce-pd-csi-driver
- Google Kubernetes Engine: Use persistent disks with multiple readers - https://cloud.google.com/kubernetes-engine/docs/how-to/persistent-volumes/readonlymany-disks
- Google Kubernetes Engine: Use customer-managed encryption keys (CMEK) - https://cloud.google.com/kubernetes-engine/docs/how-to/using-cmek
- Google Compute Engine: Protect resources by using Cloud KMS keys - https://cloud.google.com/compute/docs/disks/customer-managed-encryption
- Kubernetes: StatefulSets - https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes: Storage Classes - https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes: Volume Snapshots - https://kubernetes.io/docs/concepts/storage/volume-snapshots/
- Kubernetes SIG Storage GCE PD CSI Driver README - https://github.com/kubernetes-sigs/gcp-compute-persistent-disk-csi-driver/blob/master/README.md
- Kubernetes SIG Storage GCE PD CSI Driver installation guide - https://github.com/kubernetes-sigs/gcp-compute-persistent-disk-csi-driver/blob/master/docs/kubernetes/user-guides/driver-install.md
- Kubernetes SIG Storage GCE PD CSI Driver basic guide - https://github.com/kubernetes-sigs/gcp-compute-persistent-disk-csi-driver/blob/master/docs/kubernetes/user-guides/basic.md

## Issues Found
- The original self-managed installation flow was outdated. The Helm repository/path referenced in the post is not the upstream-supported deployment path anymore, and the GKE statement that the driver is simply "pre-installed" was too broad. I replaced this with the current GKE addon enablement flow and the upstream `setup-project.sh` / `deploy-driver.sh` flow for self-managed clusters on GCE.
- The original IAM commands for self-managed clusters were incomplete for the upstream PD CSI deployment flow. I changed the post to use the official setup script that creates the required service account roles and key material.
- The `StorageClass` examples used `fstype`, but the driver documents `csi.storage.k8s.io/fstype` for this purpose. I corrected that field in all affected storage classes.
- The `StatefulSet` example referenced `serviceName: mongodb` without defining the required headless Service. I added the governing Service so the example is deployable as written.
- The snapshot section omitted an important dependency on self-managed clusters: the `VolumeSnapshot` CRDs and snapshot-controller. I added that note because the manifests otherwise fail on clusters where those components are not installed by the distro.
- The `ReadOnlyMany` section was technically incorrect. It claimed to use a snapshot for multi-reader access, but the example only mounted an existing `ReadWriteOnce` PVC as read-only. I replaced it with a snapshot-backed `PersistentVolumeClaim` using `ReadOnlyMany` and a multi-replica workload that mounts the claim read-only.
- The monitoring commands assumed `kube-system` for all environments and used a grep-based `CSIDriver` check. I updated verification and monitoring commands to work across both GKE and self-managed deployments.
- The CMEK section was missing the required Cloud KMS permission context. I added the note that the Compute Engine service agent needs encrypt/decrypt access and that self-managed setups should enable KMS support during the official setup step.

## Review Notes
- The self-managed installation path now follows the upstream SIG Storage driver scripts, which currently expect the repository under `$GOPATH/src/sigs.k8s.io/gcp-compute-persistent-disk-csi-driver`.
- The upstream deployment example still uses the `stable-master` overlay. In practice, operators may prefer an overlay aligned with their Kubernetes minor version when one is available upstream.
- The Google documentation for `ReadOnlyMany` on persistent disks is GKE-version-sensitive; the current GKE guidance requires the PD CSI driver and GKE 1.22 or later.
