# Validation Summary: How to Disable KubeSpan on Specific Nodes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machine configuration, talosctl)
- KubeSpan (Talos's WireGuard-based mesh networking)
- WireGuard
- Kubernetes (kubectl labeling, pod scheduling, CNI routing)
- Cilium (WireGuard encryption ConfigMap)

## Sources Consulted
- Talos Linux KubeSpan documentation: https://docs.siderolabs.com/talos/v1.7/networking/kubespan/
- Talos Linux CLI reference (talosctl): https://docs.siderolabs.com/talos/v1.7/reference/cli/
- Cilium WireGuard encryption documentation: https://docs.cilium.io/en/stable/security/network/encryption-wireguard/
- Sibling posts in this blog covering KubeSpan (cross-checked for naming consistency)

## Issues Found
1. **Singular resource name `kubespanpeerstatus` used in `talosctl get` examples.** The canonical Talos resource name documented in Sidero Labs docs is the plural `kubespanpeerstatuses` (also `KubeSpanPeerStatus` as the kind). Singular `kubespanpeerstatus` is accepted as an alias by talosctl's fuzzy matching but is not the documented form. Updated all three occurrences to `kubespanpeerstatuses` so the commands match the official docs and remain consistent with other validated posts in this blog.

## Review Notes
- `talosctl patch machineconfig --patch @file.yaml --nodes ...` is the well-established and documented syntax; left as-is.
- `talosctl gen config ... --with-kubespan` is the correct flag for generating a configuration with KubeSpan enabled.
- `machine.network.kubespan.enabled` is the correct field name to toggle KubeSpan per node.
- `advertiseKubernetesNetworks` is correctly named under `machine.network.kubespan`.
- `enable-wireguard: "true"` in the Cilium ConfigMap is the documented key for enabling Cilium's WireGuard transparent encryption.
- `talosctl apply-config --insecure --config-patch @file.yaml ...` is valid syntax for applying a base config with patches during initial setup.
- `talosctl get links` and `talosctl get routes` are valid resource queries (Talos exposes Linux network state as COSI resources).
- The claim that KubeSpan adds <5% throughput overhead and sub-millisecond latency is broadly consistent with public WireGuard benchmark figures on modern x86/ARM hardware. It is presented as a general approximation, which is acceptable.
- The post correctly notes that disabling KubeSpan on a node that has no other path to the cluster will isolate it — an important warning that often catches people in multi-site setups.
- The pod-to-pod connectivity warning correctly identifies that `advertiseKubernetesNetworks: true` makes pod traffic depend on KubeSpan, and that disabling it shifts the responsibility back to the CNI.
