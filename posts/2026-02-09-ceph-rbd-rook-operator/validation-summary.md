# Validation Summary: How to Deploy Ceph RBD Storage Class with Rook Operator on Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RBD
- Rook Operator
- Kubernetes
- Kubernetes CSI
- Kubernetes StatefulSet and PersistentVolumeClaim resources
- Prometheus ServiceMonitor
- Kubernetes VolumeSnapshot API

## Sources Consulted
- Rook v1.13 Quickstart: https://rook.io/docs/rook/v1.13/Getting-Started/quickstart/
- Rook v1.13 Block Storage Overview: https://rook.io/docs/rook/v1.13/Storage-Configuration/Block-Storage-RBD/block-storage/
- Rook v1.13 Ceph Dashboard: https://rook.io/docs/rook/v1.13/Storage-Configuration/Monitoring/ceph-dashboard/
- Rook v1.13 Prometheus Monitoring: https://rook.io/docs/rook/v1.13/Storage-Configuration/Monitoring/ceph-monitoring/
- Rook v1.13 RBD snapshot class example: https://raw.githubusercontent.com/rook/rook/v1.13.0/deploy/examples/csi/rbd/snapshotclass.yaml
- Rook v1.13 cluster example: https://raw.githubusercontent.com/rook/rook/v1.13.0/deploy/examples/cluster.yaml
- Kubernetes StatefulSet API reference: https://kubernetes.io/docs/reference/kubernetes-api/apps-stateful-set-v1/
- Kubernetes StatefulSet concept documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes Volume Snapshots: https://kubernetes.io/docs/concepts/storage/volume-snapshots/

## Issues Found
- The storage preparation section said Ceph requires raw block devices or directories. Rook v1.13 documents raw devices, raw partitions, LVM logical volumes, encrypted devices, multipath devices, or block-mode PersistentVolumes, so the wording was corrected.
- The expected pod list included MDS pods for an RBD-only deployment. MDS pods are only created for CephFS, so the expected pod list was corrected.
- The RBD pool example forced `deviceClass: ssd`, which can prevent placement if the cluster does not have SSD-class OSDs. The field was removed from the generic tutorial example.
- The MySQL StatefulSet referenced `serviceName: mysql` without defining the required governing Service. A minimal headless Service was added to the example.
- The RBD verification commands used `deploy/rook-ceph-tools` without creating the toolbox deployment. A `kubectl apply -f toolbox.yaml` step was added before the Ceph CLI command.
- The dashboard example configured `ssl: false` but instructed readers to open `https://localhost:8443`. The URL was corrected to `http://localhost:8443`.
- The high-performance StorageClass omitted the Rook CSI secret parameters used by the standard RBD StorageClass. The missing secret parameters, reclaim policy, and expansion setting were added.
- The monitoring snippet attempted to create a duplicate `rook-ceph-mgr` Service. Rook creates the manager metrics Service; the snippet was corrected to define only the ServiceMonitor with the labels and endpoint path used by the Rook v1.13 example.

## Review Notes
- The post uses Rook v1.13.0 and Ceph Reef v18.2.0 examples. Rook v1.13 is no longer the latest Rook release as of this review date, but the examples were validated against the v1.13 documentation and manifests.
- VolumeSnapshot examples assume the Kubernetes snapshot CRDs and snapshot controller are installed in the cluster.
