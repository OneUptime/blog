# Validation Summary: How to Place Quadlet Files for User Services

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Quadlet
- systemd user services
- Rootless containers
- loginctl lingering
- journalctl

## Sources Consulted
- Podman `podman-systemd.unit(5)` official documentation: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman `podman-container.unit(5)` official documentation: https://docs.podman.io/en/latest/markdown/podman-container.unit.5.html
- systemd `loginctl(1)` official documentation: https://www.freedesktop.org/software/systemd/man/loginctl.html
- systemd `systemctl(1)` official documentation: https://www.freedesktop.org/software/systemd/man/systemctl.html
- systemd `journalctl(1)` official documentation: https://www.freedesktop.org/software/systemd/man/latest/journalctl.html
- systemd `systemd.unit(5)` official documentation: https://www.freedesktop.org/software/systemd/man/latest/systemd.unit.html
- systemd `systemd.special(7)` official documentation: https://www.freedesktop.org/software/systemd/man/systemd.special.html

## Issues Found
- The post used `systemctl --user enable devserver` and `systemctl --user enable --now redis-dev mailhog` for Quadlet-generated services. Podman's official Quadlet documentation states generated services do not use regular `systemctl enable` persistence; instead, the generator applies the `[Install]` section during generation. Updated the commands to use `systemctl --user daemon-reload` to apply `[Install]` and `systemctl --user start ...` to start services immediately.
- The post used `/usr/libexec/podman/quadlet --dryrun --user` to preview generated units. Current Podman documentation shows the systemd generator command as `/usr/lib/systemd/system-generators/podman-system-generator --user --dryrun`. Updated the command accordingly.

## Review Notes
The user Quadlet directory, `.container` and `.volume` examples, `PublishPort`, `Volume`, `Environment`, `Restart`, `WantedBy=default.target`, `%h` usage, `systemctl --user` management commands, `journalctl --user`, and `loginctl enable-linger` guidance are consistent with the consulted documentation. Some distributions may package the Podman systemd generator in a different filesystem path, but the updated command matches the current official Podman documentation.
