# Validation Summary: How to Set Up CUDA and ROCm Drivers for Machine Learning Frameworks on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- NVIDIA CUDA
- NVIDIA drivers
- NVIDIA cuDNN
- AMD ROCm
- AMDGPU DKMS driver
- PyTorch GPU availability checks

## Sources Consulted
- NVIDIA CUDA Installation Guide for Linux: https://docs.nvidia.com/cuda/cuda-installation-guide-linux/
- NVIDIA Driver Installation Guide for Red Hat Enterprise Linux: https://docs.nvidia.com/datacenter/tesla/driver-installation-guide/red-hat-enterprise-linux.html
- NVIDIA cuDNN Installation Guide for Linux: https://docs.nvidia.com/deeplearning/cudnn/installation/latest/linux.html
- AMD ROCm quick start installation guide: https://rocm.docs.amd.com/projects/install-on-linux/en/develop/install/quick-start.html
- AMD ROCm installation prerequisites: https://rocm.docs.amd.com/projects/install-on-linux/en/docs-6.3.3/install/prerequisites.html
- AMD ROCm post-installation instructions: https://rocm.docs.amd.com/projects/install-on-linux/en/latest/install/post-install.html
- AMD ROCm Bandwidth Test documentation: https://rocm.docs.amd.com/projects/rocm_bandwidth_test/en/latest/how-to/using_rocm_bandwidth_test.html
- PyTorch HIP semantics documentation: https://docs.pytorch.org/docs/stable/notes/hip

## Issues Found
- The NVIDIA driver section was labeled as driver installation even though it only disabled the Nouveau driver. I changed the heading to describe the actual step.
- The CUDA install command claimed the toolkit includes drivers and pinned CUDA 12.4. I changed it to install the current `cuda-toolkit` package alongside `cuda-drivers`, and added the RHEL 9 NVIDIA DNF module enablement required by current NVIDIA driver documentation.
- The CUDA repo cache command used `dnf clean all`; NVIDIA documents `dnf clean expire-cache` for this flow, so I updated it.
- The cuDNN commands used older cuDNN 8 package names. I changed them to current cuDNN 9 CUDA-major meta-packages.
- The ROCm repository snippet used an outdated ROCm 6.0 repository URL. I replaced it with AMD's current RHEL 9.7 AMDGPU installer package path.
- The ROCm install commands used older individual HIP package names. I changed them to AMD's current `amdgpu-dkms` plus `rocm` installation flow and added the documented RHEL prerequisites.
- The ROCm verification command used `rocm-smi`; current ROCm post-installation documentation uses `amd-smi`, so I updated the check.

## Review Notes
The ROCm installer package URL is specific to RHEL 9.7 and ROCm 7.2.3, which is current in AMD's quick start documentation at review time. Readers on other supported RHEL minor releases should use the matching AMD-documented URL for their OS version.
