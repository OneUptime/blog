# Validation Summary: How to Use talosctl upgrade Command Effectively

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Talos Linux
- talosctl
- Talos Image Factory
- Kubernetes
- etcd
- crane

## Sources Consulted
- Talos Linux v1.7 upgrading guide: https://docs.siderolabs.com/talos/v1.7/configure-your-talos-cluster/lifecycle-management/upgrading-talos
- Talos Linux v1.7 talosctl CLI reference: https://docs.siderolabs.com/talos/v1.7/reference/cli
- Talos Linux latest upgrading guide: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/lifecycle-management/upgrading-talos
- Talos Linux latest talosctl CLI reference: https://docs.siderolabs.com/talos/latest/reference/cli
- Talos Linux v1.7 Boot Assets and Image Factory guide: https://docs.siderolabs.com/talos/v1.7/platform-specific-installations/boot-assets
- Kubernetes kubectl drain reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Kubernetes kubectl uncordon reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_uncordon/

## Issues Found
- The multiple-node example stated that nodes would be upgraded sequentially. Updated it to avoid promising sequential behavior, because Talos documentation warns that near-simultaneous upgrades can be sent and are not generally recommended.
- The `--preserve` section incorrectly said it preserves machine configuration and framed `--preserve` as the default production choice. Updated it to match the Talos 1.7 documentation: `--preserve` keeps ephemeral data intact, while the default Talos 1.7 behavior wipes EPHEMERAL and is documented as desirable except for specialized cases such as single-node control plane clusters.
- The `--stage` section incorrectly described staging as preparing an upgrade without rebooting for a later manual reboot. Updated it to match the Talos documentation: staged upgrades write upgrade metadata, reboot, apply early in boot, and reboot again into the upgraded version.
- The `talosctl upgrade --wait --wait-timeout 10m` example used an invalid `talosctl upgrade` flag. Replaced `--wait-timeout` with the documented `--timeout` flag.
- The staged upgrade pattern used a two-phase manual reboot workflow. Updated it to a staged upgrade loop that runs `talosctl upgrade --stage --wait` directly and verifies health after each node.

## Review Notes
The examples intentionally use Talos v1.7.0 image tags. The Talos v1.7 documentation now shows later v1.7 patch releases in defaults, and production upgrades should generally target the latest patch release for each minor version. Latest talosctl releases have changed some `upgrade` flags, so this post is accurate as a Talos 1.7-era guide rather than a complete reference for every current talosctl version.
