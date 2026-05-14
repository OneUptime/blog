# Validation Summary: How to Tune the vm.swappiness Parameter on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux kernel virtual memory management
- `vm.swappiness`
- `sysctl` and `/etc/sysctl.d/`
- `vmstat`, `sar`, and `/proc/meminfo`
- Kubernetes Linux node swap behavior

## Sources Consulted
- Linux kernel documentation for `/proc/sys/vm`, including `vm.swappiness`: https://docs.kernel.org/admin-guide/sysctl/vm.html
- Red Hat Enterprise Linux 9 documentation, "Configuring an operating system to optimize memory access": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/configuring-an-operating-system-to-optimize-memory-access_monitoring-and-managing-system-status-and-performance
- Red Hat Enterprise Linux 9 documentation, "Getting started with swap": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_storage_devices/getting-started-with-swap_managing-storage-devices
- Kubernetes documentation, "Swap memory management": https://kubernetes.io/docs/concepts/cluster-administration/swap-memory-management/
- Kubernetes documentation, "Configuring swap memory on Kubernetes nodes": https://kubernetes.io/docs/tutorials/cluster-management/provision-swap-memory/
- Linux `sysctl(8)` manual page: https://man7.org/linux/man-pages/man8/sysctl.8.html
- Linux `vmstat(8)` manual page: https://man7.org/linux/man-pages/man8/vmstat.8.html
- Linux `sar(1)` manual page: https://man7.org/linux/man-pages/man1/sar.1.html

## Issues Found
- The post described higher swappiness values as "closer to 100". Current Linux kernel and RHEL 9 performance documentation describe the valid range as `0` to `200`, so this was changed to "closer to 200".
- The post said `vm.swappiness=0` will still swap to prevent OOM conditions. The kernel documentation is more specific: at `0`, swap is not initiated until free and file-backed pages are below the high watermark, and Red Hat warns this can increase OOM-killer risk. The wording was changed to "can still swap under severe memory pressure" and the minimal-swap table note now mentions OOM-killer risk.
- The Kubernetes example recommended `vm.swappiness = 0` for swap-enabled nodes. Kubernetes swap support is configurable and Red Hat warns that `0` can increase OOM-killer risk, so the example was changed to `10` while keeping the recommendation low.
- The monitoring section listed `buff/cache` as a `vmstat` column. `vmstat` reports separate `buff` and `cache` columns, so the wording was corrected.

## Review Notes
- The `sysctl`, `/proc/sys/vm/swappiness`, `/etc/sysctl.d/`, `sysctl -p`, `vmstat 1 10`, `sar -W 1 10`, and `/proc/meminfo` examples are syntactically valid.
- The workload ranges are reasonable guidance, but should still be treated as starting points for measurement rather than universal defaults.
