# Validation Summary: How to Troubleshoot High CPU Usage in Linux

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Linux CPU accounting and load averages
- procps-ng tools: top, ps, vmstat, uptime
- sysstat tools: mpstat, pidstat, iostat, sar
- perf and strace profiling
- cgroups v1 and cgroups v2 CPU limits
- systemd resource controls
- nice, renice, taskset, ionice, pkill, ss, netstat, lsof
- CPU frequency governors

## Sources Consulted
- procps-ng top(1) manual: https://man7.org/linux/man-pages/man1/top.1.html
- procps-ng ps(1) manual: https://man7.org/linux/man-pages/man1/ps.1.html
- proc_loadavg(5) manual: https://man7.org/linux/man-pages/man5/proc_loadavg.5.html
- util-linux renice(1) manual: https://man7.org/linux/man-pages/man1/renice.1.html
- Linux kernel cgroup v2 documentation: https://docs.kernel.org/admin-guide/cgroup-v2.html
- systemd.resource-control documentation: https://www.freedesktop.org/software/systemd/man/latest/systemd.resource-control.html
- sysstat project documentation and local help output for mpstat, pidstat, iostat, and sar: https://sysstat.github.io/
- Debian linux-perf package documentation: https://packages.debian.org/linux-perf
- Local command help/man output for perf, strace, taskset, ionice, pkill, top, ps, vmstat, mpstat, pidstat, iostat, sar, and renice

## Issues Found
- The post described Linux load average greater than CPU count as definitively overloaded. Linux load average also includes tasks waiting in uninterruptible I/O sleep, so I changed the wording and flowchart labels to say this condition needs CPU and I/O-state confirmation.
- The `%ni` metric was described as low-priority processes only. Niced tasks can have adjusted nice values, including higher or lower urgency depending on permissions, so I changed the wording to "niced user processes" and "workloads with adjusted priority."
- The `%hi` metric was described as indicating hardware issues. High hardware interrupt time can also reflect legitimate device interrupt load, so I changed this to "High device interrupt load."
- The `mpstat 1 5` comment called the command one-shot output, but it samples five times at one-second intervals. I corrected the comment.
- The `top -b -n 1 | head -20` example did not force CPU sorting in batch mode. I changed it to `top -b -n 1 -o %CPU | head -20`.
- The `pidstat -u 1 5` comment said it watched a specific process, but without `-p PID` it reports per-process CPU usage more generally. I corrected the comment.
- The perf install command grouped Debian and Ubuntu together under Ubuntu-style `linux-tools-*` packages. Debian provides `linux-perf`, so I split the Debian and Ubuntu commands.
- The cgroup limit example used cgroups v1 files but did not label it as v1. I clarified that and added `cpu.cfs_period_us` so the 50% quota relationship is explicit.
- The high I/O wait symptom wording implied the CPU is busy. I changed it to describe high load while tasks wait for I/O.
- The `ps aux | grep kworker` example could match the grep process itself. I changed it to `grep '[k]worker'`.
- The `dmesg` command can require elevated privileges on common distributions, so I changed it to `sudo dmesg | grep -i error`.

## Review Notes
The remaining commands are broadly correct for common Debian/Ubuntu/RHEL-style Linux systems, but package names and service defaults vary by distribution. Direct cgroupfs manipulation can also conflict with systemd-managed systems; using systemd resource controls is generally preferable for persistent service limits.
