# Validation Summary: How to Configure Kubelet Node IP in Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machine configuration, kubelet, etcd)
- Kubernetes (kubelet node IP, node registration, dual-stack networking)
- `talosctl` CLI (gen config, apply-config, patch mc, get, logs, service)
- YAML configuration patches
- IPv4/IPv6 dual-stack networking

## Sources Consulted
- [Talos `talosctl` CLI reference](https://docs.siderolabs.com/talos/v1.7/reference/cli/) — verified `apply-config`, `patch`, and `gen config` flags
- [Talos v1alpha1 configuration reference](https://docs.siderolabs.com/talos/v1.7/reference/configuration/v1alpha1/config/) — verified `machine.kubelet.nodeIP.validSubnets` and `!` negation prefix support
- [Talos Networking Resources](https://docs.siderolabs.com/talos/v1.10/learn-more/networking-resources) — verified `talosctl get addresses` is a valid alias for `AddressStatus`
- [Talos Production Notes](https://docs.siderolabs.com/talos/v1.9/getting-started/prodnotes) — verified `cluster.etcd.advertisedSubnets` config path

## Issues Found
1. **Incorrect command for applying a patch to a running node.** The post used `talosctl apply-config --nodes 10.0.1.20 --patch @nodeip-patch.yaml --mode no-reboot`. `talosctl apply-config` does not accept a `--patch` flag; its patch flag is `-p/--config-patch`, and the command itself requires `-f/--file` to specify a full base config file (patches are applied on top of it before sending). The correct command for applying just a patch to an already-running node's machine config is `talosctl patch mc` (alias for `talosctl patch machineconfig`). Fixed by changing the command to `talosctl patch mc --nodes 10.0.1.20 --patch @nodeip-patch.yaml --mode no-reboot`, which matches the supported flag set (`--patch`, `--mode`, `--nodes`).

## Review Notes
- All other commands (`talosctl gen config` with `--config-patch`, `--config-patch-control-plane`, `--config-patch-worker`; `talosctl get kubeletspec`; `talosctl get addresses`; `talosctl get machineconfig`; `talosctl service kubelet`; `talosctl logs kubelet`) were verified against the Talos CLI reference and are correct.
- The `validSubnets` negation prefix `!` is correctly documented — the official reference example uses the same `'!10.0.0.3/32'` form.
- `cluster.etcd.advertisedSubnets` is the correct config path (not `machine.etcd.advertisedSubnets`).
- The IPv6 example uses `fd00:db8:1::/64`, which is a valid ULA (`fd00::/8`) range. The IPv6 documentation prefix is `2001:db8::/32`, so a stricter "documentation-only" example would prefer that, but the value is technically valid and will work in real configurations as a ULA subnet, so no change was made.
- The `--mode no-reboot` flag value is correct (hyphenated form), matching the supported modes (`auto`, `interactive`, `no-reboot`, `reboot`, `staged`, `try`).
