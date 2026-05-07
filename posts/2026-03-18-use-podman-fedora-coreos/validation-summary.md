# Validation Summary: How to Use Podman on Fedora CoreOS

## Status
validated

## Post Type
Guide

## Technologies Covered
- Fedora CoreOS
- Podman
- Quadlet
- Butane
- Ignition
- systemd
- rpm-ostree
- PostgreSQL container image

## Sources Consulted
- Butane getting started: https://coreos.github.io/butane/getting-started/
- Butane configuration specifications: https://coreos.github.io/butane/specs/
- Fedora CoreOS Butane spec v1.5.0: https://coreos.github.io/butane/config-fcos-v1_5/
- Butane examples: https://coreos.github.io/butane/examples/
- CoreOS Installer command reference: https://coreos.github.io/coreos-installer/cmd/install/
- Ignition getting started: https://coreos.github.io/ignition/getting-started/
- Podman Quadlet/systemd reference: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman Quadlet basic usage: https://docs.podman.io/en/latest/markdown/podman-quadlet-basic-usage.7.html
- Podman auto-update reference: https://docs.podman.io/en/v4.9.0/markdown/podman-auto-update.1.html
- Fedora CoreOS config repository package manifest: https://github.com/coreos/fedora-coreos-config
- Docker Official Postgres image docs: https://hub.docker.com/_/postgres/

## Issues Found
- The introduction stated that all applications run inside containers. This was too absolute for FCOS because host-level systemd services and rpm-ostree package layering are also supported. The wording was adjusted to say workloads are typically run in containers.
- The provisioning section implied that `coreos-installer install` was the way to launch FCOS on a cloud provider or in QEMU. That command installs FCOS to a target disk and embeds Ignition for the installed system. The text was corrected to describe it as a direct-to-disk install flow, and `sudo` was added.
- The first-boot monitoring example wrote a Quadlet file through Butane but did not enable the generated `monitoring.service`. As written, the container would not reliably start on first boot. A `systemd.units` entry with `enabled: true` was added for `monitoring.service`.
- The persistent storage example used the official `postgres:16` image with a bind mount at `/data` and without `POSTGRES_PASSWORD`. That does not match the image’s documented data directory and would fail initialization. The command was corrected to mount `/var/lib/postgresql/data` and to set `POSTGRES_PASSWORD`.
- The networking section claimed that FCOS uses `firewalld` by default and showed `firewall-cmd` commands. Current Fedora CoreOS builds do not ship `firewalld` by default, so those commands would fail on a stock host. The section was corrected to state that host firewalling must be configured explicitly.
- The troubleshooting commands targeted a rootful Quadlet-managed container but omitted `sudo`. Because the example service is created under `/etc/containers/systemd/` and managed with system-level `systemctl`, the related `journalctl`, `podman events`, and `podman exec` examples were updated to use `sudo`.

## Review Notes
- The post’s Butane snippets use `version: 1.5.0`. That specification is still supported as of 2026-05-07, but the Butane project currently recommends using the latest stable FCOS spec when starting a new configuration.
- The additional-disk example is syntactically valid, but it assumes a suitable secondary disk is available and does not include destructive options such as `wipe_table` or `wipe_filesystem`. That is appropriate for a simple example, but readers should adapt it carefully for reused disks.
