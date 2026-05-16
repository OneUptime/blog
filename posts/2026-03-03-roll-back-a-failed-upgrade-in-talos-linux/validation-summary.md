# Validation Summary: How to Roll Back a Failed Upgrade in Talos Linux

## Status
validated

## Post Type
Tutorial / Operations Guide

## Technologies Covered
- Talos Linux (A/B boot scheme, system extensions, machine configuration)
- `talosctl` CLI (upgrade, upgrade-k8s, etcd, bootstrap, events, dmesg, health, reset, apply-config, patch, validate, get)
- Kubernetes (control plane components, kubelet, API server image override)
- etcd (snapshots, quorum, disaster recovery)
- `siderolabs/installer` container image

## Sources Consulted
- [Talos CLI Reference (v1.12)](https://docs.siderolabs.com/talos/v1.12/reference/cli)
- [Talos CLI Reference (v1.9)](https://docs.siderolabs.com/talos/v1.9/reference/cli/)
- [Talos Disaster Recovery (v1.10)](https://docs.siderolabs.com/talos/v1.10/build-and-extend-talos/cluster-operations-and-maintenance/disaster-recovery)
- [Talos Upgrading Talos Linux (v1.8)](https://docs.siderolabs.com/talos/v1.8/configure-your-talos-cluster/lifecycle-management/upgrading-talos)
- [Talos Resetting a Machine](https://www.talos.dev/v1.9/talos-guides/resetting-a-machine/)
- [Talos System Extensions](https://www.talos.dev/v1.11/talos-guides/configuration/system-extensions/)
- [Talos Configuration Patches](https://www.talos.dev/v1.9/talos-guides/configuration/patching/)

## Issues Found

1. **Incorrect command `talosctl get events`** (Detecting a Failed Upgrade section).
   - `events` is a top-level streaming command in `talosctl`, not a resource accessible via `talosctl get`. The CLI reference documents `talosctl events [flags]` ("Stream runtime events"), with flags such as `--actor-id`, `--duration`, `--since`, `--tail`.
   - **Fix:** Changed `talosctl get events --nodes 192.168.1.10` to `talosctl events --nodes 192.168.1.10`.

2. **Incorrect command `talosctl etcd recover --snapshot ...`** (Rolling Back Control Plane Nodes section).
   - There is no `talosctl etcd recover` subcommand. Per the official Talos disaster recovery guide, restoring etcd from a snapshot is done via `talosctl bootstrap --recover-from=<snapshot>` (executed against a freshly-prepared control plane node).
   - **Fix:** Replaced `talosctl etcd recover --nodes 192.168.1.10 --snapshot /tmp/etcd-pre-upgrade.snapshot` with `talosctl bootstrap --nodes 192.168.1.10 --recover-from /tmp/etcd-pre-upgrade.snapshot`, and added a warning that the subsequent `talosctl bootstrap` (without `--recover-from`) creates an empty etcd cluster and loses all state — so it should be a true last resort, not a routine alternative.

## Review Notes
- The A/B boot scheme description is accurate. Talos writes the new system image to the inactive partition (BOOT-B) on upgrade and the bootloader can revert if the new image fails to boot.
- `talosctl upgrade --stage`, `--image ghcr.io/siderolabs/installer:vX.Y.Z`, `talosctl upgrade-k8s --to <version>`, `talosctl validate --mode metal`, `talosctl reset --graceful=false`, `talosctl apply-config --insecure`, `talosctl get extensions`, and `talosctl health --wait-timeout` are all correct as written.
- The JSON patch example for the API server image (`/cluster/apiServer/image`) is syntactically valid; in practice users may want to add `--mode=no-reboot` or other mode flags depending on whether they want an immediate apply versus a staged change, but the example as shown is not wrong.
- Disaster recovery requires the etcd snapshot to be from a healthy cluster (`talosctl etcd snapshot db.snapshot`) — the post correctly recommends taking pre-upgrade snapshots in the prevention section.
- Version numbers (Talos v1.6/v1.7, Kubernetes v1.29.0) are illustrative — readers should substitute their actual versions.
