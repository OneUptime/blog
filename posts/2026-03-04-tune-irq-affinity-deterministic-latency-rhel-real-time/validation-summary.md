# Validation Summary: How to Tune IRQ Affinity for Deterministic Latency on RHEL Real-Time

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux for Real Time
- Linux IRQ affinity
- `/proc/interrupts` and `/proc/irq/*/smp_affinity`
- `irqbalance`
- `tuna`
- `systemd`

## Sources Consulted
- Linux kernel SMP IRQ affinity documentation: https://docs.kernel.org/core-api/irq/irq-affinity.html
- Linux kernel `/proc` filesystem documentation: https://docs.kernel.org/filesystems/proc.html
- Linux kernel managed IRQ documentation: https://docs.kernel.org/core-api/irq/managed_irq.html
- Red Hat Enterprise Linux for Real Time 8 low latency optimization guide: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_real_time/8/pdf/optimizing_rhel_8_for_real_time_for_low_latency_operation/Red_Hat_Enterprise_Linux_for_Real_Time-8-Optimizing_RHEL_8_for_Real_Time_for_low_latency_operation-en-US.pdf
- Red Hat Enterprise Linux for Real Time 10 low latency optimization guide: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_real_time/10/html-single/optimizing_rhel_for_real_time_for_low_latency_operation/index
- Red Hat Enterprise Linux 7 Performance Tuning Guide, Tuna IRQ tuning: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/single/performance_tuning_guide/sec-tuna-irq-tuning
- Upstream irqbalance manual: https://www.mankier.com/1/irqbalance

## Issues Found
- The manual IRQ affinity loop wrote directly to `/proc/irq/*/smp_affinity`, which only works from an already-root shell. Changed it to use `sudo tee` so the redirection succeeds when run as a normal administrative user.
- The irqbalance section was titled as a policy script but used an environment setting, not a policy script. Renamed the section to "Use irqbalance with Banned CPUs".
- The irqbalance configuration used `IRQBALANCE_BANNED_CPULIST=2-7`. Upstream irqbalance supports this newer variable, but Red Hat Real Time documentation for `/etc/sysconfig/irqbalance` documents `IRQBALANCE_BANNED_CPUS` as a hexadecimal CPU mask. Changed the RHEL-focused example to `IRQBALANCE_BANNED_CPUS=000000fc` for CPUs 2-7.
- The `tuna` example used the older option-style command form. Updated it to the current RHEL Real Time 10 documented subcommand form: `tuna move --irqs='*' --cpus=0,1` and `tuna show_irqs --irqs='*'`.
- The verification command checked cumulative `/proc/interrupts` counters, which can show past interrupts on isolated CPUs even after affinity is corrected. Replaced it with a check of `/proc/irq/*/effective_affinity_list` for CPUs 2-7.

## Review Notes
Some IRQs, especially managed interrupts, may not accept manual affinity changes. The post already suppresses errors for non-movable IRQs; future improvements could briefly mention managed IRQ behavior and kernel boot-time affinity options, but the current examples are technically valid after the fixes above.
