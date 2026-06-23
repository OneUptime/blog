# Validation Summary: How to Configure CPU Governor and Power Management on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux CPU frequency scaling (cpufreq) and CPU governors (performance, powersave, ondemand, conservative, schedutil)
- sysfs interface (`/sys/devices/system/cpu/...`)
- cpufrequtils (`cpufreq-info`, `cpufreq-set`)
- cpupower (`linux-tools`, `frequency-info`, `frequency-set`)
- Intel P-State driver (`intel_pstate`)
- AMD P-State driver (`amd-pstate` / `amd-pstate-epp`)
- TLP power management
- thermald (thermal daemon)
- power-profiles-daemon (`powerprofilesctl`, D-Bus `net.hadess.PowerProfiles`)
- systemd services, GRUB kernel parameters, rc.local, udev rules
- Monitoring tools: turbostat, i7z, s-tui

## Sources Consulted
- TLP official documentation — Operation and Profiles (https://linrunner.de/tlp/settings/operation.html)
- TLP 1.10.1 documentation (https://linrunner.de/tlp/usage/tlp.html)
- Arch Wiki — CPU frequency scaling (https://wiki.archlinux.org/title/CPU_frequency_scaling)
- Arch Wiki — TLP (https://wiki.archlinux.org/title/TLP)
- Debian Wiki — CpuFrequencyScaling (https://wiki.debian.org/CpuFrequencyScaling)
- Kernel.org cpufreq / intel_pstate / amd-pstate documentation (general reference for governor, driver status values, and kernel-version requirements)

## Issues Found
- **Incorrect TLP setting comments.** In the `/etc/tlp.conf` snippet, the comments for two settings were wrong:
  - `TLP_DEFAULT_MODE=AC` was annotated as "Operation mode when on AC power / Choices: performance, balanced (default)". This is inaccurate — `TLP_DEFAULT_MODE` defines the default operation mode used only when the power source **cannot be detected** (e.g., in a VM), and the legacy value is `AC` or `BAT`. Corrected the comment to describe the actual purpose and valid choices.
  - `TLP_PERSISTENT_DEFAULT=0` was annotated as "Operation mode when on battery", which is wrong. This setting controls whether TLP locks to `TLP_DEFAULT_MODE` regardless of the actual power source (`0`=follow power source, `1`=always use the default mode). Corrected the comment accordingly.

## Review Notes
- The CPU governor descriptions (performance, powersave, ondemand, conservative, schedutil) and the schedutil kernel 4.7+ requirement are accurate.
- AMD P-State kernel version notes (5.17+ for the driver, 6.1+ for EPP/active mode, 6.3+ for guided mode) and Intel P-State `status` values (active/passive/off) are correct.
- `cpufreq-info --version` and `cpupower --version` both exist and behave as described.
- The `net.hadess.PowerProfiles` D-Bus interface used for power-profiles-daemon is the legacy interface; newer releases (0.20+) also expose `org.freedesktop.UPower.PowerProfiles`. The legacy interface is retained for backwards compatibility, so the examples remain valid. Worth refreshing in a future update.
- `TLP_DEFAULT_MODE` / `TLP_PERSISTENT_DEFAULT` are deprecated in TLP 1.10+ in favor of `TLP_AUTO_SWITCH` + `TLP_PROFILE_DEFAULT`, but the documented values still function. Not changed since the post's usage still works; noting for a possible future modernization.
- sysfs glob writes such as `echo performance | sudo tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor` rely on shell glob expansion and work as written when run in a shell; inside the systemd unit they are correctly wrapped in `/bin/bash -c`.
