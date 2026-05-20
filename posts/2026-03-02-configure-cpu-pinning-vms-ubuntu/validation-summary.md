# Validation Summary: How to Configure CPU Pinning for VMs on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- KVM/QEMU virtualization
- libvirt and virsh
- CPU pinning and scheduler tuning
- NUMA tuning
- Linux CPU isolation
- hwloc, numactl, perf, sysbench, cyclictest, virt-top

## Sources Consulted
- libvirt Domain XML format: https://www.libvirt.org/formatdomain
- libvirt virsh manual: https://www.libvirt.org/manpages/virsh.html
- libvirt KVM real-time guest configuration: https://www.libvirt.org/kbase/kvm-realtime.html
- Linux kernel CPU isolation documentation: https://docs.kernel.org/admin-guide/cpu-isolation.html
- Linux kernel command-line parameters documentation: https://www.kernel.org/doc/html/latest/admin-guide/kernel-parameters.html
- hwloc/lstopo documentation: https://www.open-mpi.org/projects/hwloc/doc/v2.12.2/tools.html
- Debian lstopo man page: https://manpages.debian.org/unstable/hwloc/lstopo.1.en.html
- Debian cyclictest man page: https://manpages.debian.org/rt-tests/cyclictest
- Local command help/output for lscpu, numactl, and perf

## Issues Found
- The NUMA XML example placed `<numatune>` inside `<cputune>`. In libvirt domain XML, `<numatune>` is a domain-level element, so it was moved outside `<cputune>`.
- The CPU isolation section said isolated CPUs are no longer used for any host processes. Linux `isolcpus` removes CPUs from normal scheduler load balancing, but explicitly affined tasks, interrupts, and workqueues can still target them. The wording was corrected.
- The real-time scheduler example used unsupported `virsh schedinfo` keys (`vcpu_scheduler_type` and `vcpu_scheduler_priority`). The section now shows the supported XML `<vcpusched>` configuration.
- The CPU quota examples used `cpu_quota` and `cpu_period`, which are not QEMU/KVM `virsh schedinfo` parameters. They were changed to `global_quota` and `global_period` for the stated domain-wide limit, and the removal command now uses `global_quota=-1`.
- The CPU shares comment described `1024` as the default unconditionally. libvirt documents OS/cgroup-dependent defaults, so the comment now says this is a common cgroups v1 default.

## Review Notes
The remaining commands and snippets are technically plausible for current Ubuntu/libvirt environments, though several tools require package installation and elevated privileges. `isolcpus` is documented by the Linux kernel as deprecated in favor of cpusets for scheduler-domain isolation, but it remains available and is still commonly used in boot-time isolation examples.
