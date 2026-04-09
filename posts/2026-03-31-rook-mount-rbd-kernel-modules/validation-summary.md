# Validation Summary: How to Mount RBD with Kernel Modules

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook-Ceph (Kubernetes Ceph operator)
- Ceph RBD (RADOS Block Device)
- Linux kernel RBD module (krbd)
- rbd-nbd (userspace NBD mounter)
- ceph-csi (CSI driver for Ceph)
- Kubernetes StorageClass

## Sources Consulted
- ceph-csi RBD-NBD design proposal: https://github.com/ceph/ceph-csi/blob/devel/docs/design/proposals/rbd-nbd.md
- ceph-csi example RBD StorageClass: https://github.com/ceph/ceph-csi/blob/devel/examples/rbd/storageclass.yaml
- Rook example RBD StorageClass: https://github.com/rook/rook/blob/master/deploy/examples/csi/rbd/storageclass.yaml
- Rook Block Storage documentation: https://www.rook.io/docs/rook/latest-release/Storage-Configuration/Block-Storage-RBD/block-storage/
- Linux kernel sysfs-bus-rbd documentation: Documentation/ABI/testing/sysfs-bus-rbd
- Linux kernel rbd.c source (rbd_add_parse_args function)
- Rook operator source: pkg/operator/ceph/config/keyring/admin.go and store.go

## Issues Found

1. **Incorrect default mounter claim**: The post stated "the CSI driver typically uses `rbd-nbd` for broader feature support." In reality, ceph-csi defaults to `krbd` (kernel mounter). `rbd-nbd` is an opt-in alternative used when features like encryption are needed. Fixed the intro paragraph and summary to reflect the correct default.

2. **Invalid `mounter` parameter value**: The StorageClass used `mounter: kernel`, which is not a valid ceph-csi mounter value. The valid values are `rbd` (kernel/krbd, the default) and `rbd-nbd`. Changed to `mounter: rbd` throughout, including in the accompanying note.

3. **Incorrect sysfs `/sys/bus/rbd/add` command format**: The command used `192.168.1.10 6789` (space-separated IP and port), but the kernel sysfs interface expects `192.168.1.10:6789` (colon-separated). With a space, `6789` would be parsed as the options field, corrupting all subsequent fields. Additionally, the command included a `-` namespace placeholder between pool and image name (`replicapool - myimage`), but the kernel sysfs interface has no namespace field — the format is `<mon_addrs> <options> <pool_name> <image_name> [<snap_name>]`. Fixed to `192.168.1.10:6789 name=admin,secret=<key> replicapool myimage`.

4. **Summary paragraph repeated errors**: The summary stated "specify `mounter: kernel`" and "instead of the default `rbd-nbd`" — both wrong. Rewritten to correctly state that krbd is the default and the parameter is `mounter: rbd`.

## Review Notes
- The admin keyring secret name (`rook-ceph-admin-keyring`) and jsonpath (`.data.keyring`) were verified as correct against the Rook operator source code.
- The `rbd map`, `rbd showmapped`, `rbd unmap`, `modprobe rbd`, and `mkfs.ext4`/`mount` commands are all correct.
- The `imageFeatures: layering` setting in the StorageClass is appropriate for krbd compatibility, as more advanced features may not be supported by all kernel versions.
- The claim that `exclusive-lock` requires kernel 4.9+ is correct.
- The `mon_host` format using port 6789 (msgr1) is valid, though newer Ceph clusters may prefer port 3300 (msgr2). Both are acceptable.
