# Validation Summary: How to Configure systemd Resource Control with Cgroup v2 on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- systemd resource control
- cgroups v2
- systemd service and slice units
- CPU, memory, and I/O cgroup controllers

## Sources Consulted
- Red Hat Enterprise Linux 8 documentation: Configuring resource management by using cgroups-v2 and systemd - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/managing_monitoring_and_updating_the_kernel/assembly_configuring-resource-management-using-systemd_managing-monitoring-and-updating-the-kernel
- Red Hat Enterprise Linux 9 documentation: Understanding control groups - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_monitoring_and_updating_the_kernel/setting-limits-for-applications_managing-monitoring-and-updating-the-kernel
- systemd.resource-control(5) official manual - https://www.freedesktop.org/software/systemd/man/254/systemd.resource-control.html
- systemd-cgtop(1) manual - https://man7.org/linux/man-pages/man1/systemd-cgtop.1.html
- Local systemd.resource-control(5), systemd.service(5), and systemd.unit(5) man pages

## Issues Found
- The post stated that cgroup v2 is enabled by default on RHEL generally. Red Hat documents that RHEL 8 defaults to cgroups v1, while RHEL 9 defaults to cgroups v2. Updated the introduction and prerequisites to say RHEL 9 or later, and noted that RHEL 8 requires enabling cgroup v2 first.
- The memory table described `MemoryLow` as a best-effort reservation and `MemoryMin` as a hard memory reservation. Red Hat and systemd describe these as soft and hard memory protection. Updated those descriptions to match official terminology.
- After assigning `myapp.service` to `apps.slice`, the verification commands still read from `/sys/fs/cgroup/system.slice/myapp.service`. Updated the cgroup file paths to `/sys/fs/cgroup/apps.slice/myapp.service` so they match the configured slice.

## Review Notes
The remaining systemd properties and examples (`CPUQuota`, `CPUWeight`, `MemoryMax`, `MemoryHigh`, `MemorySwapMax`, `IOWeight`, `IOReadBandwidthMax`, `IOWriteBandwidthMax`, `Slice`, `systemctl edit`, `daemon-reload`, and `systemd-cgtop`) are valid for cgroup v2/systemd resource control. For future improvement, the post could mention that `systemctl set-property` applies many resource properties immediately, but that was not required to correct the existing tutorial.
