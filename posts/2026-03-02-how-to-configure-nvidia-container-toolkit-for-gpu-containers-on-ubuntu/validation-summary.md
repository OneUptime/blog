# Validation Summary: How to Configure NVIDIA Container Toolkit for GPU Containers on Ubuntu

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Ubuntu
- NVIDIA drivers
- NVIDIA Container Toolkit
- Docker Engine
- Docker Compose
- NVIDIA CUDA container images
- PyTorch
- NVIDIA MPS and MIG

## Sources Consulted
- NVIDIA Container Toolkit install guide: https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html
- NVIDIA Container Toolkit Docker specialized configuration: https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/1.14.6/docker-specialized.html
- NVIDIA Container Runtime README/configuration reference: https://github.com/NVIDIA/nvidia-container-toolkit/blob/main/cmd/nvidia-container-runtime/README.md
- NVIDIA Container Toolkit config package reference: https://pkg.go.dev/github.com/NVIDIA/nvidia-container-toolkit@v1.19.0/api/config/v1
- NVIDIA CUDA 12.3 release notes and driver compatibility table: https://docs.nvidia.com/cuda/archive/12.3.0/cuda-toolkit-release-notes/index.html
- Ubuntu NVIDIA driver installation guide: https://ubuntu.com/server/docs/how-to/graphics/install-nvidia-drivers/
- Docker Engine installation guide for Ubuntu: https://docs.docker.com/engine/install/ubuntu/
- Docker Compose GPU support guide: https://docs.docker.com/compose/how-tos/gpu-support/
- PyTorch previous versions installation reference: https://pytorch.org/get-started/previous-versions/
- NVIDIA CUDA image tags on Docker Hub: https://hub.docker.com/r/nvidia/cuda

## Issues Found
- The prerequisite listed NVIDIA driver 520+, but the CUDA 12.x images used in the article require at least the CUDA 12 minimum driver branch. Changed this to NVIDIA driver 525.60.13+ for the CUDA 12.x examples.
- The Ubuntu driver install command used `ubuntu-drivers autoinstall`; Ubuntu's current documentation recommends `ubuntu-drivers install`. Updated the command.
- A Docker run comment said `CUDA_VISIBLE_DEVICES=0` limits GPU memory visible to the container. It limits GPU visibility, not memory. Corrected the comment.
- The listed cuDNN CUDA image tags `12.3.1-cudnn9-runtime-ubuntu22.04` and `12.3.1-cudnn9-devel-ubuntu22.04` do not exist on Docker Hub. Replaced them with existing `12.3.2-cudnn9-*` tags.
- The Dockerfile described a build-time `RUN` command as verifying CUDA GPU access. A normal `docker build` does not run with `--gpus`, so this could print a misleading result. Changed it to verify that PyTorch imports and left GPU verification to the runtime command.
- The Compose comment claimed a specific Docker Compose v2.3+ requirement that is not stated in current Docker documentation. Reworded it to require Compose device reservation support and NVIDIA Container Toolkit.
- The NVIDIA Container Toolkit TOML snippet used an invalid key, `supported-driver-capabilities-all`, and described `disable-require` as enforcing the Docker `--gpus` requirement. Replaced it with the current `supported-driver-capabilities` key and corrected the comment to reference `NVIDIA_REQUIRE_*` constraints.

## Review Notes
The Docker Engine installation commands are older than Docker's current recommended `docker.sources` example, but they still use a signed keyring and remain technically plausible. The CUDA image versions are older but still available except for the corrected cuDNN tags.
