# Validation Summary: How to Use Podman on a Headless Server

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman
- Rootless containers
- systemd user services
- Quadlet
- SSH
- Linux package management (`apt`, `dnf`)
- Journald
- Firewall tooling (`firewalld`, `ufw`)
- Cron

## Sources Consulted
- Podman `podman-generate-systemd(1)` docs: https://docs.podman.io/en/v5.2.5/markdown/podman-generate-systemd.1.html
- Podman `podman-systemd.unit(5)` / Quadlet docs: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman `podman-run(1)` rootless containers documentation: https://docs.podman.io/en/v4.6.1/markdown/podman-run.1.html
- Podman `podman-stats(1)` docs: https://docs.podman.io/en/latest/markdown/podman-stats.1.html
- Podman `podman-healthcheck-run(1)` docs: https://docs.podman.io/en/latest/markdown/podman-healthcheck-run.1.html
- Podman `podman-volume-export(1)` docs: https://docs.podman.io/en/stable/markdown/podman-volume-export.1.html
- Podman `podman-auto-update(1)` docs: https://docs.podman.io/en/v4.9.0/markdown/podman-auto-update.1.html
- Podman package metadata for Ubuntu 24.04 (`uidmap`, `slirp4netns`, and `passt` recommendations): https://packages.ubuntu.com/noble/podman
- Local package metadata cross-check: `apt-cache depends podman`

## Issues Found
- The Debian 12 install command omitted `uidmap`, even though the post later configures subordinate UID/GID mappings for rootless Podman. I added `uidmap` to the Debian install line so the required `newuidmap`/`newgidmap` tooling is present.
- The `podman generate systemd --new` example started a generated systemd unit while the original `myapp` container would still be running. That can cause name or published-port conflicts because `--new` creates a fresh container at service start. I added `podman stop myapp` and `podman rm myapp` before enabling the unit and clarified the explanation below the snippet.
- The Quadlet multi-container example connected the application to `postgres:5432`, but Quadlet defaults container names to `systemd-<unit>` unless overridden. I added `ContainerName=postgres` so the hostname used in `DATABASE_URL` resolves as written.
- The introduction said each container runs as a direct child process. Podman is daemonless, but it launches containers and monitors them through `conmon`. I reworded that sentence to match Podman’s documented execution model.

## Review Notes
- `podman generate systemd` is correctly flagged as deprecated in the post; Quadlet remains the recommended approach.
- Podman documents that rootless `podman stats` may not report network I/O, so `.NetIO` can show `--` in some rootless deployments even though the command itself is valid.
- Current Podman documentation allows `pasta` or `slirp4netns` for rootless networking depending on configuration and distro packaging. The post’s networking examples remain workable after correcting the required rootless support package.
