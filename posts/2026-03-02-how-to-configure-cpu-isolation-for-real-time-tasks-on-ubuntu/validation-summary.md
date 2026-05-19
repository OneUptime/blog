# Validation Summary: How to Configure CPU Isolation for Real-Time Tasks on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu 22.04
- Linux kernel CPU isolation
- `isolcpus`, `nohz_full`, and `rcu_nocbs` kernel parameters
- cgroup v2 cpuset controller
- `tuna`
- `taskset` and `chrt`
- IRQ affinity and `irqbalance`
- `cyclictest`, `stress-ng`, and `hwlatdetect`
- systemd oneshot services

## Sources Consulted
- Linux kernel CPU isolation documentation: https://docs.kernel.org/admin-guide/cpu-isolation.html
- Linux kernel command-line parameter documentation: https://www.kernel.org/doc/html/latest/admin-guide/kernel-parameters.html
- Linux kernel cgroup v2 documentation: https://www.kernel.org/doc/html/latest/admin-guide/cgroup-v2.html
- Ubuntu cgroups documentation: https://documentation.ubuntu.com/security/security-features/privilege-restriction/cgroups/
- Ubuntu 22.04 `tuna(8)` man page: https://manpages.ubuntu.com/manpages/jammy/man8/tuna.8.html
- Ubuntu 22.04 `irqbalance(1)` man page: https://manpages.ubuntu.com/manpages/jammy/man1/irqbalance.1.html
- Ubuntu `cyclictest(8)` man page: https://manpages.ubuntu.com/manpages/noble/en/man8/cyclictest.8.html
- Ubuntu `stress-ng(1)` man page: https://manpages.ubuntu.com/manpages/noble/man1/stress-ng.1.html
- Local `taskset(1)`, `chrt(1)`, and `cgroups(7)` man pages

## Issues Found
- The description of isolated CPUs implied that only explicitly pinned processes can run there. Updated it to note that interrupts and some kernel threads must be handled separately.
- The `isolcpus` example omitted the `domain` flag used by current kernel documentation for scheduler-domain isolation. Updated the GRUB example and parameter explanation to `isolcpus=domain,2,3`.
- The `rcu_nocbs` explanation did not mention that `nohz_full` also offloads RCU callbacks for those CPUs. Added that clarification.
- The process verification command used `awk '$2 >= 2'`, which would include non-isolated CPUs on systems with more than four CPUs. Changed it to match only CPUs 2 and 3.
- The cgroup example used cgroup v1 paths and `cgroup-tools` commands, while modern Ubuntu uses the unified cgroup v2 hierarchy. Replaced it with cgroup v2 commands using `/sys/fs/cgroup`, `cgroup.subtree_control`, `cpuset.cpus`, `cpuset.mems`, `cpuset.cpus.partition`, and `cgroup.procs`.
- The `tuna` section said it displayed CPU and IRQ assignments but only ran `--show_threads`. Added `--show_irqs`.
- The IRQ affinity loop wrote to `/proc/irq/*/smp_affinity_list` with shell redirection that would fail outside a root shell. Changed it to use `sudo tee`.
- The latency expectation claimed proper isolation should produce less than 50 microseconds maximum latency. Reworded it because this depends on hardware, firmware, BIOS settings, kernel configuration, and workload.

## Review Notes
The post is technically relevant and suitable as a tutorial. `isolcpus` remains available, but current kernel documentation recommends cpuset isolated partitions where runtime reconfiguration is needed. Actual real-time latency guarantees still depend on platform tuning beyond CPU isolation, including SMT, CPU frequency scaling, C-states, device IRQ placement, firmware behavior, and application design.
