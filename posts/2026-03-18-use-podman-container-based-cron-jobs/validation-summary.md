# Validation Summary: How to Use Podman for Container-Based Cron Jobs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Podman Quadlet
- systemd timers
- cron
- Bash
- Alpine Linux
- PostgreSQL client tooling

## Sources Consulted
- Podman Quadlet systemd units: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman container unit reference: https://docs.podman.io/en/latest/markdown/podman-container.unit.5.html
- Podman run reference: https://docs.podman.io/en/v5.4.1/markdown/podman-run.1.html
- Podman generate systemd deprecation notice: https://docs.podman.io/en/v5.2.5/markdown/podman-generate-systemd.1.html
- systemd timer units: https://www.freedesktop.org/software/systemd/man/latest/systemd.timer.html
- systemd user unit search paths: https://www.freedesktop.org/software/systemd/man/latest/systemd.unit.html
- Alpine Linux `postgresql16-client` package for v3.19: https://pkgs.alpinelinux.org/package/v3.19/main/x86_64/postgresql16-client
- Alpine Linux `aws-cli` package for v3.19: https://pkgs.alpinelinux.org/package/v3.19/community/x86_64/aws-cli

## Issues Found
- The timer examples placed `.timer` files under `~/.config/containers/systemd/`, but Quadlet only reads Quadlet-specific unit types from that path. I changed the timer examples to `~/.config/systemd/user/`, which is the correct user systemd unit directory.
- The rootless `systemctl --user` timer workflow omitted the need for lingering if the jobs must continue after logout. I added `loginctl enable-linger "$USER"` to make that behavior accurate.
- The opening `podman create` step did not match the Quadlet-based workflow and could conflict with the later `ContainerName=backup-job` example. I removed that step and clarified that the section is using Quadlet-generated services.
- The direct cron examples used `crontab -e` but redirected logs to `/var/log/...`, which is typically not writable from a regular user crontab. I changed those examples to log under `$HOME`.
- The wrapper script and `install-jobs.sh` example did not agree on argument ordering, and the installer generated invalid volume strings such as `/data:/data:ro:Z`. I updated the wrapper to accept optional Podman flags, made its log path user-writable, guarded the webhook so unset variables do not break the failure path, and fixed the installer/YAML examples to pass valid volume specifications and arguments.
- The Quadlet backup example used `DB_HOST=localhost`, which would point back to the container itself rather than the host database. I changed it to `host.containers.internal`.
- The statement that “Podman 4.4 and later supports Quadlet” was too version-specific and misleading. I reworded it to reflect current Quadlet support without the incorrect version boundary.

## Review Notes
- The `install-jobs.sh` example depends on PyYAML being available because it uses `import yaml`.
- The post’s deprecation note for `podman generate systemd` is correct: current Podman documentation recommends Quadlet, but the command still exists.
