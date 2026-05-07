# Validation Summary: How to Configure GPU Access for Podman AI Lab

## Status
validated

## Post Type
Tutorial / technical setup guide

## Technologies Covered
- Podman
- Container Device Interface (CDI)
- NVIDIA Container Toolkit
- NVIDIA CUDA GPU containers
- AMD ROCm
- llama.cpp / llama-server
- GPU device passthrough and SELinux device access

## Sources Consulted
- NVIDIA Container Toolkit installation guide: https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html
- NVIDIA Container Toolkit CDI support guide: https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/1.18.0/cdi-support.html
- Podman run manual: https://docs.podman.io/en/v5.4.1/markdown/podman-run.1.html
- Podman device / SELinux documentation: https://docs.podman.io/en/stable/markdown/podman-pod-create.1.html
- ROCm container GPU access documentation: https://rocm.docs.amd.com/projects/install-on-linux/en/docs-6.0.0/how-to/docker.html
- ROCm package manager installation documentation: https://rocm.docs.amd.com/projects/radeon-ryzen/en/latest/docs/install/installryz/native_linux/install-package-manager.html
- llama.cpp server README: https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md
- llama.cpp Docker documentation: https://github.com/ggml-org/llama.cpp/blob/master/docs/docker.md

## Issues Found
- Added missing Ubuntu/Debian prerequisite packages for the NVIDIA Container Toolkit repository setup. The official NVIDIA instructions require `ca-certificates`, `curl`, and `gnupg2`.
- Updated the NVIDIA Podman CDI test command to match current NVIDIA CDI examples by using `ubuntu nvidia-smi -L` and adding `--security-opt=label=disable`.
- Updated llama.cpp container image references from the older `ghcr.io/ggerganov/llama.cpp` namespace to the current official `ghcr.io/ggml-org/llama.cpp` namespace.
- Replaced the AMD Podman `--group-add video` examples with `--group-add keep-groups`, which is the Podman-supported way to preserve the rootless user's supplementary group access for devices.
- Corrected the ROCm installation snippet to use the current `rocm` meta-package after configuring AMD's official package repository, rather than relying on older split package names alone.
- Fixed the benchmarking command. The original command used `llama-server` with one-shot prompt flags (`--prompt` and `--n-predict`), which is not how the server image is invoked. It now uses the full CUDA image with `llama-bench`.

## Review Notes
- The VRAM sizing guidance for `--n-gpu-layers` is approximate and model-dependent. It is acceptable as practical guidance, but future updates could note that context size, quantization, backend, KV cache settings, and exact model architecture all affect memory use.
- The ROCm installation section intentionally remains brief, but ROCm package repository setup varies by ROCm version and Ubuntu release. Future revisions could link to the exact AMD installation page for the target distribution.
