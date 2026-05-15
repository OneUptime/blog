# Validation Summary: How to Configure Kernel Samepage Merging (KSM) for Memory Deduplication on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Kernel Samepage Merging (KSM)
- KVM virtualization
- systemd services
- ksmtuned
- Linux sysfs

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Enabling and disabling kernel same-page merging: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/monitoring_and_managing_system_status_and_performance/monitoring_and_managing_system_status_and_performance
- Red Hat Enterprise Linux 7 Virtualization Tuning and Optimization Guide, Kernel Same-page Merging (KSM): https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/virtualization_tuning_and_optimization_guide/chap-KSM
- Linux kernel documentation, Kernel Samepage Merging: https://docs.kernel.org/admin-guide/mm/ksm.html

## Issues Found
- Added `ksmtuned` to the prerequisites because current Red Hat documentation requires the service package to be installed before enabling the `ksm` and `ksmtuned` services.
- Corrected the meanings of `pages_shared`, `pages_sharing`, and `pages_unshared` to match the Linux kernel KSM sysfs documentation. In particular, `pages_sharing` is the additional shared mappings and is the approximate page-savings counter, not the total number of pages using shared copies.
- Changed the memory-savings formula and shell example to use `getconf PAGESIZE` instead of assuming all systems use 4 KB pages.
- Added `DEBUG=1` to the `ksmtuned.conf` snippet because Red Hat documentation states that KSM tuning activity is written to the configured `LOGFILE` when debug logging is enabled.

## Review Notes
The core KSM explanation, systemd service commands, sysfs tuning paths, and monitoring commands are technically valid for RHEL systems with KSM and ksmtuned available. Future improvements could mention RHEL version differences and NUMA-related `merge_across_nodes` tuning, but those are not required to make the current guide correct.
