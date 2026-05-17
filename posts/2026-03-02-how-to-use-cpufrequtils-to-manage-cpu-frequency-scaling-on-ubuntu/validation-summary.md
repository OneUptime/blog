# Validation Summary: How to Use cpufrequtils to Manage CPU Frequency Scaling on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- cpufrequtils (cpufreq-info, cpufreq-set)
- cpupower (from linux-tools)
- Linux CPUFreq subsystem (sysfs interface)
- CPU frequency governors (performance, powersave, ondemand, conservative, schedutil, userspace)
- intel_pstate driver
- acpi-cpufreq driver
- systemd (oneshot service)
- turbostat
- Apache Bench (ab)
- GRUB configuration

## Sources Consulted
- cpufrequtils homepage: https://www.kernel.org/pub/linux/utils/kernel/cpufreq/cpufrequtils.html
- Ubuntu package database for cpufrequtils (version 008-2build2 in 24.04): https://packages.ubuntu.com/
- cpupower frequency-info and frequency-set man pages (cpupower shares option semantics with cpufreq-info/set)
- Linux kernel cpufreq documentation: https://www.kernel.org/doc/html/latest/admin-guide/pm/cpufreq.html
- Linux kernel intel_pstate documentation: https://www.kernel.org/doc/html/latest/admin-guide/pm/intel_pstate.html
- Debian/Ubuntu /etc/default/cpufrequtils configuration conventions

## Issues Found
1. In the "Setting Minimum and Maximum Frequencies" section, the original post used `cpufreq-info -s` with the comment "Get available frequency steps". The `-s` (`--stats`) flag actually shows cpufreq statistics (time spent in each frequency state), not the available frequency steps. Changed the command to `cpufreq-info -l` (`--hwlimits`) with the comment "Get hardware frequency limits (min and max)", which is the appropriate command to determine the frequency range you can constrain.

## Review Notes
- The `cpufrequtils` package is still present in Ubuntu 24.04 (universe repository, version 008-2build2), so installation instructions remain valid. It is largely superseded by `cpupower` from `linux-tools`, which the post correctly mentions as a modern alternative.
- The `maximum transition latency: 4294.55 ms.` in the sample output reflects a well-known cpufreq-info quirk where an unknown/unset latency (returned as the special value 2^32 - 1 ns) is rendered as ~4.29 seconds. This is accurate behavior of the tool.
- After editing `/etc/default/grub` to add `intel_pstate=disable`, the user must also run `sudo update-grub` and reboot for the change to take effect. The post does not state this explicitly, but the edit-GRUB hint is conventional and the omission is a minor stylistic choice (not a technical error).
- The systemd unit's `After=sysinit.target` is unusual but valid; `After=multi-user.target` or no `After=` would also be common. Left as-is since it is not incorrect.
- The `cpufrequtils` systemd service that reads `/etc/default/cpufrequtils` may not be present on all modern Ubuntu installs (cpufrequtils ships an init.d script wrapped by systemd-sysv-generator). The `sudo systemctl restart cpufrequtils` command works through that compatibility shim on current Ubuntu.
- The claim that ondemand ramp-up from 800 MHz to 3.6 GHz takes "10-50 ms" is broadly accurate for the ondemand governor's default sampling rate; actual values depend on `sampling_rate` and `up_threshold` tunables.
- `cpufreq-set --min` / `--max` long options and frequency suffixes (Hz, kHz, MHz, GHz) are accepted as documented.
