# Validation Summary: How to Diagnose and Resolve High I/O Wait on RHEL

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux CPU and I/O wait metrics
- `top`, `vmstat`, `iostat`, `iotop`, `fatrace`, `strace`, `smartctl`, `perf`
- Linux block devices and I/O schedulers
- XFS and filesystem write barriers
- Linux software RAID (`md`)
- Linux VM dirty page sysctls

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Overview of performance monitoring options": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/overview-of-performance-monitoring-options
- Red Hat Enterprise Linux 9 documentation, "Setting the disk scheduler": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/setting-the-disk-scheduler_monitoring-and-managing-system-status-and-performance
- Linux kernel documentation, `/proc/sys/vm`: https://www.kernel.org/doc/html/latest/admin-guide/sysctl/vm.html
- Linux kernel documentation, MD RAID arrays: https://docs.kernel.org/admin-guide/md.html
- Red Hat Customer Portal, XFS `nobarrier` failures on RHEL 8/9/10: https://access.redhat.com/solutions/5315771
- Red Hat Enterprise Linux 7 storage documentation, write barriers: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/storage_administration_guide/writebarrieronoff
- strace man page: https://man7.org/linux/man-pages/man1/strace.1.html
- iotop man page: https://man7.org/linux/man-pages/man8/iotop.8.html
- Fedora Packages, `fatrace` in EPEL 9: https://packages.fedoraproject.org/pkgs/fatrace/fatrace/epel-9.html
- Local man pages checked: `iostat(1)`, `strace(1)`, `perf-record(1)`, `sysctl.conf(5)`

## Issues Found
- The post stated that `%wa` values consistently above 20% indicate a storage bottleneck. I changed this to "often indicate" storage I/O is limiting the workload because I/O wait is a symptom and should not be treated as a guaranteed root cause.
- The `iostat` guidance implied `%util` near 100% always identifies a physical-device bottleneck. I qualified this for devices that handle requests serially and changed "physical device" to "block device or volume" because modern SSDs, RAID, and device-mapper stacks can make `%util` less definitive.
- The `fatrace` install command implied the package is available in standard RHEL repositories. I noted that it is available from EPEL or other enabled repositories.
- The `strace` example used `trace=read,write,open`, which can miss modern file-opening calls such as `openat`. I changed it to `trace=%file,read,write`.
- The post recommended `mount -o remount,nobarrier /data`. On RHEL 9 with XFS, `nobarrier` is deprecated/unsupported and can cause mount failures. I replaced this with guidance not to use `nobarrier` on RHEL 9 XFS and a `findmnt` command to inspect filesystem type and mount options.
- The RAID rebuild example said "reduce rebuild speed" while writing to `speed_limit_max`, which caps the maximum rather than directly reducing a current rate. I changed the comment to "Cap rebuild speed."

## Review Notes
The remaining commands and configuration snippets are technically plausible for RHEL/Linux environments, but several tools may require packages or privileges that are not installed by default. Scheduler examples are temporary runtime changes; persistent scheduler configuration should use TuneD or udev rules in production.
