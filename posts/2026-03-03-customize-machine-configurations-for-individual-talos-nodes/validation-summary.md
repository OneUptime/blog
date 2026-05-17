# Validation Summary: How to Customize Machine Configurations for Individual Talos Nodes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machine configuration, `talosctl` CLI)
- Kubernetes (node labels, taints, kubelet configuration)
- YAML configuration patching
- Bash scripting for config generation
- Hardware/storage device management (SATA, NVMe)

## Sources Consulted
- Talos Linux CLI reference (v1.11 / v1.12): https://docs.siderolabs.com/talos/v1.12/reference/cli
- Talos `v1alpha1` configuration reference: https://docs.siderolabs.com/talos/v1.10/reference/configuration/v1alpha1/config/
- Talos PKI / secrets management guide: https://www.talos.dev/v1.4/talos-guides/configuration/managing-pki/
- Kubernetes documentation on taints and tolerations

## Issues Found
1. **`talosctl apply-config` patch flag was wrong.** The post used `--patch @file.yaml`, but the correct flag for `apply-config` is `--config-patch` (short form `-p`). There is no `--patch` flag on this subcommand. Fixed in 3 locations (Approach 1 examples and the "Setting Node Labels and Taints" section).

2. **`talosctl gen config` secrets flag was wrong.** The post used `--from-secrets`, but the correct flag is `--with-secrets`. Fixed in 3 locations (Approach 2 and the template script in Approach 3).

3. **Malformed `nodeTaints` YAML.** The post had:
   ```yaml
   nodeTaints:
     nvidia.com/gpu:NoSchedule
   ```
   This is invalid YAML — without a space after the colon it is a single scalar string, not a key-value entry. `nodeTaints` in Talos is `map[string]string` where the value is `"value:effect"`. Fixed to:
   ```yaml
   nodeTaints:
     nvidia.com/gpu: "true:NoSchedule"
   ```

## Review Notes
- The `feature-gates: DevicePlugins=true` kubelet extraArg in the GPU patch is technically valid but redundant — `DevicePlugins` has been GA and enabled by default since Kubernetes 1.10. Left as-is since it does no harm and may aid clarity for readers.
- `-o <file>` for `talosctl gen config` works correctly when paired with a single `--output-types` value (as the post uses). With multiple output types, `-o` would need to be a directory; the post's single-type usage is fine.
- All other field paths (`machine.kubelet.nodeIP.validSubnets`, `cluster.etcd.advertisedSubnets`, `machine.kernel.modules`, `machine.install.disk`, `machine.disks`, network interface fields, etc.) were verified against the v1alpha1 schema and are correct.
- Modes used (`--mode no-reboot` for `apply-config`, `--mode metal` / `--mode cloud` for `validate`) are all valid.
