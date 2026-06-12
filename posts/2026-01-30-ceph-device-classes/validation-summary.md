# Validation Summary: How to Build Ceph Device Classes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph RADOS
- Ceph OSD device classes
- CRUSH rules
- RBD pools
- Rook
- Kubernetes StorageClass and PersistentVolumeClaim resources

## Sources Consulted
- Ceph CRUSH Maps documentation: https://docs.ceph.com/en/reef/rados/operations/crush-map/
- Ceph RADOS control commands documentation: https://docs.ceph.com/en/reef/rados/operations/control/
- Ceph RBD block device commands documentation: https://docs.ceph.com/en/reef/rbd/rados-rbd-cmds/
- Ceph RBD manual page: https://docs.ceph.com/en/reef/man/8/rbd/
- Ceph placement groups documentation: https://docs.ceph.com/en/reef/rados/operations/placement-groups/
- Ceph monitor command API for CRUSH class commands: https://docs.ceph.com/en/latest/api/mon_command_api/
- Rook CephBlockPool documentation: https://rook.io/docs/rook/v1.20/CRDs/Block-Storage/ceph-block-pool-crd/
- Rook RBD StorageClass example: https://raw.githubusercontent.com/rook/rook/master/deploy/examples/csi/rbd/storageclass.yaml
- Rook RBD PVC example: https://raw.githubusercontent.com/rook/rook/master/deploy/examples/csi/rbd/pvc.yaml
- Ceph-CSI RBD StorageClass example: https://github.com/ceph/ceph-csi/blob/devel/examples/rbd/storageclass.yaml

## Issues Found
- Custom device class assignment skipped the required removal of an existing class. Ceph requires the old device class to be unset before assigning a different class, so I added `ceph osd crush rm-device-class osd.6 osd.7 osd.8` before assigning the `archive` class.
- The Rook RBD StorageClass examples omitted `controller-publish` secret references that are present in current Rook and Ceph-CSI RBD StorageClass examples. I added `csi.storage.k8s.io/controller-publish-secret-name` and `csi.storage.k8s.io/controller-publish-secret-namespace` to each tiered StorageClass.
- The placement group best practice used a broad `100-200 PGs per OSD` rule of thumb. I updated it to recommend Ceph's PG autoscaler or PG calculator and to match current Ceph guidance of roughly `100-250 PG replicas per OSD` for clusters with more than 50 OSDs.

## Review Notes
- The Ceph command forms for `set-device-class`, `rm-device-class`, `create-replicated`, pool creation, pool `crush_rule` changes, `rbd pool init`, and rule inspection match official Ceph documentation.
- The Kubernetes YAML snippets parse successfully as StorageClass and PersistentVolumeClaim resources.
- The fixed PG guidance is still a rule of thumb; production clusters should rely on the autoscaler or calculate per pool based on OSD count, pool size, and expected data distribution.
