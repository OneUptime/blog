# Validation Summary: How to Set Up a Talos Linux Cluster with Raspberry Pi Nodes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Talos Linux
- Raspberry Pi
- Kubernetes
- talosctl
- kubectl
- Metrics Server
- Local Path Provisioner
- NFS PersistentVolumes
- Longhorn

## Sources Consulted
- Sidero Labs Talos Raspberry Pi installation documentation: https://docs.siderolabs.com/talos/v1.12/platform-specific-installations/single-board-computers/rpi_generic/
- Sidero Labs Talos configuration patching documentation: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/system-configuration/patching
- Sidero Labs Talos CLI reference: https://docs.siderolabs.com/talos/latest/reference/cli
- Sidero Labs Talos getting started documentation: https://docs.siderolabs.com/talos/v1.8/getting-started/getting-started
- Sidero Labs Talos VIP documentation: https://docs.siderolabs.com/talos/v1.9/networking/vip/
- Sidero Labs Talos Metrics Server documentation: https://www.talos.dev/v1.6/kubernetes-guides/configuration/deploy-metrics-server/
- Sidero Labs Talos upgrade documentation: https://docs.siderolabs.com/talos/v1.11/configure-your-talos-cluster/lifecycle-management/upgrading-talos
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Longhorn Talos Linux support documentation: https://longhorn.io/docs/1.11.0/advanced-resources/os-distro-specific/talos-linux-support/

## Issues Found
- The Raspberry Pi image download used the old GitHub `metal-rpi_generic-arm64.raw.xz` asset path, which returns 404 for the current latest Talos release. Updated the commands to use the Talos Image Factory Raspberry Pi generic schematic and `metal-arm64.raw.xz`.
- The VIP network patch was applied with `--config-patch`, which would apply the VIP to both control plane and worker machine configs. Changed it to `--config-patch-control-plane` so only control plane nodes receive the VIP.
- The Metrics Server install was incomplete for Talos because kubelet serving certificates are not recognized by Metrics Server by default. Added kubelet `rotate-server-certificates` configuration and the kubelet serving certificate approver manifest before installing Metrics Server.
- The `talosctl config` setup merged the generated `talosconfig` after setting endpoint and node. Reordered the commands to merge `talosconfig` first, then set the endpoint and node.
- The expected Kubernetes node output pinned `v1.29.x`, which is outdated for current Talos defaults. Replaced it with a generic `v1.x.y` placeholder.
- The Longhorn note omitted Talos-specific prerequisites. Added the required `siderolabs/iscsi-tools` and `siderolabs/util-linux-tools` system extension caveat.
- The Talos upgrade examples used an old generic `ghcr.io/siderolabs/installer:v1.7.0` image. Updated the example to use the matching Image Factory installer image for the Raspberry Pi schematic.

## Review Notes
- `talosctl` and `kubectl` were not installed in the local review environment, so CLI flags were verified against official Talos and Kubernetes documentation rather than local `--help` output.
- The guide still uses example home-network IP addresses and device names. Readers should verify the actual Raspberry Pi network interface and target disk before applying configs.
