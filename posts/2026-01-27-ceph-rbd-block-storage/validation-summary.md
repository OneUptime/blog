# Validation Summary: How to Use Ceph Block Storage (RBD)

## Status
validated

## Post Type
Tutorial / hands-on guide

## Technologies Covered
- Ceph RADOS Block Device (RBD)
- Ceph RADOS pools and placement groups
- RBD images, snapshots, clones, and image features
- Linux RBD mapping and rbdmap
- Kubernetes PersistentVolumes, PersistentVolumeClaims, StorageClasses, and StatefulSets
- Ceph CSI RBD driver

## Sources Consulted
- Ceph RBD command manpage: https://docs.ceph.com/en/reef/man/8/rbd/
- Ceph Block Devices and Kubernetes documentation: https://docs.ceph.com/en/reef/rbd/rbd-kubernetes/
- Ceph RBD snapshots and layering documentation: https://docs.ceph.com/en/reef/rbd/rbd-snapshot/
- Ceph pool operations and application association documentation: https://docs.ceph.com/en/reef/rados/operations/pools/
- Ceph placement group documentation: https://docs.ceph.com/en/reef/rados/operations/placement-groups/
- Ceph RBD exclusive locks documentation: https://docs.ceph.com/en/latest/rbd/rbd-exclusive-locks/
- ceph-csi RBD StorageClass example: https://raw.githubusercontent.com/ceph/ceph-csi/devel/examples/rbd/storageclass.yaml
- ceph-csi RBD Secret example: https://raw.githubusercontent.com/ceph/ceph-csi/devel/examples/rbd/secret.yaml
- ceph-csi RBD PVC example: https://raw.githubusercontent.com/ceph/ceph-csi/devel/examples/rbd/pvc.yaml

## Issues Found
- The pool creation comments said the pool was created with three copies, but the `ceph osd pool create` command does not set the pool replication size directly. Added an explicit `ceph osd pool set rbd-pool size 3` command.
- The pool setup initialized the pool with `rbd pool init` and then separately enabled the RBD application tag. Current Ceph documentation treats `rbd pool init` as the correct way to initialize RBD pools and associate them for RBD use, so the redundant manual application-enable command was removed.
- The placement group tuning example set both `pg_num` and `pgp_num`. Modern Ceph releases automatically step `pgp_num` after `pg_num` changes, so the direct `pgp_num` command was removed and replaced with a note.
- The RBD feature comments said `layering` is required for snapshots and clones. Snapshots are supported independently, while `layering` is the relevant feature for copy-on-write clones. Updated the comment accordingly.
- The RBD feature comments said `exclusive-lock` prevents multiple clients from mounting the same image. Ceph documentation states that exclusive locks do not, by default, prevent multiple clients from opening and writing to an image cooperatively. Reworded this as a write-lock ownership feature required by `object-map`.
- The ceph-csi StorageClass omitted `controller-publish` secret references that are present in current ceph-csi examples. Added the controller-publish secret name and namespace parameters.

## Review Notes
The Kubernetes examples are structurally valid, but a real deployment also needs the ceph-csi driver manifests or Helm chart, matching namespaces, RBAC, and any required ceph-csi ConfigMaps such as KMS and Ceph configuration objects depending on the installation method and driver version. The StorageClass uses advanced RBD image features; operators should ensure the node-side RBD mounter and kernel support those features or configure an appropriate mounter fallback.
