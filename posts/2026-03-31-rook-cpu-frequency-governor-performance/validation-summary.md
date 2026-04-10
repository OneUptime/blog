# Validation Summary: How to Set CPU Frequency Governor to Performance Mode for Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux CPU frequency scaling (cpufreq subsystem)
- CPU frequency governors (performance, powersave, ondemand, schedutil)
- cpupower CLI tool
- tuned (RHEL/CentOS performance tuning daemon)
- cpufrequtils (Debian/Ubuntu CPU frequency utilities)
- systemd service units
- Kubernetes DaemonSets
- Rook-Ceph storage orchestration
- fio (Flexible I/O Tester)

## Sources Consulted
- Linux kernel cpufreq documentation (Documentation/cpu-freq/governors.rst)
- cpupower man page and kernel-tools package contents
- tuned-adm documentation and built-in profile definitions (throughput-performance, latency-performance)
- Kubernetes DaemonSet API reference (apps/v1)
- Kubernetes container registry migration from gcr.io to registry.k8s.io (https://kubernetes.io/blog/2023/02/06/k8s-gcr-io-freeze-announcement/)
- Kubernetes pause container image versions and registry paths
- fio documentation for I/O benchmarking flags

## Issues Found

### 1. Outdated pause container image (DaemonSet section)
- **What was wrong:** The DaemonSet used `gcr.io/google_containers/pause:3.1`. The `gcr.io/google_containers` registry has been deprecated in favor of `registry.k8s.io`, and version 3.1 is very old (shipped with Kubernetes 1.12).
- **What was changed:** Updated to `registry.k8s.io/pause:3.10`.
- **Why:** The old registry is deprecated and may become unavailable. Version 3.10 is current and compatible with modern Kubernetes clusters.

### 2. Missing volumeMount in DaemonSet initContainer
- **What was wrong:** The DaemonSet defined a `sys` hostPath volume in the `volumes` section but never mounted it into the initContainer via `volumeMounts`. While the `privileged: true` security context grants host sysfs access, the explicit volume mount makes the configuration clearer and more robust across container runtimes.
- **What was changed:** Added a `volumeMounts` entry to the `set-governor` initContainer mounting the `sys` volume at `/sys`.
- **Why:** Best practice is to explicitly mount host paths rather than relying solely on privileged mode side effects. This makes the intent clear and ensures compatibility.

## Review Notes
- All sysfs paths (`/sys/devices/system/cpu/cpu*/cpufreq/scaling_governor`, `scaling_available_governors`) are correct for the Linux cpufreq subsystem.
- The `cpupower frequency-set -g performance` command and flags are correct.
- Package names are correct: `kernel-tools` (RHEL family) and `linux-tools-generic` (Ubuntu/Debian) both provide cpupower.
- The tuned custom profile format with `[cpu]` section, `governor`, `energy_perf_bias`, and `min_perf_pct` fields is valid.
- The cpufrequtils `/etc/default/cpufrequtils` configuration format is correct.
- The systemd oneshot service with `RemainAfterExit=yes` is the correct pattern for one-time boot configuration.
- The fio benchmark command uses valid flags and is a reasonable latency test for raw block devices.
- The `alpine:3.18` image used in the initContainer is adequate for the shell-based governor setting, though users may want to pin to a newer Alpine version over time.
