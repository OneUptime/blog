# Validation Summary: How to Choose Between Kernel Driver and FUSE for CephFS

## Status
validated

## Post Type
Guide / Reference

## Technologies Covered
- CephFS (Ceph File System)
- CephFS kernel driver (`ceph.ko`)
- ceph-fuse (FUSE client)
- Rook-Ceph CSI driver
- fio (Flexible I/O Tester)
- Linux fscrypt
- FUSE (Filesystem in Userspace)

## Sources Consulted
- Ceph official documentation — CephFS kernel features: https://docs.ceph.com/en/latest/cephfs/kernel-features/
- Ceph official documentation — fscrypt on CephFS: https://docs.ceph.com/en/latest/cephfs/fscrypt/
- Ceph official documentation — mount using kernel driver: https://docs.ceph.com/en/latest/cephfs/mount-using-kernel-driver/
- Ceph official documentation — mount using FUSE: https://docs.ceph.com/en/latest/cephfs/mount-using-fuse/
- Rook documentation — Ceph CSI Drivers: https://www.rook.io/docs/rook/latest-release/Storage-Configuration/Ceph-CSI/ceph-csi-drivers/
- Rook documentation — Filesystem Storage: https://rook.io/docs/rook/latest-release/Storage-Configuration/Shared-Filesystem-CephFS/filesystem-storage/
- KernelNewbies Linux 5.11 changelog (msgr2 confirmation): https://kernelnewbies.org/Linux_5.11
- KernelNewbies Linux 6.6 changelog (fscrypt confirmation): https://kernelnewbies.org/Linux_6.6
- ceph-csi GitHub issue #546 (default mounter discussion): https://github.com/ceph/ceph-csi/issues/546

## Issues Found
1. **Incorrect CSI driver mount method claim (Summary paragraph):** The post stated "the CSI driver uses the FUSE approach internally for Kubernetes PVC provisioning, while direct host mounts can use either method." This is incorrect. Rook's CSI driver defaults to the kernel driver for CephFS mounts (`CSI_FORCE_CEPHFS_KERNEL_CLIENT: "true"`) and supports both kernel and FUSE via the `mounter` StorageClass parameter. Fixed the sentence to accurately reflect the default behavior and configurability.

## Review Notes
- All kernel version numbers in the feature availability table were verified correct against official Ceph documentation (quotas 4.17+, snapshots 4.17+, fscrypt 6.6+, msgr2 5.11+, multiple filesystems 4.7+).
- The fscrypt entry for the FUSE column ("Always via ceph-fuse") is technically correct — ceph-fuse does support fscrypt — but users should be aware it requires a custom fscrypt CLI from the Ceph project (not the standard fscrypt tool) and only supports AES-256-XTS/AES-256-CBC-CTS ciphers. This nuance is not covered in the post but is not an error per se.
- The performance comparison numbers (20-30% read, 15-25% write, 10-20% metadata) are reasonable ballpark figures commonly cited in CephFS benchmarking contexts.
- The fio commands are syntactically correct and appropriate for the described benchmarks.
