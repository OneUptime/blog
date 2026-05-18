# Validation Summary: How to Synchronize Time with chrony on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- chrony (chronyd, chronyc)
- systemd-timesyncd
- NTP (Network Time Protocol)
- Ubuntu (apt, systemctl, journalctl)
- timedatectl
- ufw (firewall)
- AWS Time Sync Service (169.254.169.123)
- Azure NTP (time.windows.com)
- GCP NTP (metadata.google.internal)
- ntpdate
- Python ntplib

## Sources Consulted
- chrony official documentation: https://chrony-project.org/documentation.html
- chrony.conf(5) man page: https://chrony-project.org/doc/4.5/chrony.conf.html
- chronyc(1) man page: https://chrony-project.org/doc/4.5/chronyc.html
- Ubuntu chrony package documentation: https://ubuntu.com/server/docs/network-ntp
- AWS Time Sync Service docs: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/set-time.html
- Google Cloud NTP docs: https://cloud.google.com/compute/docs/instances/configure-ntp
- pool.ntp.org / Cloudflare Time / Google Public NTP

## Issues Found
1. **Incorrect `rtcsync` comment**: The post described `rtcsync` as "Use NTP timestamps from kernel where available". This is wrong — `rtcsync` enables a kernel mode that periodically copies the system time to the real-time clock (RTC). Updated the comment.
2. **Misleading `makestep` comment**: The first occurrence had the comment "Stop updating system time after this many seconds", which incorrectly describes what `makestep` does. Replaced with an accurate explanation that `makestep` controls when chrony steps vs. slews the clock.
3. **Duplicate `makestep 1.0 3` line**: The same directive appeared twice in the example config with overlapping comments. Removed the redundant second occurrence.
4. **Inconsistent `minsources` comment**: Comment said "Require at least 3 sources for synchronization" but the value was `minsources 2`. Corrected the comment to match the value (2).
5. **Inconsistent Reference ID hex/IP in example output**: The hex `A29FC201` decodes to `162.159.194.1`, but the example claimed it was `162.159.200.1`. Corrected the hex to `A29FC801`, which correctly decodes to `162.159.200.1` (a Cloudflare time server address).

## Review Notes
- Service name `chrony.service` is correct for Ubuntu (on RHEL/CentOS it is `chronyd.service`). The post correctly uses `chrony`.
- `chronyc -a ntpdata`: The `-a` flag is deprecated in chrony 4.x and is silently accepted for backward compatibility. The command still works but `-a` is no longer needed. Left as-is.
- `chronyc makestep 1 -1` replaces the threshold/limit values from the `makestep` directive at runtime — it doesn't necessarily step immediately by itself. The plain `chronyc makestep` (no args) is what steps the clock immediately. The post's framing is slightly loose but not technically wrong.
- `ntpdate` is deprecated and may need explicit installation on newer Ubuntu releases; the post correctly notes the install command.
- `timedatectl timesync-status` only works when systemd-timesyncd is the active sync service; the post correctly uses it in the "switch back to systemd-timesyncd" section.
- The Cloudflare/Google/AWS/Azure/GCP NTP server addresses are all correct as of the review date.
