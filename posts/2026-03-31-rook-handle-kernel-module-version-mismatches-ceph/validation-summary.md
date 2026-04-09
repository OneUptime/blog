# Validation Summary: How to Handle Kernel Module Version Mismatches with Ceph

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph (Quincy / 17.x referenced)
- Linux kernel modules (rbd.ko, ceph.ko)
- Ceph userspace tools (ceph-common, rbd-nbd, ceph-fuse)
- DKMS (Dynamic Kernel Module Support)
- Ubuntu HWE kernel packages
- Rook (mentioned in tags)

## Sources Consulted
- Ceph official documentation for RBD commands and feature flags: https://docs.ceph.com/en/latest/rbd/
- Ceph official documentation for CephFS FUSE client: https://docs.ceph.com/en/latest/cephfs/fuse/
- Ceph official documentation for rbd-nbd: https://docs.ceph.com/en/latest/rbd/rbd-nbd/
- Linux kernel module documentation for modinfo usage
- Ubuntu HWE kernel documentation: https://ubuntu.com/kernel/lifecycle
- DKMS manual page for dkms commands (status, autoinstall, remove, install)

## Issues Found
No technical issues found.

## Review Notes
- The DKMS section is correctly qualified with "If using DKMS-built Ceph modules" since standard Ceph kernel modules (rbd, ceph/libceph) ship as part of the mainline Linux kernel and are not typically managed via DKMS. This conditional framing is appropriate.
- The RBD features listed for disabling (object-map, fast-diff, deep-flatten) are the correct set that commonly cause issues with older kernel clients. Note that `exclusive-lock` is a prerequisite for `object-map`, but the command as written will work because `rbd feature disable` handles dependency ordering.
- The post focuses on Ubuntu commands (apt-get, HWE kernel). Other distributions would use different package managers and kernel package names, but this is an acceptable scope limitation for a guide.
- Ceph Quincy (17.2.x) is referenced as an example. The concepts apply equally to other Ceph releases (Reef 18.x, Squid 19.x) with their respective feature sets.
