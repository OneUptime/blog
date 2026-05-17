# Validation Summary: How to Configure Machine Features in Talos Linux

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Talos Linux (machine configuration v1alpha1)
- Talos `machine.features` (RBAC, stableHostname, KubePrism, hostDNS, kubernetesTalosAPIAccess)
- Talos `machine.systemDiskEncryption` (LUKS2, nodeID, TPM key providers)
- `talosctl` CLI
- Kubernetes (control plane, CoreDNS, kubelet, CNI)

## Sources Consulted
- [Talos v1.8 configuration reference (v1alpha1)](https://docs.siderolabs.com/talos/v1.8/reference/configuration/v1alpha1/config/)
- [Talos v1.8 disk encryption guide](https://docs.siderolabs.com/talos/v1.8/configure-your-talos-cluster/storage-and-disk-management/disk-encryption)
- [Talos KubePrism documentation](https://www.talos.dev/v1.11/kubernetes-guides/configuration/kubeprism/)
- [Talos GitHub Discussion #8113 - checking KubePrism status](https://github.com/siderolabs/talos/discussions/8113)

## Issues Found
- **Disk encryption placement was wrong.** The post placed `diskEncryption` under `machine.features`. Per the official Talos v1alpha1 reference, disk encryption is configured under the separate top-level field `machine.systemDiskEncryption`. There is no `diskEncryption` field in `FeaturesConfig`.
  - Fixed both disk encryption YAML examples (nodeID and TPM variants) to use `machine.systemDiskEncryption` and updated the surrounding prose to call out that disk encryption is its own top-level section, not a machine feature.
  - Updated the introductory paragraph that listed disk encryption alongside other `machine.features` items to clarify that disk encryption lives in its own top-level config section.

## Review Notes
- The remaining `machine.features` field names verified against the official reference: `rbac`, `stableHostname`, `kubePrism` (with `enabled` and `port`), `hostDNS` (with `enabled`, `forwardKubeDNSToHost`, `resolveMemberNames`), and `kubernetesTalosAPIAccess` (with `enabled`, `allowedRoles`, `allowedKubernetesNamespaces`) — all correct.
- KubePrism default port `7445` is correct (default since Talos 1.6).
- LUKS2 provider plus `nodeID`/`tpm` key providers with `slot: 0` are valid per the official disk encryption guide.
- `talosctl get kubeprismstatuses` is a valid resource name; the singular `kubeprismstatus` also works.
- The post's claim that disk encryption can only be enabled during initial installation or via reinstallation matches Talos behavior — enabling encryption on an already-provisioned partition is not supported in-place.
