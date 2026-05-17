# Validation Summary: How to Use timedatectl for Time Configuration on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- timedatectl (systemd)
- systemd-timesyncd
- chrony / chronyc
- hwclock (util-linux)
- Real Time Clock (RTC)
- NTP synchronization
- Ubuntu (16.04+)
- timesyncd.conf configuration
- systemctl / journalctl

## Sources Consulted
- `timedatectl(1)` man page (systemd documentation): https://www.freedesktop.org/software/systemd/man/timedatectl.html
- `systemd-timesyncd.service(8)` man page: https://www.freedesktop.org/software/systemd/man/systemd-timesyncd.service.html
- `timesyncd.conf(5)` man page: https://www.freedesktop.org/software/systemd/man/timesyncd.conf.html
- `hwclock(8)` man page (util-linux): https://man7.org/linux/man-pages/man8/hwclock.8.html
- Live verification of `timedatectl show` properties on a current systemd installation
- Microsoft Windows registry documentation for `RealTimeIsUniversal`

## Issues Found

1. **`NTPService` property does not exist.** The post originally included `timedatectl show --property=NTPService` to "see which service owns the NTP function." Verified via `timedatectl show` on a current systemd installation — the only properties exposed are `Timezone`, `LocalRTC`, `CanNTP`, `NTP`, `NTPSynchronized`, `TimeUSec`, and `RTCTimeUSec`. `NTPService` returns empty output. Replaced with `systemctl is-active systemd-timesyncd chrony 2>/dev/null`, which actually achieves the stated goal.

2. **`TimeUSec --value` does not return a Unix timestamp.** The post's comment said "Get current Unix timestamp" but `timedatectl show --property=TimeUSec --value` returns a formatted date string (e.g., `Mon 2026-05-18 00:23:55 BST`), not a Unix timestamp in seconds or microseconds. Corrected the comment to "Get current system time (formatted)."

## Review Notes

- The set-time partial format claims (date-only and time-only) are correct — systemd's `parse_timestamp()` accepts those formats even though the man page only documents the full `"YYYY-MM-DD HH:MM:SS"` form.
- The example output of `timesync-status` is consistent with what systemd-timesyncd actually produces.
- The Windows registry command (`RealTimeIsUniversal`) for UTC hardware clock is correct.
- All `hwclock` flags (`--hctosys`, `--systohc`, `--show`, `--set --date`, `--verbose`) are valid in current util-linux.
- The timesyncd.conf options (`NTP`, `FallbackNTP`, `RootDistanceMaxSec`, `PollIntervalMinSec`, `PollIntervalMaxSec`) are all valid.
- `set-local-rtc` argument (0/1) is correct; the surrounding caveat about dual-boot and DST is accurate.
- On modern Ubuntu, the chrony service unit is `chrony.service` (with `chronyd.service` as an alias on some versions) — `systemctl status chrony` works as written.
