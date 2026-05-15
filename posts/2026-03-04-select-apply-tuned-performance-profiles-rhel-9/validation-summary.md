# Validation Summary: How to Select and Apply TuneD Performance Profiles on RHEL

## Status
validated

## Post Type
Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- TuneD
- tuned-adm
- Linux performance profiles
- Linux sysfs performance inspection

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Monitoring and managing system status and performance - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/monitoring_and_managing_system_status_and_performance/index
- Red Hat Enterprise Linux 9 documentation: Configuring and managing virtualization - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_virtualization/configuring_and_managing_virtualization
- TuneD upstream README - https://github.com/redhat-performance/tuned
- TuneD upstream manual - https://tuned-project.org/docs/manual.html

## Issues Found
- The `network-latency` description said it tunes socket buffers. Red Hat documents this profile as disabling transparent huge pages and NUMA balancing and tuning network-related sysctl parameters, so the wording was corrected.
- The `network-throughput` description said it maximizes network throughput. Red Hat describes it as tuning streaming network throughput and generally being necessary only on older CPUs or 40G+ networks, so the wording was narrowed.
- The disk scheduler example assumed `/sys/block/sda/queue/scheduler` exists. The command is valid for an `sda` device, but RHEL systems may use other block device names such as NVMe devices, so the text now tells readers to replace `sda`.
- The conclusion recommended `latency-performance` for real-time workloads. Red Hat describes it as a low-latency profile, while real-time systems can involve separate real-time TuneD profiles, so the wording was changed to latency-sensitive workloads.

## Review Notes
The `tuned-adm list`, `profile`, `recommend`, `active`, and `verify` commands are valid for TuneD. Red Hat documentation confirms that multiple profiles can be activated together and that later profiles take priority for conflicting settings.
