# Validation Summary: How to Set Up CephFS for Shared Filesystem Access in Kubernetes

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Ceph and CephFS
- Rook Ceph Operator
- Kubernetes PersistentVolumes, PersistentVolumeClaims, StorageClasses, Deployments, StatefulSets, Services, and NetworkPolicies
- Ceph CSI Driver
- Helm
- Prometheus Operator ServiceMonitor and PrometheusRule resources

## Sources Consulted
- Rook Ceph shared filesystem documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Shared-Filesystem-CephFS/filesystem-storage/
- Rook CephFilesystemSubVolumeGroup CRD documentation: https://rook.io/docs/rook/v1.19/CRDs/Shared-Filesystem/ceph-fs-subvolumegroup-crd/
- Rook CRD specification: https://rook.io/docs/rook/latest/CRDs/specification/
- Rook Ceph operator Helm chart documentation: https://rook.io/docs/rook/latest-release/Helm-Charts/operator-chart/
- Rook quickstart documentation: https://rook.io/docs/rook/latest/Getting-Started/quickstart/
- Rook example CephFS StorageClass: https://github.com/rook/rook/blob/master/deploy/examples/csi/cephfs/storageclass.yaml
- Rook example CephFilesystem manifest: https://github.com/rook/rook/blob/master/deploy/examples/filesystem.yaml
- Ceph-CSI CephFS StorageClass example: https://github.com/ceph/ceph-csi/blob/devel/examples/cephfs/storageclass.yaml
- Ceph-CSI CephFS deployment documentation: https://github.com/ceph/ceph-csi/blob/devel/docs/cephfs/deploy.md
- CephFS mount.ceph manual: https://docs.ceph.com/en/reef/man/8/mount.ceph/
- Linux kernel CephFS mount options documentation: https://www.kernel.org/doc/html/v6.1/filesystems/ceph.html
- Kubernetes Persistent Volumes documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes StorageClasses documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Ceph Prometheus module documentation: https://docs.ceph.com/en/latest/mgr/prometheus/

## Issues Found
- The post included a hand-written partial Rook CRD manifest as if it were an installable operator manifest. Replaced it with guidance to install version-matched Rook CRDs via Helm or official Rook manifests.
- The prerequisites pinned outdated generic Kubernetes/Ceph version guidance. Changed this to require versions supported by the selected Rook release.
- The CephCluster description said metadata servers were part of that manifest. Corrected it to state that CephFS MDS pods are created by the CephFilesystem resource.
- The CSI section instructed readers to create manual ceph-csi ConfigMaps in a Rook-managed deployment. Updated it to verify the Rook-managed CSI ConfigMap and secrets instead.
- The CephFS StorageClass omitted the controller-publish secret fields shown in official Rook examples. Added those fields.
- The StorageClass used invalid/nonstandard mount option placement and options such as `async_readdir` and `readahead_max_bytes`. Replaced them with Ceph-CSI `kernelMountOptions` using documented CephFS kernel mount options such as `rasize`, `readdir_max_bytes`, `wsize`, and `rsize`.
- The subvolume group StorageClass used an unsupported `csi.storage.k8s.io/fsSubVolumeGroup` parameter. Updated the example to use the `clusterID` reported by the `CephFilesystemSubVolumeGroup` status, matching Rook documentation.
- The tuning ConfigMap included an invalid `client_cache_size` MDS config command. Removed it.
- The NetworkPolicy selected the Rook namespace using a non-guaranteed `name` label. Updated it to use the standard `kubernetes.io/metadata.name` namespace label.
- The security example called a Pod manifest a Pod Security Policy. Corrected the wording because PodSecurityPolicy is removed from current Kubernetes.
- The embedded troubleshooting ConfigMap used malformed Markdown fence closers. Corrected them to close the fenced code blocks properly.

## Review Notes
The post is now technically valid as a Rook-based CephFS tutorial, but the exact Rook/Ceph/Kubernetes compatibility matrix should still be checked at deployment time because Rook release requirements change over time. The PrometheusRule examples are illustrative; production alert rules should be tested against the exact metrics exposed by the deployed Ceph version and Prometheus configuration.
