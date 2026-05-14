# Validation Summary: How to Tune XFS File System Performance with Mount Options on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- XFS filesystem
- XFS mount options and `mkfs.xfs` options
- Linux block device read-ahead
- Linux multi-queue I/O schedulers
- `fio` benchmarking
- `fstrim.timer`
- udev rules

## Sources Consulted
- Red Hat Enterprise Linux 9 Managing file systems: https://docs.redhat.com/en-us/documentation/red_hat_enterprise_linux/9/html/managing_file_systems/
- Red Hat Enterprise Linux 9 Monitoring and managing system status and performance, disk scheduler documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/htmlsingle/monitoring_and_managing_system_status_and_performance/
- Red Hat Customer Portal solution on XFS `nobarrier` mount failures in RHEL 8/9/10: https://access.redhat.com/solutions/5315771
- Linux XFS man page (`xfs(5)`): https://www.mankier.com/5/xfs
- Linux kernel XFS documentation: https://www.kernel.org/doc/html/v5.7/admin-guide/xfs.html
- Linux `mkfs.xfs(8)` man page: https://man7.org/linux/man-pages/man8/mkfs.xfs.8.html
- Linux `mount(2)` and `mount(8)` man pages: https://man7.org/linux/man-pages/man2/mount.2.html and https://man7.org/linux/man-pages/man8/mount.8.html
- util-linux `blockdev(8)` local man page
- fio official documentation: https://fio.readthedocs.io/en/master/fio_doc.html
- systemd `fstrim.timer` unit on the local system

## Issues Found
- The post stated that Linux updates atime every time files are read by default. This is inaccurate for modern Linux/RHEL defaults, which generally use `relatime`. Updated the explanation and the `relatime` behavior to include the mtime/ctime and 24-hour rules.
- The post recommended the XFS `nobarrier` mount option. On RHEL 9, XFS no longer supports `barrier` or `nobarrier`, and adding `nobarrier` can cause mounts to fail. Replaced the section with a RHEL 9-specific warning not to use those options.
- The `largeio` explanation said it hints the filesystem to prefer larger I/O operations. XFS documentation describes `largeio` as changing the optimal I/O value reported through `stat(2)` based on stripe width or `allocsize`; it does not force larger physical I/O. Corrected the description.
- The block size section implied larger XFS block sizes up to 65536 bytes are generally usable on RHEL. `mkfs.xfs` accepts values up to 64 KiB, but Linux can only mount XFS filesystems whose block size is no larger than the system page size. Updated the text to call out the common 4096-byte x86_64 RHEL limit.
- The allocation group section said the default is typically four allocation groups. Current `mkfs.xfs` scales the default automatically based on the underlying device size. Corrected the default behavior.
- The I/O scheduler section described `none` as also called `noop`. RHEL 9 uses multi-queue schedulers and the older single-queue schedulers have been removed. Updated the recommendation to describe `none` directly for high-performance SSDs or CPU-bound systems with fast storage.
- The `allocsize` section recommended a smaller fixed allocation size for small-file workloads. Adjusted the wording to favor the default dynamic behavior unless benchmarking shows a smaller fixed value helps.

## Review Notes
The remaining commands and examples are syntactically plausible for RHEL-style systems, but storage tuning remains workload- and hardware-dependent. The udev scheduler rule shown targets `sd*` devices only; NVMe devices would need a separate match pattern in a future expansion.
