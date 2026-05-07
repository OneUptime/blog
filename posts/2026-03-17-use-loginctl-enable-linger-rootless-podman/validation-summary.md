# Validation Summary: How to Use loginctl enable-linger for Rootless Podman Services

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman Quadlet
- Rootless containers
- systemd user services
- loginctl linger
- journalctl
- machinectl

## Sources Consulted
- systemd loginctl manual: https://www.freedesktop.org/software/systemd/man/loginctl.html
- systemd logind.conf manual: https://www.freedesktop.org/software/systemd/man/latest/logind.conf.html
- systemd bootup manual: https://www.freedesktop.org/software/systemd/man/bootup.html
- systemd special user units manual: https://www.freedesktop.org/software/systemd/man/247/systemd.special.html
- systemd machinectl manual: https://www.freedesktop.org/software/systemd/man/latest/machinectl.html
- Podman Quadlet systemd unit manual: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman Quadlet container unit manual: https://docs.podman.io/en/latest/markdown/podman-container.unit.5.html
- Podman Quadlet basic usage guide: https://docs.podman.io/en/latest/markdown/podman-quadlet-basic-usage.7.html
- Local CLI help for loginctl, systemctl --user, and journalctl

## Issues Found
- The post used `systemctl --user enable --now webapp.service` for a Quadlet-generated service. Podman's Quadlet documentation explains that generated services are handled by the generator and the Quadlet `[Install]` section, rather than being enabled later with `systemctl enable`. Changed the command to `systemctl --user start webapp.service` after `daemon-reload`, and updated the summary to say that boot startup comes from the Quadlet `[Install]` section.

## Review Notes
The remaining `loginctl enable-linger`, `loginctl disable-linger`, `loginctl show-user --property=Linger`, `systemctl --user daemon-reload`, `journalctl --user -u ... -b`, and Quadlet `.container` configuration examples are consistent with the consulted documentation. The `machinectl shell myuser@ /usr/bin/systemctl --user status webapp.service` example matches the documented `machinectl shell [[USER@]MACHINE [PATH [ARGUMENTS...]]]` form for running a command as another user on the local host, though `machinectl` was not installed in the local validation environment.
