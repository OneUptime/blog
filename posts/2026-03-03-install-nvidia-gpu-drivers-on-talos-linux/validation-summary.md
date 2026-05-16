# Validation Summary: How to Install NVIDIA GPU Drivers on Talos Linux

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- Talos Linux (v1.7.0 referenced in examples)
- `talosctl` CLI and Talos machine configuration
- Talos System Extensions (`nvidia-open-gpu-kernel-modules`, `nvidia-container-toolkit`)
- Talos Image Factory (schematic submission API)
- NVIDIA Open GPU Kernel Modules (driver 535.129.03)
- NVIDIA Container Toolkit (v1.14.3)
- Kubernetes (RuntimeClass `node.k8s.io/v1`, DaemonSet, Pod, Job)
- NVIDIA k8s-device-plugin (Helm chart and manifest deployment)
- CUDA base images / PyTorch image

## Sources Consulted
- Official Talos NVIDIA GPU guide (v1.7): https://www.talos.dev/v1.7/talos-guides/configuration/nvidia-gpu/
- siderolabs/extensions repo (release-1.7 branch) — verified extension package names and version templating: https://github.com/siderolabs/extensions/tree/release-1.7/nvidia-gpu
- Talos Image Factory API: https://github.com/siderolabs/image-factory
- NVIDIA k8s-device-plugin Helm chart values: https://github.com/NVIDIA/k8s-device-plugin
- Kubernetes RuntimeClass docs (GA in `node.k8s.io/v1` since 1.20): https://kubernetes.io/docs/concepts/containers/runtime-class/
- talosctl CLI reference for `ls`, `read`, `get`, `apply-config`, `upgrade`, `health`, `dmesg`
- `/proc/bus/pci/devices` format (raw hex fields, NVIDIA PCI vendor ID `10de`)

## Issues Found

1. **`talosctl ls /dev/nvidia*` glob does not work.** `talosctl ls` takes a single literal path and does not perform globbing on the remote node; the local shell will not expand `/dev/nvidia*` on the host running talosctl because those files do not exist locally. Changed to `talosctl ls /dev | grep nvidia` and updated the example output to drop the leading `/dev/` since `talosctl ls` prints entry names relative to the listed directory.

2. **`grep -i nvidia` against `/proc/bus/pci/devices` is unreliable.** That procfs file contains hex vendor/device IDs and a kernel-driver column, not human-readable vendor names. Before the NVIDIA driver is loaded the driver column will not say "nvidia" either, defeating the purpose of a pre-install hardware check. Changed the filter to NVIDIA's PCI vendor ID `10de` and added a clarifying inline comment.

## Review Notes

- **Extension image names are correct for Talos v1.7.0.** The `siderolabs/nvidia-open-gpu-kernel-modules` and `siderolabs/nvidia-container-toolkit` names (without any suffix) match what the `release-1.7` branch of `siderolabs/extensions` published. Starting with Talos v1.8, the extensions were split into `-lts` and `-production` variants (e.g., `nvidia-open-gpu-kernel-modules-lts`, `nvidia-container-toolkit-production`). Readers on Talos v1.8+ will need to use the suffixed image names; the post is internally consistent at v1.7 but will require updating when bumped.
- **Driver/toolkit versions (`535.129.03`, `v1.14.3`)** are plausible historical values for the v1.7 generation but are now well behind current LTS releases (driver `580.x`, container-toolkit `v1.19.x` as of late 2025). Worth refreshing on the next pass.
- **Containerd CRI runtime registration**: the post relies on a `RuntimeClass` with `handler: nvidia` and does not include a `/etc/cri/conf.d/20-customization.part` machine-config patch. This is correct — the `nvidia-container-toolkit` extension auto-registers the `nvidia` runtime with containerd's CRI plugin, so the patch is only needed if the user wants `nvidia` to be the *default* runtime for all pods on the node.
- The `runtimeClassName=nvidia` Helm value for `nvdp/nvidia-device-plugin` is a real top-level chart value and is the right setting for this RuntimeClass-based topology.
- The RuntimeClass `apiVersion: node.k8s.io/v1` with `handler: nvidia` is the GA API (Kubernetes 1.20+) and matches the runtime name registered by the toolkit extension.
- The standalone DaemonSet manifest in Step 5 omits a `runtimeClassName: nvidia` on the pod template (and the device plugin pod typically does not need it, since the plugin itself only enumerates devices via host mounts), so leaving it out is fine — but if a future reader copies the manifest expecting the plugin pod to use the nvidia runtime, that is intentional, not a bug.
- The four kernel modules (`nvidia`, `nvidia_uvm`, `nvidia_drm`, `nvidia_modeset`) match the official Talos guide.
- Step 1's "Using Machine Configuration" snippet duplicates the kernel-module block that Step 2 then shows again. This is stylistic, not incorrect, so left as-is.
