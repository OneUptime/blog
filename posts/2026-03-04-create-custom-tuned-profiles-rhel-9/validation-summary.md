# Validation Summary: How to Create Custom TuneD Profiles on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- TuneD
- `tuned-adm`
- TuneD profile configuration
- Linux `sysctl`
- Linux block device tuning
- Bash activation/deactivation scripts

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Customizing TuneD profiles": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/customizing-tuned-profiles_monitoring-and-managing-system-status-and-performance
- Red Hat Enterprise Linux 9 documentation, "Creating new TuneD profiles": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/customizing-tuned-profiles_monitoring-and-managing-system-status-and-performance#creating-new-tuned-profiles_customizing-tuned-profiles
- Red Hat Enterprise Linux 9 documentation, "Setting the disk scheduler using TuneD": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/customizing-tuned-profiles_monitoring-and-managing-system-status-and-performance#setting-the-disk-scheduler-using-tuned_customizing-tuned-profiles
- TuneD project documentation, "Optimizing system throughput, latency, and power consumption": https://tuned-project.org/docs/manual.html

## Issues Found
No technical issues found.

## Review Notes
The profile locations, `[main] include` inheritance, `sysctl`, `cpu`, `disk`, `vm`, and `script` plug-in usage match the RHEL 9 and TuneD documentation. The `tuned-adm profile`, `tuned-adm active`, and `tuned-adm verify` commands are documented for creating and verifying custom profiles. The disk examples use device names such as `sda` and `sdb`; these are valid examples, but users on systems with NVMe, virtio, or other block device names should substitute their actual devices or use udev-based matching as shown in the Red Hat disk scheduler documentation.
