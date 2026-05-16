# Validation Summary: How to Include System Extensions via Image Factory

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (v1.7.0)
- Talos Image Factory (factory.talos.dev)
- Talos system extensions (siderolabs/extensions)
- talosctl CLI
- YAML schematic format
- curl + jq for Image Factory API automation
- Kubernetes (as the runtime Talos hosts)

## Sources Consulted
- Official Image Factory extension catalog API: https://factory.talos.dev/version/v1.7.0/extensions/official
- siderolabs/extensions GitHub repository: https://github.com/siderolabs/extensions
- Talos Linux documentation: https://www.talos.dev/v1.7/ (redirects to https://docs.siderolabs.com/talos/v1.7/)
- Talos system extensions guide / `talosctl get extensions` resource model

## Issues Found
1. **`siderolabs/vmtoolsd` is not a valid extension name.** The official extension is published as `siderolabs/vmtoolsd-guest-agent`. Fixed by renaming the entry in the Virtualization and Cloud schematic example.
2. **`siderolabs/hyperv-tools` does not exist.** No Hyper-V guest agent extension is published in the official Image Factory catalog (Hyper-V integration is handled via in-kernel `hv_*` modules). Replaced with `siderolabs/xen-guest-agent`, which is an actual published guest-agent extension, to keep the example list illustrative of multiple hypervisors.
3. **`siderolabs/wireguard` does not exist.** WireGuard is built directly into the Linux kernel that Talos ships, so no extension is needed. Removed the line from the Networking schematic and added a short clarifying sentence under it.
4. **`talosctl get extensions --nodes 10.0.0.10 intel-ucode -o yaml` is incorrect.** The `ExtensionStatus` resource is keyed by a numeric ID (0, 1, 2 ...), not by the extension name. Changed the example to use the numeric ID `0` and updated the comment accordingly.

## Review Notes
- The remaining extension names referenced in the post were all verified to exist in the official catalog at the time of review: `intel-ucode`, `amd-ucode`, `i915-ucode`, `bnx2-bnx2x`, `realtek-firmware`, `iscsi-tools`, `util-linux-tools`, `zfs`, `drbd`, `qemu-guest-agent`, `nvidia-container-toolkit`, `nvidia-open-gpu-kernel-modules`, `tailscale`, `nut-client`.
- The Image Factory API call (`/version/{version}/extensions/official`) and the schematic POST endpoint (`/schematics`) are accurate, and the response shape (`.id` and `.name` fields) used in the `jq` filters matches the real API.
- The schematic structure (`customization.systemExtensions.officialExtensions`, `customization.extraKernelArgs`) and the installer image reference (`factory.talos.dev/installer/<schematic-id>:<talos-version>`) are correct.
- Version-specific caveat: Talos v1.7.0 is pinned throughout the post. Readers using newer Talos releases should substitute the appropriate version in both API URLs and the installer image tag; the available extension set also evolves between releases (e.g., extensions can be renamed or split, as the post itself notes).
