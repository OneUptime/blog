# Validation Summary: How to Set Up a Three-Node HA Talos Linux Cluster

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes
- etcd
- `talosctl`
- `kubectl`
- Layer 2 Virtual IP failover

## Sources Consulted
- Talos Linux Virtual (shared) IP documentation: https://docs.siderolabs.com/talos/v1.12/networking/advanced/vip
- Talos Linux static addressing documentation: https://docs.siderolabs.com/talos/v1.12/networking/configuration/static
- Talos Linux hostname configuration documentation: https://docs.siderolabs.com/talos/v1.12/networking/configuration/hostname
- Talos Linux physical links documentation: https://docs.siderolabs.com/talos/v1.12/networking/configuration/physical
- Talos Linux production cluster notes: https://docs.siderolabs.com/talos/v1.12/getting-started/prodnotes
- Talos Linux control plane documentation: https://docs.siderolabs.com/talos/v1.12/learn-more/control-plane/
- Talos Linux `talosctl` CLI reference: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Talos Linux configuration patching guide: https://www.talos.dev/latest/talos-guides/configuration/patching/

## Issues Found
- The VIP configuration used the older `machine.network.interfaces[].vip` format. Updated it to the current `Layer2VIPConfig` document format with `apiVersion`, `kind`, `name`, and `link`.
- The per-node hostname and static IP patches used older nested machine-network fields. Updated them to current `HostnameConfig` and `LinkConfig` documents, including the current `addresses[].address` and `routes[].gateway` syntax.
- The failover description said another node picks up the VIP "within seconds" for all shutdowns. Updated the wording to distinguish graceful shutdowns from unexpected failures, which Talos documents as potentially taking up to a minute.

## Review Notes
The remaining `talosctl` commands and flags used in the post are consistent with the official CLI reference. The guide assumes the control plane nodes share a Layer 2 network and that the VIP is an unused address in the same subnet, which matches Talos VIP requirements.
