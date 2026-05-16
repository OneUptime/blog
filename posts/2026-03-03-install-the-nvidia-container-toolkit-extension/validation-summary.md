# Validation Summary: How to Install the NVIDIA Container Toolkit Extension

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- Talos Linux (v1.9.x)
- Talos Image Factory (factory.talos.dev)
- NVIDIA Container Toolkit (system extension)
- NVIDIA Open GPU Kernel Modules (system extension)
- NVIDIA proprietary kernel modules (`nonfree-kmod-nvidia`)
- containerd (CRI plugin configuration)
- Kubernetes (DaemonSets, RuntimeClass concepts, scheduling)
- NVIDIA k8s-device-plugin
- Helm
- `talosctl` (machine config patches, upgrade, dmesg, extensions)
- CUDA / PyTorch (example workloads)

## Sources Consulted
- Talos Linux NVIDIA GPU guide (OSS modules): https://docs.siderolabs.com/talos/v1.9/configure-your-talos-cluster/hardware-and-drivers/nvidia-gpu
- Talos Linux NVIDIA GPU guide (proprietary modules): https://docs.siderolabs.com/talos/v1.9/configure-your-talos-cluster/hardware-and-drivers/nvidia-gpu-proprietary
- Talos Image Factory API: https://github.com/siderolabs/image-factory (docs/api.md)
- NVIDIA Kubernetes Device Plugin: https://github.com/NVIDIA/k8s-device-plugin

## Issues Found

1. **Outdated containerd CRI plugin path.** The post used `io.containerd.grpc.v1.cri` for the containerd config patch. Talos v1.9 ships containerd 2.x, which uses `io.containerd.cri.v1.runtime`. Replaced every occurrence (both the YAML snippet in Step 4 and the JSON-patch equivalent) so the configuration is actually loaded by the new CRI plugin.

2. **Wrong containerd config drop-in path.** The post wrote the file to `/var/cri/conf.d/20-nvidia.toml`. Talos reads CRI config patches from `/etc/cri/conf.d/`, and the merger only picks up files with the `.part` suffix. Updated the YAML snippet, the JSON patch, and the troubleshooting `talosctl read` command to `/etc/cri/conf.d/20-nvidia.part`.

## Review Notes

- The post sets `default_runtime_name = "nvidia"` in the containerd patch, which makes every pod on the node use the NVIDIA runtime. This matches what the official Talos guide does, but it does mean GPU-less workloads scheduled on the node also pass through `nvidia-container-runtime`. An alternative pattern is to create a Kubernetes `RuntimeClass` named `nvidia` and have only GPU pods opt-in via `runtimeClassName: nvidia`. The post doesn't cover this — worth a follow-up section, but not a correctness issue.
- The Helm install uses `--set runtimeClassName=nvidia`. That flag tells the device-plugin DaemonSet pods themselves to schedule onto the `nvidia` RuntimeClass. With the default runtime set to `nvidia` in containerd this still works (containerd will resolve the class via the existing runtime), but in a stricter setup you would also want to apply a `RuntimeClass` manifest with `handler: nvidia` before installing the chart. Consider adding that one-line manifest in a future revision.
- The static device-plugin URL uses the `main` branch (`.../k8s-device-plugin/main/deployments/static/nvidia-device-plugin.yml`). That works today but is unpinned — a future breaking change in `main` could silently break the instructions. Pinning to a tagged release (e.g. `v0.17.1`) would be more durable, but the current URL is technically correct.
- The Image Factory schematic JSON structure (`customization.systemExtensions.officialExtensions`) and the extension names (`siderolabs/nvidia-container-toolkit`, `siderolabs/nvidia-open-gpu-kernel-modules`, `siderolabs/nonfree-kmod-nvidia`) are correct.
- The kernel modules listed (`nvidia`, `nvidia_uvm`, `nvidia_drm`, `nvidia_modeset`) and the `talosctl patch machineconfig` syntax are correct.
- The example installer image URL format (`factory.talos.dev/installer/<schematic-id>:v1.9.0`) is correct.
