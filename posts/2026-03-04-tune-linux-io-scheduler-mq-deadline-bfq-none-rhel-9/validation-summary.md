# Validation Summary: How to Tune the Linux I/O Scheduler (mq-deadline, bfq, none) on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux multi-queue block layer
- Linux I/O schedulers: mq-deadline, bfq, kyber, none
- udev rules
- TuneD
- fio benchmarking
- sysfs block queue scheduler and iosched tunables

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Setting the disk scheduler": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/htmlsingle/monitoring_and_managing_system_status_and_performance/monitoring-performance-by-using-the-metrics-rhel-system-role_monitoring-and-managing-system-status-and-performance
- Red Hat Enterprise Linux 9 PDF documentation, udev scheduler rule procedure: https://docs.redhat.com/en-us/documentation/red_hat_enterprise_linux/9/pdf/monitoring_and_managing_system_status_and_performance/Red_Hat_Enterprise_Linux-9-Monitoring_and_managing_system_status_and_performance-en-US.pdf
- Linux kernel documentation, "Switching Scheduler": https://docs.kernel.org/block/switching-sched.html
- Linux kernel documentation, "BFQ (Budget Fair Queueing)": https://docs.kernel.org/block/bfq-iosched.html
- Linux kernel documentation, "Deadline IO scheduler tunables": https://docs.kernel.org/block/deadline-iosched.html
- Red Hat Customer Portal, "How to use the Noop or None IO Schedulers": https://access.redhat.com/solutions/109223
- Local system man page for `udev`, checked for rule match syntax and `|` alternatives.

## Issues Found
- The post said RHEL offers only three multi-queue schedulers. RHEL 9 supports `none`, `mq-deadline`, `bfq`, and `kyber`, so the introduction now says the guide focuses on three of the four supported schedulers.
- The `mq-deadline` section overstated deadline behavior and default selection. It now uses RHEL's more precise wording that mq-deadline attempts to provide guaranteed latency and that the kernel selects defaults by device type, with NVMe defaulting to `none`.
- The `none` section called it "No-op" and described it as only passing requests through. It now describes RHEL 9 `none` as a minimal FIFO scheduler, matching Red Hat's documentation.
- The persistent kernel-parameter section recommended `elevator=mq-deadline`. Red Hat notes that `elevator=` no longer changes the I/O scheduler on RHEL 9, so the section now directs readers to udev or TuneD instead.
- The udev application command used a broad `udevadm trigger`. It now uses Red Hat's documented `udevadm trigger --type=devices --action=change`.
- The udev examples omitted `SUBSYSTEM=="block"`. The rules now include it to match block devices explicitly.
- The virtual disk recommendation said `none` unconditionally. Red Hat recommends `mq-deadline` for virtual guests, with `none` when using a multi-queue-capable HBA driver, so the relevant bullets, table row, and summary were corrected.

## Review Notes
The post remains a focused guide rather than a complete RHEL scheduler reference. A future update could add TuneD examples because Red Hat documents TuneD as a first-class persistent configuration method alongside udev.
