# Validation Summary: How to Configure CPU C-States on Ubuntu

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ubuntu
- Linux CPUIdle subsystem
- CPU C-states
- cpupower
- sysfs
- Linux kernel boot parameters
- GRUB
- systemd
- powertop
- turbostat

## Sources Consulted
- Linux kernel CPU Idle Time Management documentation: https://docs.kernel.org/admin-guide/pm/cpuidle.html
- Linux kernel intel_idle driver documentation: https://docs.kernel.org/admin-guide/pm/intel_idle.html
- Linux kernel command-line parameter documentation: https://docs.kernel.org/6.11/admin-guide/kernel-parameters.html
- Local `cpupower-idle-set(1)` man page and `cpupower idle-set --help`
- Local `cpupower-idle-info(1)` man page and `cpupower idle-info --help`
- Local `turbostat(8)` man page, `turbostat --help`, and `turbostat --list`
- Local `systemd.service(5)` man page

## Issues Found
- The post described C1/C1E exit latency as sub-microsecond. Exit latency is platform-specific, so this was changed to a comparative statement that C1/C1E are very fast compared with deeper states.
- The `idle=poll` boot parameter was described as disabling all C-states except C0 and C1. Kernel documentation says it disables CPUIdle driver use and makes idle CPUs poll in a tight loop, so the wording was corrected.
- The active cpuidle driver path was shown as `/sys/devices/system/cpu/cpu0/cpuidle/current_driver`. On current Linux systems this is exposed at `/sys/devices/system/cpu/cpuidle/current_driver`, so the command was corrected.
- Several `cpupower idle-set` examples mixed up `-d` and `-D`. The `-d` option disables a specific state number, while `-D` disables states by latency threshold. The affected examples were corrected.
- The latency-threshold comments said `>` in places where `cpupower idle-set -D` uses equal-or-higher latency. Those comments were corrected to `>=`.

## Review Notes
The post is technically relevant and validated after corrections. State names, numbering, and latency values remain hardware- and firmware-dependent, so readers should verify mappings on their own systems before applying changes.
