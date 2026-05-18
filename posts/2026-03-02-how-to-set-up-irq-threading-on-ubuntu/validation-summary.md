# Validation Summary: How to Set Up IRQ Threading on Ubuntu

## Status
validated

## Post Type
Tutorial / Technical guide

## Technologies Covered
- Linux kernel (PREEMPT_RT, generic IRQ subsystem)
- `/proc/interrupts`, `/proc/irq/*/smp_affinity{,_list}`, `/proc/irq/*/affinity_hint`
- `chrt` (util-linux) for real-time scheduling
- `tuna` for IRQ/thread tuning
- `irqbalance` daemon
- `cyclictest` and `hwlatdetect` from the `rt-tests` package
- `cpupower` (idle-set / C-state control)
- `ethtool` (NIC channel configuration)
- systemd unit files

## Sources Consulted
- Linux kernel admin-guide: kernel-parameters (`threadirqs`) — https://www.kernel.org/doc/html/latest/admin-guide/kernel-parameters.html
- Linux Foundation Realtime wiki: threadirq — https://wiki.linuxfoundation.org/realtime/documentation/technical_details/threadirq
- kernel.org core-api real-time/theory — https://www.kernel.org/doc/html/next/core-api/real-time/theory.html
- SMP IRQ affinity docs — https://docs.kernel.org/core-api/irq/irq-affinity.html
- Linux generic IRQ handling — https://docs.kernel.org/core-api/genericirq.html
- Workqueue (cmwq) documentation — https://docs.kernel.org/core-api/workqueue.html
- tuna(8) man page — https://man.archlinux.org/man/extra/tuna/tuna.8.en
- Red Hat: Tuning IRQs with Tuna — https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/performance_tuning_guide/sec-tuna-irq-tuning
- cyclictest(8) Debian manpage — https://manpages.debian.org/testing/rt-tests/cyclictest.8.en.html
- cpupower-idle-set(1) — https://man.archlinux.org/man/extra/cpupower/cpupower-idle-set.1.en
- irqbalance(1) — https://manpages.debian.org/testing/irqbalance/irqbalance.1.en.html
- ethtool(8) — https://www.man7.org/linux/man-pages/man8/ethtool.8.html

## Issues Found
1. **Fictional kernel mechanisms for forcing threaded IRQs.** The original "IRQ Threads Not Showing Up" troubleshooting block claimed `/proc/sys/kernel/threaded_irqs` could be written to and that a `genirq_thread_all` kernel module existed. Neither exists. It also pointed at `/sys/bus/workqueue/devices/default/max_active` (a workqueue concurrency knob) as a way to check whether threaded IRQs are enabled, which is unrelated. Replaced the block with the correct mechanism: the `threadirqs` kernel boot parameter (`CONFIG_IRQ_FORCED_THREADING=y`), added to `GRUB_CMDLINE_LINUX` and applied with `update-grub` + reboot, plus a check against `/proc/cmdline` and a note that there is no runtime sysctl toggle.

2. **Wrong tuna flag for CPU selection.** `tuna --cpu=0 --move` was incorrect — the documented option is `--cpus=` (plural), as shown in tuna(8) and the Red Hat performance tuning guide (e.g., `tuna --irqs=128 --cpus=3 --move`). Changed to `--cpus=0`.

3. **Removed `tuna --gui` example.** The GTK-based tuna GUI has been dropped/unmaintained; current Ubuntu packages ship only the CLI, so the example would not work for most readers. Removed the line rather than leaving a broken instruction.

4. **Incorrect interpretation of `/proc/irq/<N>/affinity_hint`.** The post stated "IRQs with affinity_hint != 0 may be pinned by the driver." Per the kernel docs, `affinity_hint` is an advisory hint the driver sets via `irq_set_affinity_hint()` and does **not** change or pin the actual affinity — modern irqbalance largely ignores it. Actual non-balanceable IRQs are flagged via `IRQF_NO_BALANCING`, and an attempt to write `smp_affinity` for such an IRQ fails with `-EIO`. Rewrote the troubleshooting paragraph to reflect this and to suggest the correct diagnostic (the failed write to `smp_affinity`), while keeping the original `ethtool -L` workaround intact.

## Review Notes
- All other commands and flags verified correct: `chrt -f -p`, `cyclictest` long options (`--mlockall`, `--priority`, `--interval`, `--threads`, `--loops`, `--histogram`, `-q`), `cpupower idle-set -d <N>`, `IRQBALANCE_BANNED_CPULIST`, `IRQBALANCE_ARGS="--banirq=N"`, `ethtool -L eth0 combined N`, bitmask comment for `smp_affinity` (CPU0=1, CPU1=2, …).
- The claim that PREEMPT_RT defaults threaded IRQs to `SCHED_FIFO` priority 50 (`MAX_RT_PRIO/2`) is correct per the kernel realtime documentation.
- Minor caveat (not fixed, as it is conventional advice rather than an error): "Max < 50 microseconds" for a "well-configured system" via cyclictest depends heavily on hardware (SMIs, BIOS, CPU model). It is a reasonable rule of thumb on tuned commodity x86 but should not be taken as a guarantee.
- The startup script's `[[ "$irq_num" == "0" ]] && continue` check filters only IRQ 0; in practice the loop also iterates over non-numeric `/proc/irq/` entries (e.g., `default_smp_affinity`). The `[ -w ... ]` guard handles those safely, so no fix is needed.
