# Validation Summary: How to Perform Host OS Updates on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (v1.9.x)
- talosctl CLI
- Kubernetes (kubectl)
- etcd
- Bash scripting
- Container images (ghcr.io/siderolabs/installer)

## Sources Consulted
- Talos Linux v1.9 CLI Reference: https://docs.siderolabs.com/talos/v1.9/reference/cli/
- Talos Linux Upgrading Talos guide: https://docs.siderolabs.com/talos/v1.6/configure-your-talos-cluster/lifecycle-management/upgrading-talos
- Talos Linux `talosctl upgrade` reference: https://docs.siderolabs.com/talos/v1.9/reference/cli/talosctl_upgrade/
- Talos Linux `talosctl version` reference: https://docs.siderolabs.com/talos/v1.9/reference/cli/talosctl_version/
- Talos Linux Networking Resources documentation: https://docs.siderolabs.com/talos/v1.9/learn-more/networking-resources
- Sidero Labs Talos releases: https://github.com/siderolabs/talos/releases

## Issues Found

1. **Invalid `--config-patch` flag on `talosctl upgrade`** — The post claimed that `talosctl upgrade` accepts a `--config-patch` flag to apply config patches alongside an upgrade. Per the official `talosctl upgrade` reference, the supported flags are `--nodes`, `--image`, `--preserve`, `--stage`, `--wait`, and `--debug`. There is no `--config-patch` flag on this command. Fixed by rewriting the "Handling Configuration Patches During Updates" section to use the correct workflow: apply the patch first with `talosctl patch machineconfig --patch`, then run `talosctl upgrade`.

2. **Invalid `talosctl ping` command** — The post used `talosctl ping 8.8.8.8 -n <node-ip>` to test network connectivity after an update. `talosctl` has no `ping` subcommand. Replaced with documented network diagnostic commands: `talosctl get links`, `talosctl get addresses`, `talosctl get routes`, and `talosctl netstat`, which are the Talos-native equivalents for inspecting and validating network state on a node.

## Review Notes

- `talosctl version --short` is a real flag but has been deprecated upstream; the short output is becoming the default. The post's usage still works on v1.9.x but readers should be aware this flag may be removed in a future release.
- `kubectl get componentstatuses` has been deprecated since Kubernetes 1.19. It still functions on most clusters but emits a deprecation warning; the post wisely suppresses stderr via `2>/dev/null`. Future readers running newer Kubernetes versions may see it removed.
- The example installer image `ghcr.io/siderolabs/installer:v1.9.1` is the correct image reference path used by Talos upgrades. The image registry and naming convention are accurate.
- The `--preserve` flag behavior is documented correctly (keeps ephemeral data intact during upgrade).
- `talosctl etcd snapshot`, `talosctl etcd status`, `talosctl health --wait-timeout`, and `talosctl rollback` were all verified against the official documentation as valid commands with correct usage.
- The overall control-plane-first, one-at-a-time upgrade procedure matches the official Talos upgrade guidance.
