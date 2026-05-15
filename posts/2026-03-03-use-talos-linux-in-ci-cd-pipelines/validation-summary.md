# Validation Summary: How to Use Talos Linux in CI/CD Pipelines

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- talosctl
- Kubernetes
- Docker
- QEMU
- Bash
- Go test workflows
- CI/CD pipelines

## Sources Consulted
- Sidero Labs Talos v1.13 talosctl CLI reference: https://docs.siderolabs.com/talos/v1.13/reference/cli
- Sidero Labs Talos Docker local platform guide: https://docs.siderolabs.com/talos/v1.13/platform-specific-installations/local-platforms/docker
- Sidero Labs Talos QEMU local platform guide: https://docs.siderolabs.com/talos/v1.13/platform-specific-installations/local-platforms/qemu
- Sidero Labs talosctl installation guide: https://docs.siderolabs.com/talos/v1.13/getting-started/talosctl
- Sidero Labs guide for scheduling workloads on control plane nodes: https://docs.siderolabs.com/talos/v1.13/deploy-and-manage-workloads/workers-on-controlplane
- Sidero Labs Talos GitHub releases page: https://github.com/siderolabs/talos/releases

## Issues Found
- The Talos local cluster creation examples used the older `--provisioner docker` / `--provisioner qemu` form. Updated the examples to the current provider subcommand syntax, such as `talosctl cluster create docker` and `talosctl cluster create qemu`.
- Docker cluster examples passed `--controlplanes 1`, which is not listed for the current Docker cluster provider. Removed the flag from Docker examples.
- Docker and QEMU examples used `--wait-timeout`, which is not listed for the current `cluster create docker` or `cluster create qemu` commands. Removed the flag and kept explicit Kubernetes readiness checks where the scripts need them.
- The QEMU example used old resource flags `--cpus`, `--memory`, and `--disk`. Replaced them with current flags: `--cpus-controlplanes`, `--cpus-workers`, `--memory-controlplanes`, `--memory-workers`, and `--disks`.
- The version-specific examples used Talos v1.7.0 and Kubernetes 1.29.0, which are outdated for a 2026 CI guide. Updated them to Talos v1.13.0 and Kubernetes 1.36.0, matching current Talos v1.13 defaults.
- The reusable lifecycle script used `wait` with no background job in its interactive default path, so it would return immediately and trigger cleanup. Replaced it with a sleep loop.
- The integration test script used `set -e` with `go test` followed by `TEST_RESULT=$?`, which would exit before collecting artifacts or preserving the test status on failure. Wrapped `go test` in an `if` statement and added a cleanup trap.
- The first Docker example described the cluster as single-node while creating a worker as well. Changed the comment to describe it as a Docker-backed Talos cluster.

## Review Notes
The post is technically relevant and useful after the CLI updates. Future updates should re-check Talos release numbers and default Kubernetes versions because the local cluster provider flags and defaults are version-specific.
