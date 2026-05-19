# Validation Summary: How to Install NVIDIA CUDA Toolkit on Ubuntu

## Status
validated

## Post Type
Tutorial / Installation Guide

## Technologies Covered
- NVIDIA CUDA Toolkit (12.3, 11.8)
- NVIDIA proprietary GPU drivers
- Ubuntu (20.04, 22.04, 24.04)
- APT package manager (.deb method)
- CUDA runfile installer
- DKMS (Dynamic Kernel Module Support)
- Nouveau driver (open-source NVIDIA driver)
- Secure Boot / mokutil
- cuDNN (NVIDIA Deep Neural Network library)
- CUDA samples (deviceQuery)
- update-alternatives for managing multiple CUDA versions

## Sources Consulted
- NVIDIA CUDA Installation Guide for Linux 12.3: https://docs.nvidia.com/cuda/archive/12.3.0/cuda-installation-guide-linux/index.html
- CUDA Toolkit 12.3 Downloads / Archive: https://developer.nvidia.com/cuda-12-3-0-download-archive
- NVIDIA/cuda-samples GitHub repository: https://github.com/NVIDIA/cuda-samples
- cuDNN Installation Guide (current): https://docs.nvidia.com/deeplearning/cudnn/installation/latest/linux.html
- CUDA 11.6 release notes (re: samples removal from toolkit)

## Issues Found

1. **`cuda-install-samples-12.3.sh` script does not exist.**
   - The post recommended running `cuda-install-samples-12.3.sh ~/cuda-samples` to copy samples to the home directory.
   - NVIDIA stopped bundling CUDA samples with the toolkit starting with CUDA 11.6, and the `cuda-install-samples-X.Y.sh` helper script was removed at that time. Samples are now distributed exclusively from https://github.com/NVIDIA/cuda-samples.
   - **Fix:** Replaced the step with `git clone --branch v12.3 https://github.com/NVIDIA/cuda-samples.git ~/cuda-samples` and added a brief note explaining the change. The downstream `Samples/1_Utilities/deviceQuery` path is preserved correctly by the `v12.3` tag.

2. **Outdated cuDNN package names (`libcudnn8*`).**
   - The post recommended `sudo apt-get install -y libcudnn8 libcudnn8-dev libcudnn8-samples`, which targets the legacy cuDNN 8 series.
   - Per current NVIDIA cuDNN installation docs, cuDNN 9 is the current release and the recommended package on Ubuntu with CUDA 12 is `cudnn9-cuda-12` (a meta-package). Additionally, `libcudnn8-samples` and the equivalent cuDNN 9 samples package are not standard — cuDNN samples are now hosted on GitHub (cudnn-frontend).
   - **Fix:** Replaced the install command with `sudo apt-get install -y cudnn9-cuda-12`, and removed the non-existent samples package.

## Review Notes
- The `cuda-keyring_1.1-1_all.deb` URL and the CUDA 12.3.0 runfile URL (with driver 545.23.06) are both verified as correct against NVIDIA's official download archive.
- The post pins examples to CUDA 12.3, which was current at the time of writing. Readers using newer CUDA versions (12.4+, 13.x) will need to adjust version numbers throughout — this is mentioned indirectly via the link to the CUDA downloads page but could be made more explicit.
- The `cuda` meta-package will install the bundled NVIDIA driver. On systems with a pre-existing newer driver, users should prefer `cuda-toolkit-12-3` to avoid driver downgrades; the post mentions this trade-off only in the runfile section.
- For Ubuntu 24.04 specifically (listed as supported in prerequisites), readers should use the `ubuntu2404` repo path in the keyring URL rather than `ubuntu2204` — the post correctly points users to the NVIDIA downloads page to obtain the right URL.
- The samples clone is pinned to the `v12.3` tag to preserve the `Samples/1_Utilities/deviceQuery` path; the `master` branch of the cuda-samples repo has since been reorganized (paths now include a `cpp/` segment).
