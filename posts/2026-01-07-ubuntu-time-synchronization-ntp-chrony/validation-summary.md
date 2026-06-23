# Validation Summary: How to Configure Time Synchronization on Ubuntu with NTP/Chrony

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu / Linux time synchronization
- systemd-timesyncd (SNTP client)
- Chrony (chronyd, chronyc)
- NTP / NTS (Network Time Security)
- timedatectl, hwclock (RTC / hardware clock)
- Prometheus node_exporter textfile collector + Grafana
- Docker / Kubernetes (DaemonSet, Deployment, timezone config)
- Ansible
- UFW firewall

## Sources Consulted
- Chrony official configuration documentation (chrony.conf directives): https://chrony-project.org/doc/4.5/chrony.conf.html
  - Verified `maxupdateskew`, `maxslewrate`, `ratelimit` (interval/burst/leak), `makestep`, `leapsectz`, `rtcsync` semantics and units.
- Chrony `chronyc -c tracking` CSV field ordering (Reference ID, name, stratum, ref time, system time offset, last offset, RMS offset, frequency, residual freq, skew, root delay, root dispersion, update interval, leap status).
- systemd `timedatectl` / `systemd-timesyncd` and `timesyncd.conf` (NTP/FallbackNTP) behavior.

## Issues Found
1. **Incorrect `maxupdateskew` explanation.** The comment claimed it sets the "maximum allowed offset for initial correction" and that a larger offset causes Chrony to step instead of slew. That is wrong — `maxupdateskew` is a threshold (in ppm) on the uncertainty/skew of the *estimated clock frequency*; updates are rejected when the skew estimate is too unreliable. Stepping vs. slewing is governed by `makestep`, not `maxupdateskew`. Corrected the comment to describe the directive accurately and noted the default (1000.0).

2. **Incorrect `ratelimit` explanation.** The comment said "Limit clients to 8 requests per second with a burst of 32." With `ratelimit interval 1 burst 8 leak 2`, `interval` is a power-of-two number of seconds (2^1 = 2 seconds average minimum between responses), and `burst` is a count of 8 (not 32), and there is no "per second" rate of 8. Rewrote the comment to correctly describe interval=2s average with bursts of 8 responses.

3. **Incorrect units for `maxslewrate`.** The comment said "(ppm per second)." The directive's value is expressed in ppm (the maximum slew rate), not ppm per second. Corrected the comment.

## Review Notes
- `leapsectz right/UTC` is correct, but on recent Ubuntu/Debian releases (Ubuntu 23.04+/Debian 12+) the `right/*` zones live in the separate `tzdata-legacy` package and may need to be installed for this directive to work. Not changed since the directive itself is valid; worth a future caveat.
- The manual NTS/symmetric key generation (`echo "1 SHA1 $(head -c 32 /dev/urandom | base64)" > /etc/chrony/chrony.keys`) is valid, though `chronyc keygen` is the officially recommended modern approach. Left as-is since it works and the ownership/permissions (`root:_chrony`, `640`) are correct for Debian/Ubuntu.
- `docker run --rm alpine ntpd -q` is illustrative; Alpine's busybox includes an `ntpd` applet and it will fail to adjust the clock without `CAP_SYS_TIME`. The "permission denied" framing is close enough and the point (containers cannot set host time) is correct. Left unchanged.
- All `timedatectl`, `hwclock --systohc`, `timedatectl set-local-rtc 0`, `chronyc sources/tracking/sourcestats/makestep`, UFW, and the Prometheus CSV-parsing field indices were verified correct.
