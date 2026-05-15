# Validation Summary: How to Use systemd Slice Units to Organize Resource Allocation on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- systemd slice units
- Linux cgroups v2
- systemd resource control properties
- systemctl, systemd-cgtop, and systemd-cgls

## Sources Consulted
- Red Hat Enterprise Linux 8 documentation: Configuring resource management by using cgroups-v2 and systemd - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/managing_monitoring_and_updating_the_kernel/assembly_configuring-resource-management-using-systemd_managing-monitoring-and-updating-the-kernel
- systemd.resource-control(5) official documentation - https://www.freedesktop.org/software/systemd/man/latest/systemd.resource-control.html
- systemd.slice(5) official documentation - https://www.freedesktop.org/software/systemd/man/latest/systemd.slice.html

## Issues Found
- The "Resource Inheritance" explanation said child slices inherit limits from their parents. This was too broad because cgroup limits constrain descendants, while weight-based settings such as CPUWeight and IOWeight are relative distribution settings rather than inherited hard limits. Updated the wording to say parent resource limits constrain child slices and kept the MemoryMax example.

## Review Notes
- The examples use cgroups v2 resource-control properties such as CPUWeight, MemoryMax, MemoryHigh, and IOWeight, which are valid for systemd resource control. RHEL 8 uses cgroups v1 by default, while the post prerequisite correctly scopes the tutorial to systems with cgroups v2 enabled.
