# Validation Summary: How to Analyze Boot Time with systemd-analyze on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- systemd
- systemd-analyze
- systemctl
- journalctl
- NetworkManager
- Graphviz
- apt systemd timers

## Sources Consulted
- systemd-analyze official manual: https://www.freedesktop.org/software/systemd/man/systemd-analyze.html
- systemd.timer official manual: https://www.freedesktop.org/software/systemd/man/systemd.timer.html
- systemd.socket official manual: https://www.freedesktop.org/software/systemd/man/systemd.socket.html
- nm-online official manual: https://networkmanager.dev/docs/api/latest/nm-online.html
- NetworkManager-wait-online.service official manual: https://networkmanager.dev/docs/api/latest/NetworkManager-wait-online.service.html
- Local Ubuntu/systemd man pages and command help for `systemd-analyze`, `systemd.timer`, `systemd.socket`, and `nm-online`

## Issues Found
- The SVG boot chart example generated `boot-chart.svg` in the current directory but copied `/tmp/boot-chart.svg` with `scp`. Updated the generation and open commands to use `/tmp/boot-chart.svg` consistently.
- The NetworkManager wait-online section incorrectly described the service as waiting for all interfaces to have carrier and address, and used `/usr/lib/NetworkManager/nm-wait-online --any --timeout 30`, which is not the documented NetworkManager command. Updated the explanation to match NetworkManager's documented startup-complete behavior and changed the override to use `/usr/bin/nm-online -s -q --timeout=10`.
- The apt timer section referred to disabling a socket even though `apt-daily` and `apt-daily-upgrade` are timer-driven. Updated the wording to "daily timers" and added `OnCalendar=` to the timer override so the inherited calendar schedule is reset before adding `OnBootSec=` and `OnUnitActiveSec=`.

## Review Notes
The `systemd-analyze blame` and `critical-chain` examples are valid, but both commands can be misleading when service startup is parallelized or socket-activated; the official `systemd-analyze` manual documents those caveats. The post's guidance remains appropriate for a practical boot-time troubleshooting tutorial.
