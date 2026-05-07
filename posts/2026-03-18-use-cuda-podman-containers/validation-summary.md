# Validation Summary: How to Use CUDA in Podman Containers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- NVIDIA CUDA
- Podman
- NVIDIA Container Toolkit
- Container Device Interface (CDI)
- NVIDIA CUDA container images
- CUDA C++
- CuPy
- PyTorch
- Compute Sanitizer

## Sources Consulted
- NVIDIA Container Toolkit CDI support: https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/1.17.0/cdi-support.html
- NVIDIA Container Toolkit SELinux troubleshooting: https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/troubleshooting.html
- NVIDIA CUDA Docker image documentation: https://hub.docker.com/r/nvidia/cuda
- NVIDIA CUDA 12.3 release notes and driver compatibility: https://docs.nvidia.com/cuda/archive/12.3.0/cuda-toolkit-release-notes/index.html
- NVIDIA CUDA Programming Guide environment variables: https://docs.nvidia.com/cuda/cuda-programming-guide/05-appendices/environment-variables.html
- NVIDIA Compute Sanitizer documentation: https://docs.nvidia.com/cuda/archive/11.5.0/sanitizer-docs/ComputeSanitizer/index.html
- NVIDIA Multi-Process Service documentation: https://docs.nvidia.com/deploy/mps/

## Issues Found
- The CUDA C++ example used `malloc` and `free` without including `<stdlib.h>`. Added the missing header so the `.cu` source is correct C/C++ code for compilation with `nvcc`.
- The Python container section was titled "Multi-Stage Build" but the shown Containerfile uses a single `FROM` stage. Renamed the heading to "Containerfile for Python CUDA Applications" without changing the example.
- The memory-management section claimed to set a GPU memory limit using `CUDA_MPS_PIPE_DIRECTORY` and `CUDA_VISIBLE_DEVICES`. Those variables do not limit GPU memory; `CUDA_VISIBLE_DEVICES` controls device visibility and `CUDA_MPS_PIPE_DIRECTORY` is for MPS control-daemon communication. Updated the example to describe visible-device selection.
- The CUDA compatibility section used a simplified driver-to-CUDA mapping as if each driver branch maps to one exact CUDA version. Replaced it with wording that matches NVIDIA release notes: CUDA 12.3 normally corresponds to 545-series toolkit drivers, while CUDA 12.x minor-version compatibility can allow some applications to run on 525+ drivers with caveats.
- The debugging section referenced `cuda-memcheck` inside CUDA 12.3 containers. CUDA 12.x uses Compute Sanitizer, so the obsolete `cuda-memcheck` guidance was removed and the `compute-sanitizer --tool memcheck` guidance was kept.
- The debugging section described `CUDA_LAUNCH_BLOCKING` and `CUDA_DEVICE_ORDER` as enabling verbose CUDA driver logging. `CUDA_LAUNCH_BLOCKING` makes launches synchronous and `CUDA_DEVICE_ORDER=PCI_BUS_ID` stabilizes device enumeration order. Updated the description accordingly.
- Podman CDI examples did not include `--security-opt=label=disable`. NVIDIA's Podman CDI examples include it, and NVIDIA troubleshooting notes it may be required on SELinux systems such as Fedora/RHEL. Added it to the `podman run` commands that pass NVIDIA CDI devices.

## Review Notes
The examples were reviewed against official documentation, but they were not executed end-to-end because this review environment does not expose an NVIDIA GPU or CUDA-capable Podman runtime.
