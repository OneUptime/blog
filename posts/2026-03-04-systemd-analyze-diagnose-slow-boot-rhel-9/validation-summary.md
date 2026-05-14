# Validation Summary: How to Use systemd-analyze to Diagnose Slow Boot Times on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- RHEL
- systemd
- systemd-analyze
- NetworkManager
- nm-online
- systemd unit drop-ins
- fstab mount options

## Sources Consulted
- systemd-analyze official man page: https://www.freedesktop.org/software/systemd/man/systemd-analyze.html
- systemd.service official man page for ExecStart override behavior: https://www.freedesktop.org/software/systemd/man/systemd.service.html
- systemd.unit official man page for drop-in files and daemon-reload behavior: https://www.freedesktop.org/software/systemd/man/systemd.unit.html
- NetworkManager nm-online official man page: https://networkmanager.dev/docs/api/latest/nm-online.html
- NetworkManager-wait-online.service official documentation: https://networkmanager.dev/docs/api/latest/NetworkManager-wait-online.service.html
- Local command/man-page checks: `systemd-analyze --help`, `man systemd-analyze`, `nm-online --help`, `man nm-online`, `man systemd.service`, `man systemd.unit`

## Issues Found
- The post said `systemd-analyze blame` ranks every unit. Updated this to "measured units" because the official man page notes that `blame` only reports units with measurable activation time and can omit immediate/simple or non-activating units.
- The post described `NetworkManager-wait-online.service` as almost always at the top and as waiting for a network connection. Updated this to a more accurate description: it is a common boot delay and waits for NetworkManager startup completion before `network-online.target` is reached.
- The post described `critical-chain` as the actual dependency chain that determined boot time. Updated this to "time-critical chain" and added the official caveat that socket activation, parallel startup, and timed-out jobs can make the output incomplete.
- The post said the SVG plot makes the critical path stand out. Updated this because `systemd-analyze plot` shows startup timing bars, but it does not explicitly mark the critical path.
- The dnf makecache example referred to disabling a service while operating on a timer. Updated the comments to say timer.
- The `systemd-analyze verify /etc/systemd/system/*.service` description said it checks all unit files. Updated it to say local service unit files, matching what the glob actually targets.
- The `systemd-analyze blame | grep sshd` comment called the output detailed timing. Updated it to recorded startup timing, since detailed per-service waiting/dependency context comes from other commands such as `critical-chain`.

## Review Notes
The commands and configuration snippets are syntactically valid for current systemd and NetworkManager behavior. The NetworkManager wait-online timeout drop-in uses the correct `ExecStart=` reset pattern and a valid `nm-online --timeout` option, but production systems should generally investigate which units require `network-online.target` before disabling or aggressively shortening the wait service.
