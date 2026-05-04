# Validation Summary: How to Configure systemd-timesyncd for IPv6 NTP

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- systemd-timesyncd (SNTP client built into systemd)
- timedatectl
- NTP / SNTP protocol
- IPv6 networking
- chrony (briefly, as a transition target)
- systemd-resolve / resolvectl
- tcpdump, ss, dig (verification tooling)

## Sources Consulted
- systemd-timesyncd.service(8) man page: https://www.freedesktop.org/software/systemd/man/systemd-timesyncd.service.html
- timesyncd.conf(5) man page: https://www.freedesktop.org/software/systemd/man/timesyncd.conf.html
- timedatectl(1) man page: https://www.freedesktop.org/software/systemd/man/timedatectl.html
- Google Public NTP documentation: https://developers.google.com/time
- Google Public DNS documentation: https://developers.google.com/speed/public-dns/docs/using
- Cloudflare Time Services: https://www.cloudflare.com/time/ (time.cloudflare.com — anycast IPv6 2606:4700:f1::1 / ::123)
- RFC 5905 (NTPv4)

## Issues Found
- **Incorrect IPv6 address used as a fallback NTP server.** The post listed `FallbackNTP=2001:4860:4860::8888` — this address is actually one of Google's *Public DNS* anycast endpoints (companion to 8.8.8.8 / 8.8.4.4), not an NTP server. Google Public DNS does not respond to NTP queries; Google's Public NTP service is reached via `time.google.com` (and `time1.google.com`–`time4.google.com`), which resolves to a separate set of anycast addresses. I replaced the literal with `2606:4700:f1::1`, which is Cloudflare's anycast Time Service IPv6 address (companion to `time.cloudflare.com`) and is a valid public IPv6 NTP endpoint.

## Review Notes
- `systemd-resolve` was renamed to `resolvectl` in systemd 239 (2018). Both names continue to work on most current distributions because the legacy name is preserved as a compatibility symlink, so the commands shown still function. On a future revision, switching the troubleshooting examples to `resolvectl query …` and `resolvectl flush-caches` would align with current upstream usage.
- `ping6` is similarly deprecated in favor of `ping -6` on modern iputils, but `ping6` is still present as a wrapper on most distros and works as shown.
- The directives `RootDistanceMaxSec`, `PollIntervalMinSec`, and `PollIntervalMaxSec` are all valid entries under the `[Time]` section of `timesyncd.conf` and the values shown match upstream defaults.
- The two `NTP=` lines in the "IPv6-Only Environment Configuration" section will not both take effect — systemd uses the last assignment to a non-list directive. This is acceptable as documentation showing alternatives, but readers copying both verbatim will only get the second line. Left unchanged because the section header explicitly frames each line as an alternative; flagging here as a future readability improvement.
- The claim that installing chrony "automatically disables timesyncd if both are installed" is true on Debian/Ubuntu (the chrony package masks systemd-timesyncd via a maintainer script) but is packaging-specific, not a systemd guarantee. Functionally accurate for the common case.
