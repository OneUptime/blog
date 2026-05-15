# Validation Summary: How to Set Up journald Rate Limiting and Storage Quotas on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- systemd-journald
- journald.conf
- systemd service unit overrides
- journalctl
- Linux logging and log rotation

## Sources Consulted
- systemd 252 journald.conf manual: https://www.freedesktop.org/software/systemd/man/252/journald.conf.html
- systemd 252 systemd.exec manual: https://www.freedesktop.org/software/systemd/man/252/systemd.exec.html
- systemd 252 systemd-journald.service manual: https://www.freedesktop.org/software/systemd/man/252/systemd-journald.service.html
- systemd journalctl manual: https://www.freedesktop.org/software/systemd/man/latest/journalctl.html
- Local systemd man pages for journald.conf(5), systemd.exec(5), systemd-journald.service(8), journalctl(1), and systemd.time(7)
- Red Hat documentation on persistent systemd journal logging: https://access.redhat.com/solutions/696893

## Issues Found
- The post described `RateLimitBurst=1000` as allowing exactly 1000 messages per 30 seconds. Updated this to explain that 1000 is the base burst and journald may multiply the effective limit based on available journal filesystem space.
- The storage quota example described runtime journal quotas as direct RAM limits. Updated the wording to describe them as volatile journal filesystem space limits under `/run/log/journal`, which may be memory-backed depending on the system.
- The default `SystemMaxFileSize` and `RuntimeMaxFileSize` comments omitted the 128M cap. Added the cap to match the systemd documentation.
- The quota interaction text implied that `SystemMaxUse` is an absolute hard ceiling and that cleanup can always bring usage below the limit. Updated it to note that cleanup deletes archived journal files only, so active files can temporarily keep usage above configured limits.
- The manual vacuum command comments implied that active entries/files are removed directly. Updated the comments to clarify that `journalctl --vacuum-*` operates on archived journal files.
- The rate-limit test generated only 2000 messages, which may not exceed the effective burst limit once the free-space multiplier is applied. Increased the generated message count to 12000.

## Review Notes
The commands and configuration keys are valid for systemd versions used by RHEL 9. The `LogNamespace=` section is valid for system services, but it depends on journal namespace support from systemd and should be checked before adapting the post to older RHEL releases.
