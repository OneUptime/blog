# Validation Summary: How to Enable a Quadlet Service to Start at Boot

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman Quadlet
- Podman rootless and rootful containers
- systemd user and system services
- loginctl user lingering
- journalctl service logs

## Sources Consulted
- Podman Quadlet systemd unit documentation: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman container unit documentation: https://docs.podman.io/en/latest/markdown/podman-container.unit.5.html
- systemd loginctl manual: https://www.freedesktop.org/software/systemd/man/loginctl.html
- Local `loginctl --help` and `man loginctl` output for `enable-linger`, `show-user`, and linger behavior
- Local `systemctl --help` and `man systemctl` output for `daemon-reload`, `start`, `enable`, `disable`, and `is-enabled`

## Issues Found
- The post incorrectly instructed readers to run `systemctl --user enable webapp.service`, `sudo systemctl enable --now webapp.service`, and `systemctl --user disable webapp.service` for generated Quadlet services. Podman's official Quadlet documentation states that generated services are treated as transient by systemd and are not enabled for boot using `systemctl enable`; instead, the Quadlet generator applies the `[Install]` section during boot or `daemon-reload`. I updated the examples to use `[Install]`, `daemon-reload`, and `start` for immediate startup.
- The description, introduction, and summary described the process as using systemd enable directly. I changed those explanations to say that Quadlet applies the `[Install]` section when generating the service.
- The verification example used `systemctl --user is-enabled webapp.service`, which is misleading for generated Quadlet services. I replaced it with `systemctl --user status webapp.service`.
- The disable section used `systemctl --user disable webapp.service`. I changed it to instruct readers to remove or comment out the `[Install]` section, reload systemd, and stop the service if it is currently running.

## Review Notes
The rootless linger guidance is technically correct: systemd's `loginctl enable-linger` spawns the user manager at boot and keeps it around after logout, allowing user services to run without an active login session. The Quadlet search paths, `.container` to `.service` naming, `PublishPort=8080:80`, `Restart=on-failure`, and `journalctl --user -u ... -b` examples are consistent with the consulted documentation.
