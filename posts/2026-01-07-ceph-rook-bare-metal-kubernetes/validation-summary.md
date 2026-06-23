# Validation Summary: How to Deploy Ceph with Rook on Bare-Metal Kubernetes

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Ceph
- Rook
- Kubernetes
- Ceph CSI
- Ceph RBD
- CephFS
- Rook Ceph custom resources
- Kubernetes StorageClass, PVC, Pod, Deployment, and Ingress resources

## Sources Consulted
- Rook v1.13 Quickstart: https://rook.io/docs/rook/v1.13/Getting-Started/quickstart/
- Rook v1.13 Prerequisites: https://rook.io/docs/rook/v1.13/Getting-Started/Prerequisites/prerequisites/
- Rook v1.13 block storage documentation: https://rook.io/docs/rook/v1.13/Storage-Configuration/Block-Storage-RBD/block-storage/
- Rook v1.13 CephFS documentation: https://rook.io/docs/rook/v1.13/Storage-Configuration/Shared-Filesystem-CephFS/filesystem-storage/
- Rook v1.13.10 example cluster manifest: https://raw.githubusercontent.com/rook/rook/v1.13.10/deploy/examples/cluster.yaml
- Rook v1.13.10 toolbox manifest: https://raw.githubusercontent.com/rook/rook/v1.13.10/deploy/examples/toolbox.yaml
- Rook v1.13.10 RBD StorageClass example: https://raw.githubusercontent.com/rook/rook/v1.13.10/deploy/examples/csi/rbd/storageclass.yaml
- Rook v1.13.10 CephFilesystem example: https://raw.githubusercontent.com/rook/rook/v1.13.10/deploy/examples/filesystem.yaml
- Ceph release information: https://docs.ceph.com/en/latest/releases/

## Issues Found
- The post cloned Rook `v1.13.4`, while the official v1.13 documentation references the maintained v1.13 patch examples at `v1.13.10`. Updated the clone command to `v1.13.10`.
- The Kubernetes requirement said "1.25 or higher", which is not accurate for Rook v1.13 because official Rook v1.13 docs support Kubernetes v1.23 through v1.29. Updated the prerequisite.
- The Ceph image examples used `quay.io/ceph/ceph:v18.2.1`; the official Rook v1.13.10 examples use `v18.2.2`. Updated the CephCluster and toolbox examples for consistency with the referenced Rook release.
- The custom toolbox deployment only kept the container running and did not create `/etc/ceph/ceph.conf` or a keyring, so subsequent `ceph` CLI commands would not work reliably. Replaced the inline command and secret mount pattern with the official Rook toolbox approach.
- The CephFilesystem manifest used `preservePoolsOnDelete`, which is not the Rook v1.13 CephFilesystem field. Changed it to `preserveFilesystemOnDelete`.
- The RBD and CephFS StorageClass examples set `volumeBindingMode: WaitForFirstConsumer` with misleading scheduling comments. The official Rook examples omit this field, so Kubernetes defaults to `Immediate`. Removed the field and updated the expected `kubectl get storageclass` output.

## Review Notes
The post remains version-specific to Rook v1.13 and Ceph Reef v18. Rook v1.13 documentation is no longer the latest Rook documentation as of this validation date, and Ceph Reef is listed as past its estimated active-maintenance end date in the Ceph release index. A future refresh should update the tutorial to a currently supported Rook and Ceph release rather than only a patch-level correction.
