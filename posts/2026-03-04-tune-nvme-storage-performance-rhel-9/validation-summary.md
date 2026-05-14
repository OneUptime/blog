# Validation Summary: How to Tune NVMe Storage Performance on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- NVMe and nvme-cli
- Linux block queue sysfs settings
- udev rules
- IRQ affinity and irqbalance
- XFS and ext4 file systems
- TRIM/discard with fstrim.timer
- NUMA and numactl
- TuneD
- fio benchmarking
- sysstat iostat

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, disk scheduler guidance: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/htmlsingle/monitoring_and_managing_system_status_and_performance/monitoring-performance-by-using-the-metrics-rhel-system-role_monitoring-and-managing-system-status-and-performance
- Red Hat Enterprise Linux documentation, setting disk scheduler with udev rules: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/managing_storage_devices/setting-the-disk-scheduler_managing-storage-devices
- Linux kernel block queue sysfs documentation: https://docs.kernel.org/5.10/block/queue-sysfs.html
- Red Hat Enterprise Linux 9 documentation, discarding unused blocks and fstrim.timer: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_storage_devices/discarding-unused-blocks_managing-storage-devices
- Red Hat Enterprise Linux 9 documentation, XFS characteristics and file-system creation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_file_systems/managing_file_systems
- Red Hat documentation, XFS allocation groups guidance: https://docs.redhat.com/en/documentation/red_hat_gluster_storage/3/html/administration_guide/brick_configuration
- Red Hat Enterprise Linux documentation, numactl options: https://docs.redhat.com/de/documentation/red_hat_enterprise_linux/7/html/performance_tuning_guide/sect-red_hat_enterprise_linux-performance_tuning_guide-tool_reference-numactl
- fio official documentation: https://fio.readthedocs.io/en/master/fio_doc.html
- nvme-cli manual pages: https://man.archlinux.org/man/nvme.1

## Issues Found
- The scheduler section said the Linux I/O scheduler adds unnecessary overhead for NVMe in general. Changed this to the RHEL 9-specific fact that NVMe defaults to `none` and Red Hat recommends not changing it.
- The persistent udev rule did not include `SUBSYSTEM=="block"` or the reload/trigger commands shown in Red Hat's scheduler procedure. Added them.
- The queue-depth section described `nr_requests` as something that should be set to a maximum and used `1023` as that maximum. Changed the wording to describe it as a software request limit that should be changed only when benchmarks justify it, and made the command an example rather than a universal maximum.
- The hardware queue explanation claimed NVMe creates one hardware queue per CPU core by default. Changed this to note that NVMe commonly exposes multiple queues, often up to one per CPU when the controller and interrupt resources support it.
- The IRQ section claimed NVMe uses one MSI-X interrupt per queue. Changed this to the more accurate statement that NVMe devices typically use MSI-X interrupts associated with queues.
- The XFS example forced `agcount=32`. Red Hat guidance indicates mkfs.xfs normally chooses an appropriate allocation group count, and hard-coding the count is not generally correct. Changed the command to use the default `mkfs.xfs -f` behavior and adjusted the explanation.
- The SMART `percentage_used` note said 100% means end of life. Changed it to say 100% means estimated endurance has been consumed and values can exceed 100.
- The TuneD section claimed `throughput-performance` includes NVMe optimizations. Changed this to the more accurate statement that it applies throughput-oriented system settings that can help storage-heavy workloads.

## Review Notes
The remaining commands and snippets are syntactically plausible for RHEL 9 systems with the relevant packages installed. Several tuning values, such as read-ahead size, IRQ affinity, and fio depth/job count, remain workload-dependent and should be validated with benchmarks on the target hardware.
