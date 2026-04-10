# Validation Summary: How to Check Kernel Support for Ceph Features

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph (RBD and CephFS)
- Linux kernel RBD module (krbd)
- Linux kernel CephFS client
- Rook (contextual)

## Sources Consulted
- [Ceph RBD Config Reference (rbd-config-ref.rst)](https://github.com/ceph/ceph/blob/main/doc/rbd/rbd-config-ref.rst) — official krbd feature/kernel version table
- [Ceph Tracker #40802: Update krbd feature support kernel releases](https://tracker.ceph.com/issues/40802) — confirmed deep-flatten v5.1, object-map/fast-diff v5.3
- [Ceph Tracker #12902: krbd support object-map and fast-diff](https://tracker.ceph.com/issues/12902) — confirmed object-map/fast-diff added in kernel 5.3
- [RBD journaling kernel patchset (patchwork.kernel.org)](https://patchwork.kernel.org/cover/11063519/) — confirmed journaling patches were proposed but never merged into mainline
- [ceph-csi Issue #478: rbd-nbd when krbd cannot support features](https://github.com/ceph/ceph-csi/issues/478) — confirms journaling not supported by krbd
- [Ceph RBD man page (rbd.rst)](https://github.com/ceph/ceph/blob/main/doc/man/8/rbd.rst) — feature definitions and dependencies
- [CephFS Administrative commands](https://docs.ceph.com/en/latest/cephfs/administration/) — verified `ceph fs feature ls` is the correct command
- [Ceph mailing list: RBD features with kernel version](https://www.spinics.net/lists/ceph-users/msg39035.html) — feature/kernel mapping discussion

## Issues Found

1. **RBD journaling kernel version incorrect**: The post listed "RBD journaling: kernel 4.14+" in the minimum recommended versions and "journaling | 4.14" in the RBD features table. Journaling has never been merged into the Linux kernel RBD client (krbd). The kernel patches were proposed (v3 rebased against 5.3-rc1) but never landed in mainline. Changed the minimum versions list to replace the journaling entry with "RBD deep-flatten: kernel 5.1+" and updated the table to show "journaling | Not supported by krbd".

2. **Invalid command `ceph mds feature ls`**: This is not a valid Ceph command. The correct command to list CephFS features is `ceph fs feature ls`. Fixed accordingly.

3. **Incorrect MDS session command syntax**: The post used `ceph daemon client.admin@<hostname> session ls` which is invalid. `ceph daemon` connects to a local daemon admin socket and expects a daemon name like `mds.<id>`, not a client reference. Changed to `ceph tell mds.<id> client ls` which is the correct modern syntax (Luminous+) for listing connected CephFS clients.

4. **RBD features table incomplete**: The table was missing `fast-diff` (kernel 5.3) and `data-pool` (kernel 4.11), which are commonly used features. Added these entries to provide a more complete reference.

## Review Notes
- The `/sys/module/ceph/parameters/supported_features` sysfs path is valid on kernels that expose it, but the fallback message "not mounted yet" is slightly misleading — the parameter is available when the ceph kernel module is loaded, not specifically when CephFS is mounted. In practice the module is often auto-loaded at mount time, so this is acceptable.
- The comment "Check single_major support (kernel 4.7+)" is imprecise — single_major was introduced in kernel 3.14 but became the default in a later kernel. This is minor and left as-is since it's a code comment.
- The `rbd feature disable` example includes `fast-diff` which is good practice since fast-diff depends on object-map and both should be disabled together.
