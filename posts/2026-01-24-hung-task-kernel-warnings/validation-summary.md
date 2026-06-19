# Validation Summary: How to Fix 'Hung Task' Kernel Warnings

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Linux kernel hung task detector
- Linux sysctl kernel parameters
- Linux process state inspection with ps
- dmesg and systemd journal logs
- sysstat iostat disk I/O metrics
- SMART disk health checks with smartctl
- Linux software RAID md/mdadm
- NFS client mounts and nfs-utils commands
- kdump kernel crash dump tooling

## Sources Consulted
- Linux kernel sysctl documentation: https://docs.kernel.org/admin-guide/sysctl/kernel.html
- Linux nfs(5) manual page: https://man7.org/linux/man-pages/man5/nfs.5.html
- Linux iostat(1) manual page: https://man7.org/linux/man-pages/man1/iostat.1.html
- Linux showmount(8) manual page: https://linux.die.net/man/8/showmount
- Linux mdadm(8) manual page: https://man7.org/linux/man-pages/man8/mdadm.8.html
- Red Hat documentation for /proc/mdstat: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/6/html/deployment_guide/s2-proc-mdstat
- Ubuntu Server kernel crash dump documentation: https://ubuntu.com/server/docs/how-to/software/kernel-crash-dump/
- Red Hat Enterprise Linux kdump documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/managing_monitoring_and_updating_the_kernel/enabling-kdumpmanaging-monitoring-and-updating-the-kernel
- Local manual pages for journalctl(1), timeout(1), and iostat(1)

## Issues Found
- The NFS `showmount` example claimed that a `-t` flag sets a timeout, but `showmount` does not provide a timeout flag. Changed the example to wrap `showmount` with GNU `timeout`.
- The post recommended the NFS `intr` option as a way to interrupt stuck operations. The Linux NFS manual states that `intr` is ignored after kernel 2.6.25, so the example now notes this and shows a `hard` mount option for write-heavy workloads.
- The `/etc/fstab` NFS example described `soft` mounts as recommended. Because `soft` mounts can return I/O errors and risk data corruption, the example now uses `hard` for write-heavy workloads.
- The `iostat` metric list included `svctm`, which is absent from current sysstat output and is not a reliable current metric. Replaced it with current latency fields such as `r_await`, `w_await`, and `f_await`.
- The monitoring script read `awk '{print $10}'` from `iostat -x`, which is not reliably the await field and is wrong for current sysstat output. Replaced it with header-based parsing that checks current per-operation await fields and older combined `await` output.
- The sysctl section said to edit `/etc/sysctl.conf` while writing to `/etc/sysctl.d/99-hung-task.conf`. Updated the text to describe creating a sysctl.d configuration file.
- The kdump service commands used only `kdump`, which is not the Ubuntu/Debian service name for `kdump-tools`. Updated the commands to show `kdump-tools` for Debian/Ubuntu and `kdump` for RHEL/CentOS.

## Review Notes
The guide is technically relevant and broadly accurate after the corrections. Some hardware RAID tools such as MegaCli are vendor-specific and may be replaced by newer utilities on some systems, but the examples are still plausible as controller-dependent commands.
