# Validation Summary: How to Install Portainer on NVIDIA Jetson for AI Edge Deployments (2)

## Status
validated

## Post Type
Guide

## Technologies Covered
- NVIDIA Jetson
- NVIDIA JetPack / Jetson Linux (L4T)
- NVIDIA Container Toolkit
- Docker
- Docker Compose syntax used in Portainer stacks
- Portainer CE
- NVIDIA Triton Inference Server
- Ultralytics YOLO containers
- jetson-stats (`jtop`)
- `tegrastats`

## Sources Consulted
- NVIDIA JetPack 5.1.3 Release Notes: https://docs.nvidia.com/jetson/jetpack/5.1.3/release-notes/index.html
- NVIDIA JetPack 6.2.1 Release Notes: https://docs.nvidia.com/jetson/jetpack/6.2.1/release-notes/index.html
- NVIDIA JetPack 6.0 Install and Setup: https://docs.nvidia.com/jetson/jetpack/6.0/install-setup/index.html
- NVIDIA Jetson Linux Developer Guide, Tegrastats Utility: https://docs.nvidia.com/jetson/archives/r36.4.3/DeveloperGuide/AT/JetsonLinuxDevelopmentTools/TegrastatsUtility.html
- NVIDIA Container Toolkit Install Guide: https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html
- NVIDIA Container Toolkit Docker Runtime Guide: https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/1.12.1/runtime/docker.html
- Portainer Docker upgrade/install guidance: https://docs.portainer.io/start/upgrade/docker
- Portainer stack GitOps documentation: https://docs.portainer.io/user/docker/stacks/add?fallback=true
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- NVIDIA Triton Inference Server 23.12 Release Notes: https://docs.nvidia.com/deeplearning/triton-inference-server/archives/triton-inference-server-2480/release-notes/rel-23-12.html
- jetson-stats official repository: https://github.com/rbonghi/jetson_stats
- Ultralytics container tags (authoritative vendor registry listing): https://hub.docker.com/r/ultralytics/ultralytics/tags

## Issues Found
- The introduction listed Jetson Nano alongside JetPack 5.x/6.x. That is inaccurate because JetPack 5.x/6.x support differs by device generation. I corrected the wording to refer only to JetPack 5.x/6.x-supported devices and named Xavier/Orin families appropriately.
- The prerequisites claimed Docker is included with JetPack. NVIDIA documents JetPack as including the NVIDIA container runtime with Docker integration packages, but Portainer still expects Docker to be installed and working. I changed the prerequisite to require Docker explicitly.
- Step 1 described `tegrastats` as a way to check available GPU memory. NVIDIA documents `tegrastats` as a live telemetry utility for memory and processor usage. I corrected the wording to describe it as live CPU/GPU/memory monitoring.
- Step 2 used a full `daemon.json` overwrite to register the NVIDIA runtime. NVIDIA’s current documented method is `nvidia-ctk runtime configure --runtime=docker`. I replaced the manual overwrite with the current supported command.
- Step 3 used `nvcr.io/nvidia/l4t-base:r32.7.1`, which is from the JetPack 4 era and does not match the post’s JetPack 5.x/6.x scope. It also used `nvidia-smi`, which NVIDIA documents as unsupported on Jetson, and a PyTorch import test in an `l4t-jetpack` image that is not the correct basis for that check. I replaced this section with an L4T-matched JetPack image runtime sanity check and an explicit note to use `tegrastats` on the host.
- Step 4 installed Portainer from `portainer/portainer-ce:latest` and exposed legacy HTTP on `9000` by default. Portainer’s current documented guidance uses `portainer/portainer-ce:lts`, exposes `9443` for HTTPS by default, and treats `9000` as optional legacy HTTP. I updated the command accordingly and included `8000`, which Portainer documents for Edge Agent communication.
- The Triton example used `nvcr.io/nvidia/tritonserver:23.10-py3`, which is not the Jetson-specific iGPU image format NVIDIA documents for JetPack 6.x. I changed it to a documented `-igpu` tag and labeled the example as JetPack 6.x-specific.
- The YOLO example redundantly mounted `/dev/video0` as both a volume and a device. I removed the redundant volume mount and kept the proper `devices` mapping.
- The monitoring section depended on an unverified third-party exporter image and used `systemctl restart jtop`, which is not part of the official `jetson-stats` installation guidance I reviewed. I replaced this with the documented `jetson-stats` / `jtop` installation flow plus NVIDIA’s built-in `tegrastats`.
- The power-management snippet said `nvpmodel -q` lists power modes. NVIDIA documents `nvpmodel -q` as showing the current power mode. I corrected the comment.

## Review Notes
- Triton image compatibility on Jetson is tied to JetPack/L4T support. Readers still need to choose a Jetson-compatible tag that matches their installed platform version.
- Portainer CE has used HTTPS on `9443` by default since CE 2.9; `9000` remains optional for legacy HTTP workflows.
- The post now treats `nvcc --version` as conditional because runtime-only JetPack installs may not include the full CUDA toolkit.
