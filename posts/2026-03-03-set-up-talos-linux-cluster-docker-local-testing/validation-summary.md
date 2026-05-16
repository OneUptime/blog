# Validation Summary: How to Set Up a Talos Linux Cluster with Docker for Local Testing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- talosctl
- Docker and Docker Desktop
- Kubernetes
- kubectl
- NodePort and LoadBalancer services
- Talos machine configuration patches

## Sources Consulted
- Sidero Labs Talos Quickstart: https://docs.siderolabs.com/talos/v1.12/getting-started/quickstart
- Sidero Labs talosctl CLI reference: https://docs.siderolabs.com/talos/v1.13/reference/cli
- Sidero Labs Talos configuration patching guide: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/system-configuration/patching
- Sidero Labs Talos Docker platform caveats: https://docs.siderolabs.com/talos/v1.6/platform-specific-installations/local-platforms/docker
- Sidero Labs Talos upgrade guide: https://docs.siderolabs.com/talos/v1.13/configure-your-talos-cluster/lifecycle-management/upgrading-talos
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Docker Desktop networking documentation: https://docs.docker.com/desktop/features/networking/

## Issues Found
- The post used the older `talosctl cluster create` form throughout. Current Talos documentation uses the Docker-specific `talosctl cluster create docker` subcommand, so the examples were updated.
- The single-node example omitted `--workers 0`; current Docker cluster creation defaults include worker nodes, so the example was corrected to create a true single-node cluster.
- The multi-node section described three Docker control plane nodes and an etcd HA cluster. Current Docker cluster creation supports workers but does not expose a `--controlplanes` flag on the Docker subcommand, so the section was corrected to one control plane with two workers for scheduling tests.
- The version pinning example used `--talos-version`, which is not a Docker subcommand flag in the current CLI reference. It now uses `--image ghcr.io/siderolabs/talos:v1.13.0` with `--kubernetes-version 1.36.0`.
- The resource example used obsolete generic `--cpus` and `--memory` flags for Docker mode. It now uses `--cpus-controlplanes`, `--cpus-workers`, `--memory-controlplanes`, and `--memory-workers`.
- The Docker network example used `--cidr`, which is a QEMU flag in current docs. It now uses Docker's `--subnet` flag.
- The `talosctl services` command was corrected to the documented `talosctl service`.
- The service access section did not account for Docker Desktop networking limitations. A note was added to use `--exposed-ports` when container IPs are not directly reachable from the host.
- The upgrade section claimed Docker clusters can simulate Talos OS upgrades with `talosctl upgrade`. Talos Docker platform documentation states upgrade/reset APIs do not apply in container mode, so the section now recommends recreating a Docker cluster with the target Talos image.
- The networking limitation incorrectly said containers share the host network stack. It now says they share the host kernel and use Docker networking.

## Review Notes
- `talosctl` was not installed in the local workspace, so CLI behavior was verified against official Sidero Labs documentation rather than local `--help` output.
- The tutorial is valid for local development and testing. For HA control plane behavior, network device testing, disk layout validation, and upgrade testing, a QEMU/VM or bare-metal Talos environment is still the more accurate target.
