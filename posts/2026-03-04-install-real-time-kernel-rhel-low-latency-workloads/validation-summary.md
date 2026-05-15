# Validation Summary: How to Install the Real-Time Kernel on RHEL for Low-Latency Workloads

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- RHEL for Real Time
- kernel-rt
- dnf package groups
- grubby bootloader configuration
- TuneD realtime profiles
- realtime-tests, cyclictest, and tuna

## Sources Consulted
- Red Hat Enterprise Linux for Real Time 9, Installing RHEL 9 for Real Time: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_real_time/9/html-single/installing_rhel_9_for_real_time/installing_rhel_9_for_real_time
- Red Hat Enterprise Linux for Real Time 9, Specifying the RHEL kernel to run: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_real_time/9/html/installing_rhel_9_for_real_time/assembly_specifying-the-kernel-to-run_installing-rhel-9-for-real-time
- Red Hat Enterprise Linux for Real Time 9, Optimizing RHEL 9 for Real Time for low latency operation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_real_time/9/html/optimizing_rhel_9_for_real_time_for_low_latency_operation/
- Red Hat Enterprise Linux 9, Considerations in adopting RHEL 9 package replacement reference: https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/pdf/considerations_in_adopting_rhel_9/considerations-in-adopting-rhel-9.pdf

## Issues Found
- The install command installed only selected kernel packages. Red Hat documents installing the RHEL for Real Time package group with `dnf groupinstall RT`, which also installs supporting packages such as `realtime-setup`, `rteval`, and `tuned-profiles-realtime`. Updated the command accordingly.
- The verification command checked only `kernel-rt` RPM names. Red Hat's installation verification checks the `realtime-setup` files, so the post now uses `rpm -ql realtime-setup`.
- The `grubby --set-default` command built a `/boot/vmlinuz-*` path from `rpm -q --qf` output, which can fail or produce ambiguous output when multiple `kernel-rt-core` versions are installed. Updated it to query the latest installed `kernel-rt-core` package and select its `/boot/vmlinuz` path.
- The `uname -r` note said output should contain `.rt`, but RHEL 9 examples can include both an `rt` component and a `+rt` suffix. Updated the example and wording to match Red Hat documentation.
- The tuning tools command used `rt-tests`, which was replaced by `realtime-tests` in RHEL 9. Updated the package name.
- The CPU isolation example directly added `isolcpus`, `nohz_full`, and `rcu_nocbs` with `grubby`. Red Hat recommends configuring CPU isolation for the realtime TuneD profile through `/etc/tuned/realtime-variables.conf` using `isolated_cores`. Updated the example to use TuneD.

## Review Notes
The article is now technically aligned with the RHEL 9 for Real Time documentation. For future improvement, the guide could mention that Red Hat recommends tuning BIOS/firmware and the base platform before expecting deterministic latency results, but the current post remains accurate as an installation-focused walkthrough.
