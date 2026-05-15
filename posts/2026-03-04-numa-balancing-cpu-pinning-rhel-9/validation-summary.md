# Validation Summary: How to Configure NUMA Balancing and CPU Pinning on RHEL

## Status
validated

## Post Type
Tutorial / guide

## Technologies Covered
- Red Hat Enterprise Linux
- Linux NUMA topology and automatic NUMA balancing
- numactl and numastat
- taskset / util-linux CPU affinity
- systemd service CPU affinity and NUMA policies
- KVM/libvirt virtual CPU pinning and NUMA tuning
- Linux sysctl kernel and VM parameters

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring an operating system to optimize CPU utilization - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/configuring-an-operating-system-to-optimize-cpu-utilization_monitoring-and-managing-system-status-and-performance
- Red Hat Enterprise Linux 9 documentation: Optimizing virtual machine performance - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/optimizing-virtual-machine-performance-in-rhel_monitoring-and-managing-system-status-and-performance
- Red Hat Enterprise Linux 9.2 release notes: kernel.numa_balancing sysctl parameter - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/9.2_release_notes/kernel_parameters_changes
- Red Hat Enterprise Linux 7 documentation: Automatic NUMA Balancing behavior - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html-single/virtualization_tuning_and_optimization_guide/virtualization_tuning_and_optimization_guide
- Linux kernel documentation: /proc/sys/vm/ zone_reclaim_mode - https://docs.kernel.org/admin-guide/sysctl/vm.html
- libvirt domain XML format documentation - https://www.libvirt.org/formatdomain.html
- systemd.exec documentation for CPUAffinity, NUMAPolicy, and NUMAMask - https://www.freedesktop.org/software/systemd/man/systemd.exec.html
- Local man pages: numactl(8), numastat(8), taskset(1), sysctl(8), lscpu(1), systemd.exec(5)

## Issues Found
- The post stated that a high `numa_miss` count means the workload is frequently accessing remote memory. `numastat` defines `numa_miss` as memory allocated on a node despite a preference for a different node, so I changed the wording to describe allocation misses and to recommend comparing it with `numa_hit`, `local_node`, and `other_node`.
- The `vm.zone_reclaim_mode` sysctl comments incorrectly described `0` as local-only reclaim and `1` as allowing remote reclaim. The Linux kernel documentation states that `0` disables zone reclaim and allows allocations from other nodes, while `1` enables zone reclaim before off-node allocation. I corrected the comments.

## Review Notes
The examples use valid commands, options, systemd directives, and libvirt XML elements for the covered workflow. Performance improvement percentages and exact NUMA latency penalties are workload- and hardware-dependent, so readers should continue to benchmark before and after applying these settings.
