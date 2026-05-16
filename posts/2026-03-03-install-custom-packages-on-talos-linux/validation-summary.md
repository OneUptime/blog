# Validation Summary: How to Install Custom Packages on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (immutable OS for Kubernetes)
- Talos system extensions (OCI image overlays)
- Sidero Labs Image Factory (https://factory.talos.dev)
- `imager` build tool (`ghcr.io/siderolabs/imager`)
- `talosctl` CLI (apply-config, upgrade, get extensions)
- `crane` (OCI registry CLI)
- Docker / OCI image builds (for custom extensions)
- Kubernetes DaemonSet (alternative deployment pattern)
- Kernel modules configuration (`machine.kernel.modules`)

## Sources Consulted
- Talos system extensions docs: https://www.talos.dev/v1.11/talos-guides/configuration/system-extensions/
- Talos boot assets / imager docs: https://www.talos.dev/v1.7/talos-guides/install/boot-assets/
- Sidero Labs extensions repo: https://github.com/siderolabs/extensions
- Talos kernel modules docs: https://www.talos.dev/v1.11/advanced/customizing-the-kernel/
- Talos NVIDIA GPU docs: https://www.talos.dev/v1.7/talos-guides/configuration/nvidia-gpu-proprietary/
- Image Factory: https://factory.talos.dev
- Talos GitHub issue tracking `.machine.install.extensions` deprecation (siderolabs/talos #9224)

## Issues Found

1. **`machine.install.extensions` is deprecated.** The original post recommended adding extensions to the machine config under `machine.install.extensions`. This field has been deprecated since Talos 1.5 — Talos emits a warning pointing users to the Image Factory boot-assets workflow. **Fix:** Rewrote the "Installing Extensions via Machine Configuration" section to "Installing Extensions via the Image Factory," explaining that extensions are now baked into a custom installer image (either built by the Image Factory or locally with `imager`) and that the node is then upgraded to that image. Updated all subsequent examples (kernel modules, common scenarios, custom extensions) to show Image Factory schematic YAML (`customization.systemExtensions.officialExtensions`) instead of the deprecated machine config field.

2. **`imager` Docker command argument order was wrong.** The original placed the `metal` profile at the end, after the `--system-extension-image` flags. The imager CLI requires the profile name as the **first** positional argument, before any flags. **Fix:** Reordered to `imager:v1.7.0 metal --system-extension-image ...`. Also updated the volume mount from `/tmp:/out` to the canonical `$PWD/_out:/out`.

3. **`crane ls ghcr.io/siderolabs/extensions` is not a real image path.** Each official extension is published as its own OCI repo under `ghcr.io/siderolabs/<extension-name>` — there is no monolithic `extensions` image. **Fix:** Replaced with `crane ls ghcr.io/siderolabs/iscsi-tools` as an example and added the Image Factory as the recommended discovery mechanism.

4. **NVIDIA extension tag format was incomplete.** The original showed `nvidia-open-gpu-kernel-modules:535.104.05` with no Talos version suffix. Sidero NVIDIA extension tags always include a `-<talos-version>` suffix (e.g., `535.216.03-v1.7.0`). **Fix:** Updated the NVIDIA scenario to use the schematic format with the `-lts` extension variants (the currently recommended track) and added a note explaining the tag format with the Talos version suffix.

## Review Notes

- The `talosctl get extensions` command is correct — `extensions` is an alias that resolves to the `ExtensionStatus` resource. No change needed.
- The custom extension `manifest.yaml` schema (`version: v1alpha1`, `metadata.compatibility.talos.version`) is correct per the siderolabs/extensions repo.
- The `machine.kernel.modules` config path is correct. Added a brief mention that entries also accept an optional `parameters` list.
- Specific version pins in examples (Talos `v1.7.0`, iscsi-tools `v0.1.4`, qemu-guest-agent `v8.2.0`) are pinned as illustrative. Readers using a current Talos release should substitute their target Talos version and check the Image Factory for the current extension tags.
- The Image Factory also accepts an API POST (`POST https://factory.talos.dev/schematics`) returning a schematic ID — this could be a useful follow-up addition but is outside the scope of the requested fixes.
- The custom-extension Dockerfile section is generally correct in spirit; the real Sidero extension build pipeline uses Bldr and a more involved layout, but the simplified Dockerfile/`rootfs/` model in the post is adequate for an introductory explanation.
