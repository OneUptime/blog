# Validation Summary: How to Configure CPU Frequency Scaling on Ubuntu Server

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu Server
- Linux CPUFreq subsystem
- CPU frequency scaling governors
- `cpupower`
- `cpufrequtils`
- `intel_pstate`
- `turbostat`
- systemd
- GRUB kernel parameters
- CPU idle states

## Sources Consulted
- Linux kernel CPUFreq documentation: https://docs.kernel.org/admin-guide/pm/cpufreq.html
- Linux kernel `intel_pstate` documentation: https://docs.kernel.org/admin-guide/pm/intel_pstate.html
- Linux kernel command-line parameter documentation: https://docs.kernel.org/admin-guide/kernel-parameters.html
- Ubuntu `cpupower-frequency-set` man page: https://manpages.ubuntu.com/manpages/stonking/man1/cpupower-frequency-set.1.html
- Ubuntu `cpufreq-set` man page: https://manpages.ubuntu.com/manpages/jammy/man1/cpufreq-set.1.html
- Debian `cpufrequtils` default configuration source: https://sources.debian.org/src/cpufrequtils/002-2/debian/cpufrequtils.default/
- Local command help/man output for `cpupower frequency-set`, `cpupower frequency-info`, `cpupower monitor`, `cpupower idle-set`, `turbostat`, and `perf stat`.

## Issues Found
- The initial package installation comment implied `cpufrequtils` provided all management commands. Updated it to clarify that `cpufrequtils` and Linux tools are both being installed for `cpufreq-info`, `cpupower`, `turbostat`, and `perf`.
- The `performance` governor description said the CPU runs at maximum frequency at all times. Updated it to say it requests the highest allowed frequency, which better matches CPUFreq behavior and allows for policy, thermal, and hardware limits.
- The `powersave` governor description was too broad for systems using active `intel_pstate`, where `powersave` is not the same as the generic CPUFreq governor. Updated the statement to apply to generic CPUFreq drivers.
- The `schedutil` description made a broad version-specific claim. Updated it to align with kernel documentation, which describes it as scheduler-integrated and generally a replacement for `ondemand` and `conservative`.
- The `intel_pstate` section incorrectly implied that all `intel_pstate` configurations expose only `performance` and `powersave`. Updated it to distinguish active mode from passive mode, where the driver appears as `intel_cpufreq` and works with generic governors.
- The GRUB `intel_pstate=passive` example was described too broadly as "for intel systems." Updated the comment to clarify that it is for Intel systems where passive mode and generic governors are desired.
- The frequency range example used an inline comment after a line-continuation backslash, which would break the shell command. Moved the comments above the command.
- The monitoring section claimed `perf stat -a sleep 5 | grep MHz` could be used for frequency statistics, but `perf stat` does not report MHz by default. Replaced it with `cpupower monitor sleep 5`, which is documented to report frequency and idle statistics.
- The BIOS feature list omitted modern Intel Speed Shift and AMD CPPC terminology. Updated the wording while preserving the original point about firmware support.
- The `cpupower idle-set -D 2` comment described the option as disabling states deeper than C2, but `-D` disables idle states by exit latency threshold. Updated the command comment and threshold wording.

## Review Notes
The remaining recommendations are workload-dependent rather than absolute rules. In future revisions, the post could mention that available governors vary by CPU, kernel configuration, loaded governor modules, scaling driver, and cloud or virtualized environments.
