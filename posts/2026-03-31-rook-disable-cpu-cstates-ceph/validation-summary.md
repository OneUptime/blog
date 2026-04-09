# Validation Summary: How to Disable CPU C-States for Ceph Performance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux CPU C-states (intel_idle, ACPI processor driver)
- GRUB bootloader configuration
- cpupower utility (linux-tools)
- sysfs CPU idle interface
- systemd service units
- Kubernetes DaemonSets (Rook-Ceph)
- fio benchmarking tool

## Sources Consulted
- cpupower-idle-set(1) man page — `-D` is `--disable-by-latency` (disables states with exit latency >= N microseconds), distinct from `-d` which disables by state number
- Linux kernel documentation on CPU idle states (sysfs interface at `/sys/devices/system/cpu/cpu*/cpuidle/`)
- CentOS project lifecycle — CentOS 8 EOL was December 31, 2021
- Kubernetes image registry migration from `gcr.io/google_containers` to `registry.k8s.io` (announced in Kubernetes 1.25 release notes)
- Ubuntu `linux-tools` package documentation — `cpupower` requires both `linux-tools-common` and `linux-tools-$(uname -r)`

## Issues Found

1. **`cpupower idle-set -D 2` — incorrect latency threshold**: The `-D` flag disables states by exit latency (microseconds), not by state index. Using `-D 2` would disable all states with latency >= 2µs, which could include C1 (typically 1-2µs depending on hardware). Changed to `-D 10` to reliably preserve C1 while disabling C2+ (which have latencies of 15µs and above on most Intel CPUs). Updated both the runtime command and the systemd service.

2. **Ubuntu package incomplete**: `apt install -y linux-tools-common` alone does not provide the `cpupower` binary — it installs only a wrapper script. The kernel-version-specific package `linux-tools-$(uname -r)` is also required. Added it to the install command.

3. **`centos:8` container image is EOL**: CentOS 8 reached end-of-life on December 31, 2021. Replaced with `rockylinux:9`, which is actively maintained and is a direct CentOS successor.

4. **`gcr.io/google_containers/pause:3.1` — deprecated registry and old version**: The `gcr.io/google_containers` registry is deprecated. Replaced with `registry.k8s.io/pause:3.9` (the current official Kubernetes registry and a current pause image version).

5. **DaemonSet disabled ALL C-states including C0 and C1**: The init container loop iterated over `state*/disable`, disabling every idle state. This was inconsistent with the rest of the post which advocates keeping C1 enabled. Changed the glob pattern to `state[2-9]*/disable` to only disable C2 and deeper states.

6. **Removed unnecessary `hostPID: true`**: The DaemonSet specified `hostPID: true`, which shares the host PID namespace. This is not needed for writing to sysfs files via a hostPath volume mount and grants unnecessary privilege. Removed it.

## Review Notes
- The RHEL GRUB example includes `idle=poll` while the Ubuntu example does not. `idle=poll` is a much more aggressive setting that prevents the CPU from entering any idle state at all (busy-wait loop), significantly increasing power consumption. It is also redundant when `max_cstate=1` is set. This is not technically wrong but may confuse readers about the intended configuration. A future revision could add a note about the power/latency trade-off of `idle=poll`.
- The sysfs loop in the "Runtime Disabling" section disables all states then shows re-enabling C1 as a separate step. This two-step approach works but could be streamlined to match the DaemonSet pattern of only targeting state2+.
- The fio benchmark command is correct and well-constructed for measuring tail latency impact.
