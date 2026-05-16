# Validation Summary: How to Use Strategic Merge Patches in Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux machine configuration
- Talos strategic merge patches
- Talos RFC6902 / JSON patches
- `talosctl` configuration patching commands
- Kubernetes control plane and kubelet configuration fields
- YAML and JSON configuration snippets

## Sources Consulted
- Talos Linux Configuration Patches documentation: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/system-configuration/patching
- Talos Linux MachineConfig reference: https://docs.siderolabs.com/talos/v1.12/reference/configuration/v1alpha1/config
- Talos Linux CLI reference for `talosctl machineconfig patch` and `talosctl patch machineconfig`: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Talos Linux v1.12 release notes, network and CRI registry configuration changes: https://docs.siderolabs.com/talos/v1.12/getting-started/what%27s-new-in-talos
- Talos Linux RegistryMirrorConfig reference: https://docs.siderolabs.com/talos/v1.12/reference/configuration/cri/registrymirrorconfig
- Talos Linux TimeSyncConfig reference: https://docs.siderolabs.com/talos/v1.12/reference/configuration/network/timesyncconfig
- Talos Linux System Extensions documentation: https://docs.siderolabs.com/talos/v1.7/build-and-extend-talos/custom-images-and-development/system-extensions

## Issues Found
- The post described strategic merge patches as the "default" Talos patching method. Talos documents strategic merge and RFC6902 patches as supported formats, with strategic merge described as the easiest. Changed the wording to avoid implying a CLI default.
- The JSON Patch hostname example used `replace` unconditionally. Talos documentation notes that JSON Patch must use `add` or `replace` depending on whether the target path already exists. Updated the example and explanation.
- The `machine.kubelet.nodeLabels` examples used the wrong path. Talos MachineConfig defines `nodeLabels` under `machine.nodeLabels`. Updated the map merge, indentation, and removal examples.
- The post claimed unkeyed lists are replaced entirely. Talos strategic merge patches append most lists, with documented exceptions such as `cluster.network.podSubnets`, `cluster.network.serviceSubnets`, and `cluster.apiServer.auditPolicy`. Updated the explanation, example, pitfall, and conclusion.
- The network interface merge-key explanation only mentioned `interface`. Talos also merges network interfaces by `deviceSelector`, and VLANs by `vlanId`. Updated the relevant explanation.
- The registry mirror example used deprecated legacy `.machine.registries` configuration for current Talos. Updated it to `RegistryMirrorConfig`.
- The system extension example used deprecated `.machine.install.extensions`. Updated it to point at a custom installer image through `machine.install.image` and added a note about the deprecation.
- The common patch example used legacy `machine.time` and `.machine.registries`. Updated it to current `TimeSyncConfig` and `RegistryMirrorConfig` documents.
- The preview command inspected `.machine.registries`, which is deprecated for current Talos registry mirror configuration. Updated it to inspect `RegistryMirrorConfig` documents.
- The post claimed strategic merge patches cannot remove fields. Talos supports `$patch: delete`. Updated the section with a strategic delete example and retained JSON Patch as an alternative.

## Review Notes
The post still includes traditional single-document `.machine.network` examples for hostname, interface, and nameserver behavior to keep the merge examples compact. A note was added explaining that Talos v1.12 deprecates those fields in favor of multi-document network configuration while retaining backward compatibility.
