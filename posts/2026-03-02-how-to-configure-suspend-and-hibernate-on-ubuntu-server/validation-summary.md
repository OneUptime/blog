# Validation Summary: How to Configure Suspend and Hibernate on Ubuntu Server

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu Server
- Linux kernel power management and `/sys/power`
- systemd sleep targets, `systemctl`, `systemd-sleep`, and `systemd-logind`
- Swap files and hibernation resume parameters
- RTC wake alarms with `rtcwake`
- Wake-on-LAN with `ethtool`
- Cron scheduling

## Sources Consulted
- Linux kernel documentation: System Sleep States - https://www.kernel.org/doc/html/latest/admin-guide/pm/sleep-states.html
- systemd `systemd-sleep.conf(5)` manual - https://www.freedesktop.org/software/systemd/man/latest/systemd-sleep.conf.html
- systemd `systemd-suspend.service(8)` manual - https://www.freedesktop.org/software/systemd/man/latest/systemd-suspend.service.html
- systemd `systemctl(1)` manual - https://www.freedesktop.org/software/systemd/man/latest/systemctl.html
- systemd `logind.conf(5)` manual - https://www.freedesktop.org/software/systemd/man/latest/logind.conf.html
- systemd `systemd.special(7)` manual - https://www.freedesktop.org/software/systemd/man/latest/systemd.special.html
- util-linux `rtcwake(8)` manual - https://man7.org/linux/man-pages/man8/rtcwake.8.html
- util-linux `swapon(8)` manual - https://man7.org/linux/man-pages/man8/swapon.8.html
- e2fsprogs `filefrag(8)` manual - https://man7.org/linux/man-pages/man8/filefrag.8.html
- `ethtool(8)` manual - https://man7.org/linux/man-pages/man8/ethtool.8.html

## Issues Found
- The post described Linux sleep states as being exposed through ACPI. Updated this to the kernel power management interface because `/sys/power/state`, `/sys/power/disk`, and `/sys/power/mem_sleep` are kernel sysfs interfaces, even though ACPI state names are often used on PC-class hardware.
- The post said modern `suspend` typically means S3. Updated this to explain that `systemctl suspend` uses the kernel `mem` state, which may resolve to `s2idle` or `deep` depending on `/sys/power/mem_sleep`.
- The S4 description said hibernate is a complete power off. Updated this because Linux hibernation writes the image to disk and then uses a configured hibernation mode such as `platform` or `shutdown`.
- The `s2idle` comment called it "software freeze only." Updated it to "software-driven suspend" because it is distinct from the kernel `freeze` sleep state.
- The swap-file detection snippet could select a swap partition and used a brittle `filefrag` line number. Updated it to select the first swap entry whose type is `file`, find the containing filesystem with `findmnt`, and extract the first extent offset by matching `filefrag` extent `0:`.
- The GRUB example implied replacing the full `GRUB_CMDLINE_LINUX` value. Clarified that the resume parameters should be added to the existing value.
- The `systemd-sleep.conf` example included unsupported or obsolete keys (`SuspendMode=`, `HibernateState=`, `HybridSleepMode=`, and `HybridSleepState=`). Removed those and used `MemorySleepMode=deep` with a systemd 256+ note for configuring the `mem_sleep` mode.
- The `systemd-logind` drop-in example assumed the drop-in directory already exists. Added `sudo mkdir -p /etc/systemd/logind.conf.d`.
- The system-sleep hook example used `/etc/systemd/system-sleep/`, but the current systemd manual documents `/usr/lib/systemd/system-sleep/`. Updated the directory, script path, and chmod command.
- The troubleshooting section suggested `sudo systemctl isolate sleep.target` as a verbose suspend test. Replaced it with `sudo systemctl suspend` because `sleep.target` is a special target pulled in by suspend/hibernate targets and isolating it is not the documented way to initiate suspend.
- The `pm_trace` comment described it as a suspend log. Updated the wording to describe it as a PM trace debugging control.

## Review Notes
- The post is generally correct for current Ubuntu/systemd-based servers after the fixes above.
- Hibernate setup can still vary by filesystem, initramfs tooling, Secure Boot, encryption, and distribution release. The post gives a practical baseline but future revisions could call out those caveats explicitly.
