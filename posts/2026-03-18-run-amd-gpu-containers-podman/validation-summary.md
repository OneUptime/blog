# Validation Summary: How to Run AMD GPU Containers with Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- AMD GPUs
- ROCm
- AMDGPU installer
- Linux DRI device nodes
- PyTorch on ROCm
- OpenCL / PyOpenCL
- ROCm SMI

## Sources Consulted
- AMD ROCm 6.0.2 Linux system requirements: https://rocm.docs.amd.com/projects/install-on-linux/en/docs-6.0.2/reference/system-requirements.html
- AMD ROCm 6.0 AMDGPU installer documentation: https://rocm.docs.amd.com/projects/install-on-linux/en/docs-6.0.0/how-to/amdgpu-install.html
- AMD ROCm container runtime documentation: https://rocm.docs.amd.com/projects/install-on-linux/en/latest/how-to/docker.html
- Podman run reference: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- AMD ROCm environment variables reference: https://rocm.docs.amd.com/en/latest/reference/env-variables.html
- AMD ROCm PyTorch compatibility documentation: https://rocm.docs.amd.com/en/docs-6.4.0/compatibility/ml-compatibility/pytorch-compatibility.html
- AMD ROCm SMI documentation: https://rocm.docs.amd.com/projects/rocm_smi_lib/en/latest/install/install.html

## Issues Found
- The hardware support section described support by broad GPU families, including the Radeon RX 6000 series. AMD's ROCm 6.0-era documentation lists specific supported GPU models and does not support entire Radeon generations. Updated the wording to "specific GPU models" and narrowed the Radeon bullets to selected RX 7000 and Radeon Pro GPUs.
- The install snippet labeled the RHEL 9.3 RPM command as "RHEL/Fedora". AMD's ROCm 6.0 installer documentation covers RHEL for that RPM, not Fedora. Updated the label to "RHEL 9.3" and matched AMD's documented `yum install` command.
- The Podman examples omitted `--group-add keep-groups`. Podman's documentation notes that rootless containers can fail to access devices when permissions are granted through supplementary groups unless those groups are preserved. Added `--group-add keep-groups` to the GPU container examples and rootless troubleshooting notes.
- The conclusion claimed rootless Podman works "seamlessly" with AMD GPUs with only group configuration. Updated it to mention supplementary group handling and removed the over-broad "full access" wording.

## Review Notes
- The Python examples are syntactically valid.
- `rocm-smi` remains usable in ROCm 6.0-era examples, but AMD now recommends migration to AMD SMI because ROCm SMI is planned for deprecation.
- The examples are pinned to ROCm 6.0 images. They are valid for the article's version context, but future refreshes should consider newer ROCm image tags and current supported GPU matrices.
