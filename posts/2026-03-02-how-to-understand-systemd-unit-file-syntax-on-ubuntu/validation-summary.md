# Validation Summary: How to Understand systemd Unit File Syntax on Ubuntu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- systemd (unit files, service manager)
- Ubuntu Linux
- systemctl CLI
- systemd-analyze CLI
- INI configuration format

## Sources Consulted
- systemd.unit(5) - https://www.freedesktop.org/software/systemd/man/systemd.unit.html
- systemd.service(5) - https://www.freedesktop.org/software/systemd/man/systemd.service.html
- systemd.exec(5) - https://www.freedesktop.org/software/systemd/man/systemd.exec.html
- systemd.special(7) - https://www.freedesktop.org/software/systemd/man/systemd.special.html

## Issues Found

1. **`ProtectSystem=strict` description was wrong.** The post described it as "Mount /usr, /boot, /etc as read-only", which actually matches `ProtectSystem=full`. Per systemd.exec(5), `strict` makes the entire filesystem hierarchy read-only except for /dev/, /proc/, and /sys/. Fixed by correcting the comment and noting that `full` is the option for the /usr+/boot+/etc behavior.

2. **`StartLimitIntervalSec=` and `StartLimitBurst=` were placed in `[Service]`.** Per systemd.unit(5), these settings belong in the `[Unit]` section. systemd still parses them in `[Service]` for backward compatibility, but the documented current location is `[Unit]`. Moved them out of the `[Service]` example into a separate `[Unit]` snippet with explanatory text.

3. **`network.target` listed under "Common WantedBy targets".** Per systemd.special(7), `network.target` is a passive synchronization unit meant for `After=` ordering, not for `WantedBy=` enablement. Removed `network.target` from the list and added guidance to use `multi-user.target` + `After=network-online.target` for network-dependent services.

4. **`%u` specifier described as "user running the service".** Per systemd.unit(5), `%u` resolves to the user running the service manager (root for the system manager), not the user the service runs as. Fixed the comment to clarify this.

5. **`Restart=on-watchdog` was missing from the list of restart values.** Added it to the inline comment listing the valid `Restart=` options.

## Review Notes

- The post's reference to `/lib/systemd/system/` is acceptable since on modern Ubuntu (and other usrmerge distributions) `/lib` is a symlink to `/usr/lib`. The canonical modern location in systemd documentation is `/usr/lib/systemd/system/`, but both work.
- The default `Type=simple` claim is correct for the common case shown (ExecStart= specified, no BusName=, no credentials), though systemd's full default-resolution logic has edge cases (Type=oneshot when neither ExecStart= nor Type= are set).
- `Requires=` is described as a hard dependency that causes the unit to fail if the required unit fails — this is true only when paired with `After=` on the same unit; otherwise the activation can race. The post does mention this nuance later, so the table simplification is acceptable.
- The post does not cover socket, timer, mount, or path unit-specific sections in depth, but it correctly states the syntax applies broadly. No fix needed.
