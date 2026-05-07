# Validation Summary: How to Run NVIDIA GPU Containers with Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- NVIDIA GPUs and NVIDIA drivers
- NVIDIA Container Toolkit
- Container Device Interface (CDI)
- CUDA container images
- PyTorch GPU containers
- SELinux container device access

## Sources Consulted
- NVIDIA Container Toolkit installation guide: https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html
- NVIDIA Container Toolkit CDI support: https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/1.18.0/cdi-support.html
- Podman run reference: https://docs.podman.io/en/v5.4.1/markdown/podman-run.1.html
- containers/common default CDI spec directories: https://github.com/containers/common/blob/main/pkg/config/default.go
- Ubuntu NVIDIA driver installation guide: https://ubuntu.com/server/docs/how-to/graphics/install-nvidia-drivers/
- NVIDIA CUDA container image documentation: https://nvidia.github.io/container-wiki/toolkit/container-images.html
- Docker Hub tag metadata for `nvidia/cuda:12.3.0-base-ubuntu22.04`, `nvidia/cuda:12.3.0-runtime-ubuntu22.04`, `nvidia/cuda:12.3.0-devel-ubuntu22.04`, and `pytorch/pytorch:2.2.0-cuda12.1-cudnn8-runtime`

## Issues Found
- The Ubuntu driver install example pinned `nvidia-driver-545`, which is stale and may not exist or be recommended on current Ubuntu releases. Changed it to install `ubuntu-drivers-common` and use `sudo ubuntu-drivers install`, matching Ubuntu's recommended hardware-specific driver selection flow.
- The Fedora/RHEL driver install example omitted that `akmod-nvidia` and `xorg-x11-drv-nvidia-cuda` come from an NVIDIA-capable third-party or vendor repository on Fedora-style systems. Added a short note to enable RPM Fusion or the distribution's NVIDIA driver repository first.
- CDI-based Podman run examples omitted `--security-opt=label=disable`. NVIDIA's Podman CDI examples include this flag, and Podman documents SELinux label issues with mounted devices. Added it to the CDI workload examples.
- The rootless CDI example wrote a spec under `~/.config/cdi` without telling Podman to read that directory. Podman's default CDI directories are `/etc/cdi` and `/var/run/cdi`, so the example now uses `podman --cdi-spec-dir=$HOME/.config/cdi`.
- The rootless device permission troubleshooting suggested only adding the user to the `video` group. Podman documents that group-based access inside rootless containers may require `--group-add keep-groups`. Added a corrected example using that flag.

## Review Notes
- The CUDA and PyTorch image tags referenced in the examples exist and are active as of this review.
- NVIDIA Container Toolkit 1.18 and later can automatically generate CDI specs under `/var/run/cdi/nvidia.yaml`; the post's manual `nvidia-ctk cdi generate` flow remains valid, especially for explicit regeneration or older toolkit versions.
