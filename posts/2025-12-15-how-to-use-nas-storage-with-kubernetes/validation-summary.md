# Validation Summary: How to Use NAS Storage with Kubernetes: NFS, SMB, and iSCSI Volumes

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes PersistentVolumes, PersistentVolumeClaims, and StorageClasses
- NFS and the Kubernetes NFS CSI driver
- SMB/CIFS and the Kubernetes SMB CSI driver
- iSCSI PersistentVolumes
- Helm
- Linux NFS and iSCSI client packages

## Sources Consulted
- Kubernetes Persistent Volumes documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes StorageClasses documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes NFS CSI driver README: https://github.com/kubernetes-csi/csi-driver-nfs
- Kubernetes NFS CSI driver parameters: https://github.com/kubernetes-csi/csi-driver-nfs/blob/master/docs/driver-parameters.md
- Kubernetes NFS CSI Helm chart README: https://github.com/kubernetes-csi/csi-driver-nfs/blob/master/charts/README.md
- Kubernetes SMB CSI driver README: https://github.com/kubernetes-csi/csi-driver-smb
- Kubernetes SMB CSI driver parameters: https://github.com/kubernetes-csi/csi-driver-smb/blob/master/docs/driver-parameters.md
- Kubernetes SMB CSI Helm chart README: https://github.com/kubernetes-csi/csi-driver-smb/blob/master/charts/README.md
- Linux nfs(5) manual page: https://man7.org/linux/man-pages/man5/nfs.5.html

## Issues Found
- Corrected iSCSI and `ReadWriteOnce` language. Kubernetes defines `ReadWriteOnce` as read/write by a single node, not strictly one pod, so the table, iSCSI explanation, manifest comment, and TL;DR now say single-node / ReadWriteOnce workloads.
- Added SMB CSI provisioner secret parameters. The SMB CSI driver documents `csi.storage.k8s.io/provisioner-secret-name` and namespace for authenticated dynamic provisioning, so the StorageClass now includes both provisioner and node-stage secret references.
- Fixed the NFS CSI Helm resource example. The previous command used invalid chart value paths and inline comments after line-continuation backslashes, which would break shell parsing. The command now uses documented NFS chart resource keys and valid shell syntax.
- Removed the `intr` NFS mount option from the example. The Linux NFS man page documents `intr` / `nointr` as backward-compatible options ignored after kernel 2.6.25.

## Review Notes
The YAML snippets parse successfully as YAML. Local `kubectl` and `helm` binaries were not installed in the workspace, so client-side CLI dry-runs and `helm template` rendering could not be executed locally.
