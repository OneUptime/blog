# Validation Summary: How to Modify the Hosts File on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machine configuration, `extraHostEntries`)
- `talosctl` CLI (`read`, `gen config`, `apply-config`, `patch`, `get`, `edit`)
- Kubernetes (`kubectl run`, `kubectl debug node`, `hostAliases`, `hostNetwork`)
- CoreDNS (Corefile, `hosts` plugin)
- YAML / JSON Patch (RFC 6902)

## Sources Consulted
- [Talos v1.9 v1alpha1 config reference (`machine.network.extraHostEntries`)](https://docs.siderolabs.com/talos/v1.9/reference/configuration/v1alpha1/config/)
- [Talos v1.9 Configuration Patches guide](https://docs.siderolabs.com/talos/v1.9/configure-your-talos-cluster/system-configuration/patching)
- [Talos v1.9 Editing Machine Configuration guide](https://docs.siderolabs.com/talos/v1.9/configure-your-talos-cluster/system-configuration/editing-machine-configuration)
- [Talos v1.9 CLI reference](https://docs.siderolabs.com/talos/v1.9/reference/cli/)
- [siderolabs/talos `patch.go` source — flag definitions](https://github.com/siderolabs/talos/blob/main/cmd/talosctl/cmd/talos/patch.go)
- Kubernetes documentation for `hostAliases`, `hostNetwork`, and `kubectl debug node`
- CoreDNS Corefile / `hosts` plugin documentation

## Issues Found

1. **"Updating Existing Entries" — broken get → apply-config workflow.** The original section wrote `talosctl get machineconfig -o yaml > current-config.yaml` and then fed that file directly to `talosctl apply-config`. The `get` command returns the resource wrapped in a full resource envelope (metadata + spec), and `apply-config` expects only the raw machine config, so re-applying the file as written would fail with a parsing error (this is a long-standing issue tracked upstream in siderolabs/talos#6522). Fixed by piping the output through `yq .spec` to extract the machine-config body before writing the file, and added `talosctl edit machineconfig` as an alternative one-shot workflow.

2. **"CoreDNS Custom Records" — wrong ConfigMap pattern.** The original example used a `coredns-custom` ConfigMap with a `custom.server` data key. That pattern is specific to Azure AKS (which ships a Corefile `import` directive that loads `/etc/coredns/custom/*.server`); vanilla Kubernetes/Talos CoreDNS does not auto-load such a ConfigMap, so the example would have no effect on a Talos cluster. Replaced with the standard approach: edit the `coredns` ConfigMap in `kube-system` directly, add a `hosts` block to the Corefile, and `rollout restart` the deployment.

## Review Notes

- Confirmed `machine.network.extraHostEntries[].ip` and `extraHostEntries[].aliases` are the exact field names in the v1alpha1 Talos schema.
- Confirmed `--mode=no-reboot` is a valid `talosctl apply-config` mode (alongside `auto`, `interactive`, `reboot`, `staged`, `try`).
- Confirmed `talosctl patch machineconfig ...` is valid; `mc` is an accepted short form. Both `--patch` (inline or `@file`) and `--patch-file` flags exist.
- The JSON-patch `remove` example for clearing `extraHostEntries` works only if the field already exists; if it does not, the patch will return an error. The post does not call this out, but it is a minor edge case rather than an error in the example itself.
- `kubectl debug node/<name>` requires Kubernetes 1.18+ (GA in 1.25) and the node debugger feature; this is the default on any current Talos release, so no caveat is needed.
- The post is consistent with current Talos v1.9 behavior at time of review.
