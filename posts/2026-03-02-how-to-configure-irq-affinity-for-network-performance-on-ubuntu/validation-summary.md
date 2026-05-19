# Validation Summary: How to Configure IRQ Affinity for Network Performance on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- Linux IRQ affinity
- Linux procfs and sysfs
- Network interface queues and RSS
- ethtool
- irqbalance
- systemd services
- RPS and RFS
- NUMA-aware network tuning

## Sources Consulted
- Linux kernel documentation: SMP IRQ affinity, https://docs.kernel.org/core-api/irq/irq-affinity.html
- Linux kernel documentation: Scaling in the Linux Networking Stack, https://docs.kernel.org/networking/scaling.html
- Linux manual page: /proc/interrupts, https://man7.org/linux/man-pages/man5/proc_interrupts.5.html
- Ubuntu manpage: irqbalance, https://manpages.ubuntu.com/manpages/jammy/man1/irqbalance.1.html
- Ubuntu package metadata: irqbalance, https://launchpad.net/ubuntu/oracular/+package/irqbalance
- ethtool manual page / kernel ethtool documentation for channel options, https://manpages.ubuntu.com/manpages/noble/en/man8/ethtool.8.html
- systemd.service manual, https://www.freedesktop.org/software/systemd/man/254/systemd.service.html

## Issues Found
- The post described `/proc/interrupts` as showing CPU affinity. I changed the command comment to say it lists interrupt counts by CPU, which matches the procfs documentation.
- The post stated that IRQ affinity "directly translates" to lower latency and higher throughput. I changed this to "can translate" because the performance effect depends on workload, hardware, queue layout, and CPU locality.
- The RSS section described multiple transmit/receive queues as RSS and implied every queue has an IRQ. I narrowed the wording: RSS is receive-side flow distribution across receive queues, and receive queues typically have IRQs/channels depending on driver and hardware.
- Manual writes to `/proc/irq/.../smp_affinity`, `/proc/irq/.../smp_affinity_list`, and `/sys/class/net/...` used shell redirection without privilege handling. I changed those examples to `sudo tee` so the write itself runs with elevated privileges.
- The RFS example set `rps_sock_flow_entries` to 32768 but `rps_flow_cnt` to 4096 while discussing a single receive queue fallback. I changed the per-queue value to 32768, matching the kernel documentation's normal single-queue configuration guidance.

## Review Notes
The systemd oneshot service, irqbalance commands, ethtool channel commands, IRQ affinity bitmask examples, RPS/RFS paths, and NUMA node check are technically valid. In a future revision, the post could mention that some modern drivers expose managed IRQs or reset affinities dynamically, and that queue counts should usually be chosen with CPU topology and NUMA locality in mind rather than blindly matching all logical CPUs.
