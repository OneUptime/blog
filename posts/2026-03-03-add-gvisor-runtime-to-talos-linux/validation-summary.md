# Validation Summary: How to Add Gvisor Runtime to Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (v1.7)
- gVisor (runsc)
- Talos System Extensions
- Talos Image Factory
- containerd CRI runtime configuration
- Kubernetes RuntimeClass (node.k8s.io/v1)
- Kyverno (ClusterPolicy admission control)

## Sources Consulted
- Sidero Labs extensions repository: https://github.com/siderolabs/extensions/tree/main/container-runtime/gvisor
- Talos v1.7 containerd configuration docs: https://docs.siderolabs.com/talos/v1.7/configure-your-talos-cluster/images-container-runtime/containerd
- Talos system extensions docs: https://docs.siderolabs.com/talos/v1.7/build-and-extend-talos/custom-images-and-development/system-extensions
- Image Factory API: https://github.com/siderolabs/image-factory and https://factory.talos.dev/
- gVisor documentation: https://gvisor.dev/docs/
- Kubernetes RuntimeClass docs (node.k8s.io/v1)
- Kyverno ClusterPolicy reference

## Issues Found

1. **Misleading dmesg verification command (line 103).** The post originally suggested `talosctl dmesg | grep gvisor` to "verify containerd configuration includes the gVisor runtime." The Talos host dmesg does not contain entries mentioning gvisor on extension installation — the grep would return no useful output. Replaced with `talosctl read /etc/cri/conf.d/runsc.toml`, which directly reads the containerd CRI drop-in installed by the gVisor extension and is a meaningful verification of runtime registration.

2. **Incorrect containerd CRI config path (line 313).** The post used `/var/cri/conf.d/gvisor.toml` for the machine-config file customization. On Talos v1.7 the documented containerd CRI drop-in directory is `/etc/cri/conf.d/` (this is where the gVisor extension itself writes `runsc.toml`). Updated the path to `/etc/cri/conf.d/gvisor.toml` so the drop-in is actually picked up.

## Review Notes

- The extension image reference `ghcr.io/siderolabs/gvisor:20240109.0-v1.7.0`, the Image Factory schematic YAML format, the `runsc` RuntimeClass handler name, the `/usr/local/bin/runsc` binary path, and the YAML-accepting `POST /schematics` endpoint were all verified against the official Sidero Labs sources and are correct.
- The "gVisor Configuration Options" section technically works after the path fix, but it is somewhat redundant: the siderolabs/gvisor extension already drops in its own `runsc.toml` at `/etc/cri/conf.d/runsc.toml`. A future revision could clarify that this snippet is only needed if you want to override the extension's defaults (e.g., pointing `ConfigPath` at a custom `runsc.toml`).
- The Talos and gVisor extension versions referenced (Talos v1.7, gVisor 20240109.0) are real and were valid combinations at the time of writing, but readers should consult https://github.com/siderolabs/extensions for current compatibility when deploying.
- The `kubectl run ... --overrides='{"spec":{"runtimeClassName":"gvisor"}}'` benchmark example is syntactically valid; kubectl merges the JSON into the generated pod spec.
