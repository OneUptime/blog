# Validation Summary: How to Use Podman Desktop with Lima

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Lima
- Podman
- Podman Desktop
- k3s
- Kubernetes
- macOS
- Linux virtual machines
- Homebrew

## Sources Consulted
- Lima Podman example: https://lima-vm.io/docs/examples/containers/podman/
- Lima templates reference: https://lima-vm.io/docs/templates/
- Lima usage guide: https://lima-vm.io/docs/usage/
- Lima Kubernetes example: https://lima-vm.io/docs/examples/containers/kubernetes/
- Lima `limactl start` reference: https://lima-vm.io/docs/reference/limactl_start/
- Lima official `podman.yaml` template: https://github.com/lima-vm/lima/blob/master/templates/podman.yaml
- Podman Desktop Lima container instance docs: https://podman-desktop.io/docs/lima/creating-a-lima-instance
- Podman Desktop Lima Kubernetes instance docs: https://podman-desktop.io/docs/lima/creating-a-kubernetes-instance
- Podman Desktop remote Podman connection docs: https://podman-desktop.io/docs/podman/podman-remote
- Podman CLI reference (`--url` and `CONTAINER_HOST`): https://docs.podman.io/en/v5.3.2/markdown/podman.1.html

## Issues Found
- The post used outdated Lima template syntax (`template://...`) for Podman and k3s instances. Updated these commands to current `template:...` syntax from current Lima documentation.
- The Podman socket discovery step queried the guest-side socket path and implied that exporting `CONTAINER_HOST` was how Podman Desktop detects Lima. Replaced it with the host-side socket lookup from `limactl list ... --format 'unix://{{.Dir}}/sock/podman.sock'` and clarified that Podman Desktop uses its Lima extension for discovery.
- The Podman Desktop UI path was outdated. Replaced the `Settings > Resources` instruction with the current Lima-extension workflow under `Settings > Preferences > Extension: Lima`, plus the disable/enable step used to refresh detection.
- The custom Lima YAML enabled the system Podman socket and forwarded `/run/podman/podman.sock`, which conflicted with the rest of the post's rootless Podman usage. Corrected the example to enable `podman.socket` as a user service and forward `/run/user/{{.UID}}/podman/podman.sock`.
- The custom Lima YAML only specified an amd64 Ubuntu image. Added an aarch64 image entry so the example applies to both Intel and Apple Silicon Macs.
- The file-sharing section implied a general shared mount without noting Lima’s default permissions. Clarified that the home directory is mounted read-only by default.
- The kubeconfig and socket examples hardcoded `~/.lima/...` paths. Replaced them with `limactl list ... --format '{{.Dir}}'`-based lookups so the commands remain correct when `LIMA_HOME` differs from the default.
- The troubleshooting command used system-level journald for a rootless Podman socket. Changed it to `journalctl --user -u podman.socket`.
- The `limactl info` comment described instance details, but the command actually shows diagnostic information. Updated the wording to match the command behavior.

## Review Notes
- Podman Desktop documentation still shows some `template://...` examples on its Lima pages as of May 7, 2026, but current Lima documentation has moved to `template:...`; the post was updated to the current Lima syntax.
- No remaining technical blockers were found after the corrections.
