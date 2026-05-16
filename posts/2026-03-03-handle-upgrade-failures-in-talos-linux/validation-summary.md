# Validation Summary: How to Handle Upgrade Failures in Talos Linux

## Status
validated

## Post Type
Tutorial / Operations Guide

## Technologies Covered
- Talos Linux (v1.7 / v1.6 referenced)
- talosctl CLI
- etcd (snapshot, recovery, quorum)
- Kubernetes (kubelet, control plane)
- crane (OCI image manipulation)
- Sidero Labs imager (custom system extensions)
- Docker (used for invoking the imager)

## Sources Consulted
- Talos CLI etcd source code: https://github.com/siderolabs/talos/blob/main/cmd/talosctl/cmd/talos/etcd.go
- Talos CLI bootstrap source code: https://github.com/siderolabs/talos/blob/main/cmd/talosctl/cmd/talos/bootstrap.go
- Talos CLI upgrade source code: https://github.com/siderolabs/talos/blob/main/cmd/talosctl/cmd/talos/upgrade.go
- Talos CLI version source code: https://github.com/siderolabs/talos/blob/main/cmd/talosctl/cmd/talos/version.go
- Talos v1.7 disaster recovery docs: https://docs.siderolabs.com/talos/v1.7/build-and-extend-talos/cluster-operations-and-maintenance/disaster-recovery
- Talos v1.7 CLI reference: https://docs.siderolabs.com/talos/v1.7/reference/cli/

## Issues Found

1. **Incorrect etcd recovery command**: The post used `talosctl etcd recover --nodes ... --snapshot ...`, which is not a valid talosctl subcommand. Talos does not expose an `etcd recover` subcommand; etcd recovery from a snapshot is performed by `talosctl bootstrap --recover-from=<snapshot>` against a single control plane node after resetting the rest. Fixed by replacing the command and adding a one-line note clarifying that the other control plane nodes must be reset first.

2. **Runbook reference to the same wrong command**: The runbook section listed `talosctl etcd recover` as the recovery step. Updated to `talosctl bootstrap --recover-from=<snapshot>` for consistency with the corrected procedure.

## Review Notes
- The `--stage` flag on `talosctl upgrade` is valid in v1.7 but is marked deprecated in the source and scheduled for removal in v1.18 (along with `--force`, `--insecure`, and `--preserve`). Readers running newer Talos releases should consult the release notes before relying on these flags.
- `talosctl bootstrap` (when used for genuine disaster recovery) requires that the other control plane nodes be reset first; otherwise the bootstrapped node will not be able to form a healthy etcd cluster. The post now hints at this in a brief inline comment.
- The `crane manifest` / `crane push` / `crane ls` commands are from the go-containerregistry project and are correct as written.
- The `docker run ... ghcr.io/siderolabs/imager:v1.7.0 installer ...` invocation matches the Sidero imager usage pattern; the produced `installer-amd64.tar` is an OCI image archive suitable for `crane push`.
- `talosctl get` resources used (`addresses`, `resolvers`, `mounts`, `machinestatus`, `events`, `services`, `links`, `routes`, `machineconfig`) all correspond to real COSI resources exposed by Talos.
