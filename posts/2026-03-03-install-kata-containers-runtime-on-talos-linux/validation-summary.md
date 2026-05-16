# Validation Summary: How to Install Kata Containers Runtime on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (system extensions, machine configuration, Image Factory)
- Kata Containers (QEMU hypervisor, kata-runtime)
- Kubernetes RuntimeClass (node.k8s.io/v1)
- containerd
- KVM / hardware virtualization (vhost_net, vhost_vsock kernel modules)

## Sources Consulted
- Sidero Labs extensions repository: https://github.com/siderolabs/extensions
- Talos Linux configuration reference (v1.9): https://docs.siderolabs.com/talos/v1.9/reference/configuration/v1alpha1/config/
- Talos Image Factory: https://factory.talos.dev/
- Kata Containers documentation — k8s + containerd guide: https://github.com/kata-containers/kata-containers/blob/main/docs/how-to/how-to-use-k8s-with-containerd-and-kata.md
- Kata Containers QEMU configuration template: https://github.com/kata-containers/kata-containers/blob/main/src/runtime/config/configuration-qemu.toml.in
- Kubernetes RuntimeClass docs: https://kubernetes.io/docs/concepts/containers/runtime-class/

## Issues Found
1. **`talosctl ls` is not a valid subcommand.** The post used `talosctl -n <node-ip> ls /dev/kvm` in three places. The correct subcommand is `talosctl list`. Replaced each with `talosctl list /dev/ | grep kvm`.
2. **Cloud Hypervisor `kata-clh` RuntimeClass is not usable with the Sidero extension.** The official `ghcr.io/siderolabs/kata-containers` extension only ships QEMU; the containerd handler registered is `kata`. The post recommended creating a `kata-clh` RuntimeClass with handler `kata-clh`, which would never resolve to a runtime. Removed the `kata-clh` example and added a note clarifying that the Sidero extension bundles QEMU only.
3. **Invalid `image = ""` line in the Kata `[hypervisor.qemu]` configuration.** Kata's `image` and `initrd` options are mutually exclusive — the post sets `image` to an empty string and also sets `initrd`. Removed the empty `image` line, leaving the valid `initrd`-based configuration.

## Review Notes
- The Sidero extension tag format `<kata-version>-<talos-version>` (e.g., `3.2.0-v1.7.0`) is correct, but readers should consult the Image Factory or extensions repository for the current pairing matching their Talos version. Specific tags can rotate as new Kata or Talos releases ship.
- The post writes a custom `/etc/kata-containers/configuration.toml` via `machine.files` with `op: create`. This works for a fresh install but `create` fails if the file already exists; if the extension ships its own default config at that path, `overwrite` may be needed. This is an edge case worth flagging but not a clear factual error.
- The `kata-runtime` binary path (`/usr/local/bin/`) is consistent with Sidero's extension convention, though the post relies on `grep` to find it rather than asserting an exact filename — a reasonable approach.
- The `Resource Management` heading on line ~251 is missing the `##` markdown prefix and renders as plain text. Not a technical error, so left unchanged per the review scope.
- General architectural references to "QEMU or Cloud Hypervisor" earlier in the post describe upstream Kata in general and are accurate; only the Talos-specific RuntimeClass recommendation was wrong.
