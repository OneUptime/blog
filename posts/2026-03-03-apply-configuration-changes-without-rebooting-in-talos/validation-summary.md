# Validation Summary: How to Apply Configuration Changes Without Rebooting in Talos

## Status
validated

## Post Type
Tutorial / Operational guide

## Technologies Covered
- Talos Linux (machine configuration, apply-config modes)
- talosctl CLI (apply-config, get machineconfig, machineconfig patch, validate, service, health)
- Kubernetes (kubelet labels/taints, node management)
- etcd, container registries, sysctls, kernel modules, system extensions

## Sources Consulted
- Talos Linux v1.12 docs — Editing Machine Configuration: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/system-configuration/editing-machine-configuration
- Talos Linux v1.12 CLI Reference: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Talos Linux v1.12 machine config v1alpha1 reference: https://docs.siderolabs.com/talos/v1.12/reference/configuration/v1alpha1/config/
- Talos Linux v1.12 Adding a Kernel Module: https://docs.siderolabs.com/talos/v1.12/build-and-extend-talos/custom-images-and-development/kernel-module
- Talos v1.9 patching/edit machineconfig pages (for `talosctl machineconfig patch` and `talosctl get mc` semantics)

## Issues Found
No technical issues found.

Items individually verified:
- Apply modes `auto`, `no-reboot`, `reboot`, `staged` exist on `talosctl apply-config` (the docs also list `try`, which the post omits — not an error since the post says "one of several modes").
- Field paths used in the no-reboot section all exist and are within the no-reboot capable scope per the v1.12 docs: `machine.kubelet.nodeLabels/nodeTaints/extraArgs`, `machine.time.servers`, `machine.registries.mirrors/config`, `machine.certSANs`, `cluster.apiServer.certSANs/extraArgs`, `cluster.etcd.advertisedSubnets`, `machine.network.nameservers`, `machine.network.extraHostEntries` (with the correct `ip`/`aliases` shape).
- The reboot-requiring items (`machine.install.disk`, `machine.install.extraKernelArgs`, `machine.install.extensions`, `machine.kernel.modules`, `machine.systemDiskEncryption`) are accurately described — even though `.machine.install` is technically in the "applicable without reboot" path list, those install-time fields only take effect on the next install/upgrade, so a reboot/upgrade is effectively required for them to do anything (the post's framing is operationally correct).
- `talosctl machineconfig patch <input> --patch @file -o <out>` is a real command with this exact flag shape.
- `talosctl get machineconfig --nodes <ip> -o yaml` is a real command.
- `talosctl validate --config <file> --mode metal` is valid; `metal`, `cloud`, and `container` are the documented modes.
- `talosctl service <name>` (status), `talosctl health --nodes`, and `kubectl get node --show-labels` examples are correctly used.
- `machine.kernel.modules` entry shape `{ name: ... }` is correct (optional `parameters` exists but is not needed for the example).
- The `extraHostEntries` shape (`ip` + `aliases`) matches the documented schema.

## Review Notes
- The post does not mention `--mode try` (apply with auto-rollback after a timeout), which can be a useful safety option for live changes. This is a fine omission for a focused guide but worth knowing for readers.
- The preview workflow pipes `talosctl get machineconfig -o yaml` (which is a Kubernetes-style resource wrapper containing `.spec`) directly into `talosctl machineconfig patch`. In some versions/setups you may need to extract `.spec` first (e.g., `| yq .spec`) before patching. This is a minor caveat rather than a clear error.
- The classification of `.machine.install` is nuanced: per the v1.12 docs it sits in the "no reboot needed to apply" list, but the changes (disk, extensions, extraKernelArgs) themselves are install/boot-time, so they only take effect after a reinstall/reboot. The post groups these under "DO require a reboot" which matches user-facing reality even if not strictly the apply-mode classification.
- Version-specific behavior: the immediate-apply path list is taken from v1.12.7 docs; older releases supported fewer paths, so readers on older versions may see different behavior.
