# Validation Summary: How to Set Up ReadWriteMany Volumes with CephFS for Shared Storage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes PersistentVolumes and PersistentVolumeClaims
- Kubernetes StorageClass
- Kubernetes CSI and VolumeSnapshot APIs
- CephFS
- Ceph CSI CephFS driver
- Ceph CLI
- Prometheus metrics for Ceph

## Sources Consulted
- Kubernetes Persistent Volumes documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes VolumeSnapshotClass documentation: https://kubernetes.io/docs/concepts/storage/volume-snapshot-classes/
- Kubernetes CSI StorageClass secrets documentation: https://kubernetes-csi.github.io/docs/secrets-and-credentials-storage-class.html
- Kubernetes CSI VolumeSnapshotClass secrets documentation: https://kubernetes-csi.github.io/docs/secrets-and-credentials-volume-snapshot-class.html
- CephFS filesystem creation documentation: https://docs.ceph.com/en/latest/cephfs/createfs/
- CephFS quotas documentation: https://docs.ceph.com/en/quincy/cephfs/quota/
- CephFS volumes and subvolumes documentation: https://docs.ceph.com/en/latest/cephfs/fs-volumes/
- CephFS client capabilities documentation: https://docs.ceph.com/en/quincy/cephfs/client-auth/
- CephFS snapshots documentation: https://docs.ceph.com/en/latest/cephfs/snapshots/
- Ceph Prometheus and monitoring documentation: https://docs.ceph.com/en/latest/monitoring/
- Ceph manager Prometheus module documentation: https://docs.ceph.com/en/quincy/mgr/prometheus/
- Ceph CSI CephFS deployment documentation: https://github.com/ceph/ceph-csi/blob/devel/docs/cephfs/deploy.md
- Ceph CSI CephFS StorageClass example: https://github.com/ceph/ceph-csi/blob/devel/examples/cephfs/storageclass.yaml
- Ceph CSI configuration sample: https://github.com/ceph/ceph-csi/blob/devel/deploy/csi-config-map-sample.yaml

## Issues Found
- The Ceph CSI setup omitted the required `ceph-csi-config` cluster mapping and monitor configuration. Added a populated `ceph-csi-config` example with `clusterID` and monitor endpoints.
- The Ceph CSI secret example used a fake concrete key and extra `adminID` / `adminKey` fields that are not required by the current CephFS example. Replaced the key with a placeholder and kept the documented `userID` / `userKey` fields.
- The Ceph CSI deployment commands omitted the `CSIDriver` object and Ceph config ConfigMap, and the fenced block was marked as YAML even though it contained shell commands. Added `csidriver.yaml`, `ceph-conf.yaml`, namespace application, and changed the fence to `bash`.
- The StorageClass examples were missing the documented `controller-publish-secret` parameters used by current Ceph CSI examples. Added those secret references.
- The performance tuning example used invalid or inappropriate mount options in `mountOptions`, including `inline_data`, which is a deprecated CephFS feature rather than a Kubernetes StorageClass mount option. Replaced this with Ceph CSI `kernelMountOptions: rasize=16384,noatime`.
- The Prometheus metric examples used non-current MDS metric names. Replaced request latency and session metrics with documented `ceph_mds_reply_latency_*` and `ceph_mds_sessions_session_count` queries.
- The dedicated CephFS user command used pool-based OSD caps and omitted `mgr` permissions. Replaced it with CephFS tag-based OSD caps and `mgr 'allow rw'`, matching CephFS and Ceph CSI subvolume requirements.
- The quota section used `subvolumeGroup` as a StorageClass parameter, but Ceph CSI configures CephFS subvolume groups in `ceph-csi-config`. Replaced that snippet with a `ceph fs subvolumegroup create` command and the corresponding ConfigMap configuration.
- The MDS monitoring examples used a filesystem-like daemon name. Updated examples to use `mds.0` for client listing and `ceph daemonperf`.

## Review Notes
- The post is technically relevant and was validated after corrections.
- Ceph CSI upstream manifests on the development branch use canary images; production deployments should pin a released Ceph CSI version even though the linked manifests are official examples.
- Kubernetes VolumeSnapshot examples are structurally correct, but they require the snapshot CRDs, snapshot controller, and CSI snapshotter sidecar to be installed in the target cluster.
