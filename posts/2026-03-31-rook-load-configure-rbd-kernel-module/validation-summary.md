# Validation Summary: How to Load and Configure the RBD Kernel Module

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux kernel modules (modprobe, lsmod, modinfo)
- Ceph RADOS Block Device (RBD)
- Rook-Ceph (Kubernetes context)
- sysfs interface for kernel module parameters
- systemd modules-load.d for persistent module loading

## Sources Consulted
- Linux kernel documentation for the rbd module and its parameters (single_major, rbd_major)
- Linux kernel sysfs block device interface (`/sys/block/*/queue/` vs `/sys/bus/rbd/devices/`)
- Ceph official documentation for `rbd device map` and `rbd device list` commands
- Kubernetes Rook-Ceph documentation on RBD volume access modes (ReadWriteOnce vs ReadWriteMany)
- Linux man pages for modprobe, modinfo, lsmod
- POSIX/bash shell semantics for heredoc redirection in pipelines

## Issues Found

1. **Incorrect claim about ReadWriteMany (Line 13):** The post stated the rbd kernel module "is required for features like ReadWriteMany in some Kubernetes environments." RBD is a block device that provides ReadWriteOnce (RWO) access in Kubernetes. ReadWriteMany (RWX) is typically provided by CephFS, not RBD. Changed to accurately describe RBD as commonly used for ReadWriteOnce block storage, and corrected "FUSE-based approach" to "userspace `librbd` approach" since the alternative to kernel rbd is librbd (not FUSE, which is for CephFS).

2. **Incorrect comment for rbd_major parameter (Line 59):** The comment said "Set the number of request queues" but `rbd_major` sets the major device number for rbd block devices, not the number of request queues. Fixed the comment to accurately describe the parameter.

3. **Incorrect sysfs path for block device queue (Lines 101-102):** The path `/sys/bus/rbd/devices/0/queue/nr_requests` is incorrect. Block device queue parameters are accessed via the block device sysfs hierarchy at `/sys/block/rbd0/queue/nr_requests`, not via the rbd bus device path. Fixed the path.

4. **Broken heredoc pipeline command (Line 110):** The command `cat | sudo tee /etc/modprobe.d/rbd.conf << 'EOF'` is problematic. In this form, the heredoc redirects stdin of `tee` (overriding the pipe), while `cat` hangs waiting for terminal input indefinitely. Fixed to `cat << 'EOF' | sudo tee /etc/modprobe.d/rbd.conf` which correctly feeds the heredoc through `cat` into `tee`.

## Review Notes
- The post correctly covers the core workflow of loading, verifying, and persisting the rbd kernel module, as well as mapping RBD images.
- The `single_major` parameter has been the default in modern kernels (since Linux 4.9+), so explicitly setting it may not be necessary on recent systems, but it is not incorrect to show.
- The `rbd device map` command shown uses the long form; `rbd map` is the shorter alias that also works.
