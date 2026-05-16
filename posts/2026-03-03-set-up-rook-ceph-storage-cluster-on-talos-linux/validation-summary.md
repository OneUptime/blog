# Validation Summary: How to Set Up Rook-Ceph Storage Cluster on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes
- Rook-Ceph
- Ceph
- Ceph-CSI
- Helm
- kubectl
- talosctl

## Sources Consulted
- Sidero Labs Talos Ceph Storage Cluster with Rook documentation: https://docs.siderolabs.com/kubernetes-guides/csi/ceph-with-rook
- Sidero Labs Talos disk management documentation: https://docs.siderolabs.com/talos/v1.9/configure-your-talos-cluster/storage-and-disk-management/disk-management
- Rook Ceph Operator Helm chart documentation: https://rook.io/docs/rook/latest-release/Helm-Charts/operator-chart/
- Rook Ceph-CSI Driver Helm chart documentation: https://rook.io/docs/rook/latest-release/Helm-Charts/csi-drivers-chart/
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest-release/CRDs/Cluster/ceph-cluster-crd/
- Rook RBD block storage documentation: https://rook.io/docs/rook/latest-release/Storage-Configuration/Block-Storage-RBD/block-storage/
- Rook toolbox documentation: https://rook.io/docs/rook/latest-release/Troubleshooting/ceph-toolbox/
- Rook Ceph dashboard documentation: https://rook.io/docs/rook/latest-release/Storage-Configuration/Monitoring/ceph-dashboard/
- Ceph release documentation: https://docs.ceph.com/en/latest/releases/

## Issues Found
- The disk verification command used `talosctl disks --nodes <worker-ip>`. Current Talos documentation shows `talosctl get disks`, so the command was updated.
- The Talos preparation section used an outdated and unsupported-looking `ghcr.io/siderolabs/rook-ceph:v0.1.0` system extension patch and containerd settings that are not part of the current Sidero Rook-Ceph guide. This was replaced with the required namespace Pod Security label for privileged Ceph pods.
- The Rook Helm installation used older CSI enablement values. Current Rook documentation separates the Ceph-CSI driver chart, so the install commands now add the `ceph-csi-operator` repo and install `ceph-csi-drivers`.
- The Ceph image was pinned to `quay.io/ceph/ceph:v18.2.1`, which is outdated. It was updated to `quay.io/ceph/ceph:v20.2.1`, the current Tentacle release listed in Ceph release documentation and supported by current Rook documentation.
- The toolbox Deployment did not generate `/etc/ceph/ceph.conf` and `/etc/ceph/keyring`, so the direct `ceph` commands would not work reliably. The manifest was updated to follow Rook's toolbox pattern.
- The RBD StorageClass was missing the controller-publish CSI secret fields shown in the current Rook RBD example. These fields and an explicit `ext4` filesystem type were added.
- The dashboard port-forward used port `7000`, but the default Rook Ceph dashboard service uses HTTPS on `8443`. The command and browser URL were updated to `8443`.
- The post claimed to be a complete walkthrough for block, filesystem, and object storage, but only provided a block storage class. The wording was narrowed so the concrete walkthrough accurately describes the block-storage implementation while still noting Rook-Ceph's broader capabilities.

## Review Notes
Future revisions could add CephFilesystem and CephObjectStore examples if the post is intended to be fully end-to-end for all Rook-Ceph storage types.
