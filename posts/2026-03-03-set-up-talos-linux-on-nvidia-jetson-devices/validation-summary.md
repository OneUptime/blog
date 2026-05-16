# Validation Summary: How to Set Up Talos Linux on NVIDIA Jetson Devices

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Talos Linux
- Talos Image Factory
- Sidero Labs Jetson Nano overlay
- NVIDIA Jetson Nano and L4T firmware tools
- Kubernetes
- NVIDIA container runtime tooling

## Sources Consulted
- Talos v1.12 Jetson Nano installation documentation: https://docs.siderolabs.com/talos/v1.12/platform-specific-installations/single-board-computers/jetson_nano
- Talos v1.9 Jetson Nano installation documentation: https://docs.siderolabs.com/talos/v1.9/platform-specific-installations/single-board-computers/jetson_nano
- Sidero Labs overlays catalog: https://github.com/siderolabs/overlays
- Sidero Labs sbc-jetson overlay repository: https://github.com/siderolabs/sbc-jetson
- Talos Image Factory repository: https://github.com/siderolabs/image-factory
- Talos NVIDIA GPU proprietary-driver documentation: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/hardware-and-drivers/nvidia-gpu-proprietary
- NVIDIA GPU Operator platform support documentation: https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/latest/platform-support.html
- NVIDIA Jetson Nano product specifications: https://developer.nvidia.com/embedded/jetson-nano

## Issues Found
- The firmware flashing section referenced JetPack 4.6.4 / L4T R32.7.4 and `sudo ./flash.sh p3448-0002 internal`. Talos' Jetson Nano instructions use L4T R32.7.2, replace u-boot from the Sidero `sbc-jetson` image with `crane`, and flash the Jetson Nano SPI target with `p3448-0000-max-spi external`. Updated the version, prerequisites, extraction steps, patched u-boot command, recovery-mode verification, and flash target.
- The prerequisites omitted `crane`, which is required by the Talos Jetson Nano firmware workflow to extract the patched u-boot from the overlay image. Added it to the tool list.
- The introduction said the guide ran GPU-accelerated pods and implied direct Kubernetes GPU access. Updated the wording to describe edge Kubernetes setup and ARM64 workload verification instead.
- The initial Talos configuration flow used a generated config plus `/machine/install/disk`, which does not match the official SBC raw-image installation flow. Replaced it with `talosctl apply-config --insecure --mode=interactive --nodes <JETSON_IP>`.
- The post described the ARM64 test pod as a GPU workload. Renamed that step to an ARM64 workload and kept it as a cluster architecture check.
- The GPU runtime note overstated Jetson support through the standard NVIDIA device plugin and `nvidia-container-toolkit` alone. Clarified that Jetson's integrated Tegra GPU is not supported by the standard GPU Operator/device-plugin path for discrete PCIe GPUs and that toolkit support alone does not advertise Kubernetes GPU resources.
- The troubleshooting section implied that missing GPU detection would be fixed by adding standard Talos NVIDIA proprietary-driver extensions. Updated it to point readers back to the Jetson overlay and patched u-boot, and clarified that standard Talos NVIDIA proprietary-driver extensions target supported discrete NVIDIA GPUs.
- The multi-node example referenced `controlplane.yaml` and `worker.yaml` without showing how those files would exist after the earlier interactive-flow correction. Added a `talosctl gen config` command before those examples.

## Review Notes
The post remains version-specific around Talos v1.9 and the Jetson Nano overlay. Current Talos documentation still lists Jetson Nano as the official Jetson SBC page and the overlays catalog still lists only `jetson_nano` for Jetson, but readers should re-check the Sidero `sbc-jetson` repository before using newer Talos releases.
