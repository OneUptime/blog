# Validation Summary: How to Configure Intel P-State Driver on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- Linux CPUFreq subsystem
- Intel P-State driver
- Intel Hardware-Controlled P-States (HWP)
- Linux sysfs CPU frequency controls
- systemd services
- GRUB kernel parameters
- cpupower and powertop

## Sources Consulted
- Linux kernel documentation: Intel P-State CPU Performance Scaling Driver - https://docs.kernel.org/admin-guide/pm/intel_pstate.html
- Linux kernel documentation: CPU Performance Scaling / CPUFreq - https://www.kernel.org/doc/html/v5.9/admin-guide/pm/cpufreq.html
- Ubuntu manpage: cpupower-frequency-info - https://manpages.ubuntu.com/manpages/jammy/man1/cpupower-frequency-info.1.html

## Issues Found
- Clarified Intel P-State CPU support: Sandy Bridge and newer is broadly correct, but official kernel documentation notes that some processors in that range may not be supported.
- Corrected the governor explanation: generic governors such as `schedutil` and `ondemand` are available when Intel P-State runs in passive mode, not only under `acpi-cpufreq`.
- Added the passive-mode `scaling_driver` name `intel_cpufreq`, matching the kernel documentation.
- Changed “active mode (default)” to “default on many modern HWP-capable Intel systems,” because the default mode depends on processor capabilities and kernel options.
- Corrected the `max_perf_pct` and `min_perf_pct` descriptions to refer to performance levels rather than treating them as direct frequency percentages.
- Removed the claim that setting `max_perf_pct` to 80 always prevents turbo boost; this only happens if the cap falls below the CPU's turbo range.
- Marked `hwp_dynamic_boost` as HWP active-mode specific.
- Changed HWP preference output to an example because available preferences can vary by platform.
- Reworded the HWP explanation to reflect that hardware selects P-states while Intel P-State provides policy and energy-performance hints.
- Removed `intel_pstate=no_turbo` from the GRUB boot-parameter examples because it is not listed in current kernel documentation as a supported `intel_pstate` kernel parameter.
- Fixed the systemd startup script so it sets `scaling_governor` for every matching CPU policy instead of only `cpu0`.
- Fixed multiple command examples that used shell redirection with `cpu*` globs. In Bash, redirecting to a glob that expands to multiple files fails, so these were changed to `sudo tee`.

## Review Notes
- Some sysfs files are hardware-, kernel-, and mode-dependent, so users may not see every attribute on every Intel system.
- `sudo tee` writes the selected value to stdout as well as sysfs; redirecting tee output to `/dev/null` could be added in the future for quieter examples.
