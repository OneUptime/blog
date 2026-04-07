# Validation Summary: How to Use RBD with QEMU

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook-Ceph (Kubernetes-based Ceph orchestration)
- Ceph RBD (RADOS Block Device)
- QEMU / KVM virtualization
- librbd (userspace RBD library)
- kubectl CLI

## Sources Consulted
- Ceph RBD documentation: https://docs.ceph.com/en/latest/rbd/
- QEMU block device documentation: https://www.qemu.org/docs/master/system/qemu-block-drivers.html
- Ceph RBD QEMU integration: https://docs.ceph.com/en/latest/rbd/qemu-rbd/
- Rook-Ceph toolbox documentation: https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/
- Linux fsfreeze man page: https://man7.org/linux/man-pages/man8/fsfreeze.8.html

## Issues Found
1. **Step 5 - Incorrect filesystem freeze command**: The post stated "Freeze the filesystem inside the VM" but used `sync && echo 3 > /proc/sys/vm/drop_caches`. The `drop_caches` command only frees kernel pagecache/dentries/inodes from memory — it does not freeze or quiesce the filesystem and provides no snapshot consistency guarantees. New writes can still land on disk between `sync` and the snapshot. **Fix**: Replaced with `sync` followed by `fsfreeze --freeze /` before the snapshot, and added `fsfreeze --unfreeze /` after the snapshot to resume normal I/O. This ensures the filesystem is in a consistent, frozen state during the RBD snapshot.

## Review Notes
- The `-net nic -net user` networking flags in Step 3 are legacy QEMU syntax. Modern QEMU prefers `-netdev user,id=net0 -device virtio-net-pci,netdev=net0`. The legacy form still works but may be removed in future QEMU releases.
- In Step 6, `rbd snap protect` is required for clone format v1 but is optional with clone format v2 (default since Ceph Nautilus). The commands shown remain correct and backward-compatible.
- The `qemu-img info` command in Step 7 relies on `/etc/ceph/ceph.conf` being present at the default path. This is consistent with Step 1's instructions but worth noting.
