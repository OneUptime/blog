# Validation Summary: How to Set Up Watchdog Timer on Ubuntu Server

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Linux kernel watchdog framework (`/dev/watchdog`)
- `softdog` kernel module
- `i6300esb` QEMU/KVM virtual watchdog device
- Intel iTCO (Total Cost of Ownership) hardware watchdog
- `watchdog` daemon (Debian/Ubuntu package) and `/etc/watchdog.conf`
- `wd_keepalive` service
- systemd watchdog integration (`RuntimeWatchdogSec`, `RuntimeWatchdogPreSec`, `RebootWatchdogSec`, `WatchdogDevice`, `WatchdogSec`)
- `sd_notify` / `WATCHDOG=1` protocol
- libvirt XML `<watchdog>` element
- Ubuntu Server (apt, systemctl, journalctl)

## Sources Consulted
- Linux kernel iTCO_wdt driver reference: https://cateee.net/lkddb/web-lkddb/ITCO_WDT.html
- systemd-system.conf(5) man page: https://www.man7.org/linux/man-pages/man5/systemd-system.conf.5.html
- watchdog.conf(5) man page: https://manpages.debian.org/testing/watchdog/watchdog.conf.5.en.html
- wd_keepalive(8) man page: https://manpages.debian.org/testing/watchdog/wd_keepalive.8.en.html
- QEMU i6300esb watchdog source: https://github.com/qemu/qemu/blob/master/hw/watchdog/wdt_i6300esb.c
- libvirt domain XML format reference (watchdog element)

## Issues Found
1. **Intel TCO acronym was wrong.** The post stated "Intel TCO (Timer Counter Output)". The Linux iTCO_wdt driver and Intel documentation define TCO as **"Total Cost of Ownership"** — a logic block in the Intel ICH/PCH south bridge. Fixed.

2. **Nonexistent systemd option `RuntimeWatchdogPreGoalSec`.** systemd-system.conf(5) defines `RuntimeWatchdogPreSec=` (no "Goal"). The misspelled option would be silently ignored. Replaced with `RuntimeWatchdogPreSec=10s` and corrected the comment to describe what a pre-timeout actually does.

3. **Misleading "in microseconds" comment for `RuntimeWatchdogSec`.** systemd time values are user-specified as plain seconds (when no unit is given) or with suffixes (`s`, `min`, `h`, etc.) — not microseconds. Although systemd internally represents time in µs, the configuration syntax is not. Comment rewritten.

4. **Wrong units for `max-temperature` in watchdog.conf.** The post said "(in Celsius * 1000)"; watchdog.conf(5) defines `max-temperature` in plain degrees Celsius (default 90°C). Comment corrected.

## Review Notes
- The `RuntimeWatchdogPreSec=` option was introduced in systemd 251 (2022); it requires a kernel watchdog driver that supports pretimeout (most modern hardware watchdogs and `softdog` since Linux 5.4 do). Older Ubuntu releases (e.g., 20.04 with systemd 245) will not recognize it. The post does not specify an Ubuntu version, but readers on Ubuntu 22.04+ are fine.
- The post correctly notes that Google Cloud "provides a watchdog via guest agent" — this is loosely accurate (the GCE guest agent participates in health/heartbeat reporting, but GCE does not expose a `/dev/watchdog` style device by default). Left as-is since the surrounding paragraph is high-level.
- The `softdog` warning is accurate: a hard kernel hang cannot trigger softdog recovery because softdog runs as a kernel timer.
- `echo c > /proc/sysrq-trigger` requires `kernel.sysrq` to be enabled (default on Ubuntu is `176`, which permits sync/remount/reboot but **not** crash); on some hardened systems readers may need to first run `echo 1 | sudo tee /proc/sys/kernel/sysrq`. Not strictly an error, but worth noting for future revisions.
