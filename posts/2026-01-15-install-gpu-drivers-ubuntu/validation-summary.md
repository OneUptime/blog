# Validation Summary: How to Install GPU Drivers (NVIDIA/AMD) on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu (apt, ubuntu-drivers, DKMS)
- NVIDIA proprietary drivers (graphics-drivers PPA, .run installer)
- Nouveau open-source driver
- NVIDIA CUDA Toolkit & cuDNN
- AMD AMDGPU / AMDGPU-PRO drivers
- AMD ROCm compute platform
- Mesa Vulkan / OpenCL
- Secure Boot / MOK module signing
- PRIME / PRIME render offload, EnvyControl (hybrid laptop graphics)
- X.org and Wayland configuration
- GPU monitoring tools (nvidia-smi, rocm-smi, nvtop, radeontop, intel-gpu-tools, gpustat)
- systemd, udev, TLP power management

## Sources Consulted
- NVIDIA CUDA Samples repository (samples moved out of the toolkit since CUDA 11.6): https://github.com/NVIDIA/cuda-samples
- NVIDIA CUDA Installation Guide for Linux / cuda-keyring & cuda-toolkit packaging: https://docs.nvidia.com/cuda/cuda-installation-guide-linux/
- AMD ROCm installation docs (apt repo, rocm-hip-sdk, render/video groups): https://rocm.docs.amd.com/projects/install-on-linux/en/latest/
- Mesa OpenCL / Rusticl ICD packaging on Ubuntu (mesa-opencl-icd): https://discuss.pixls.us/t/how-to-enable-opencl-opencl-rocm-for-amd-rx-570-580-on-ubuntu-23-04/37226 and ROCm/ROCm discussions
- NVIDIA driver / PRIME render offload documentation (__NV_PRIME_RENDER_OFFLOAD, NVreg_DynamicPowerManagement): https://download.nvidia.com/XFree86/Linux-x86_64/ (README)
- Ubuntu Secure Boot / mokutil / sign-file documentation: https://wiki.ubuntu.com/UEFI/SecureBoot

## Issues Found
1. **CUDA sample verification used an obsolete path and build command.** The post instructed `cd /usr/local/cuda/samples/1_Utilities/deviceQuery` followed by `sudo make`. Since CUDA 11.6 the sample programs are no longer bundled with the toolkit (so this directory does not exist after installing `cuda-toolkit-12-6`), and the samples now build with CMake rather than bare Makefiles. Replaced with a `git clone https://github.com/NVIDIA/cuda-samples.git`, `cmake -B build && cmake --build build`, then locate-and-run the `deviceQuery` binary via `find`. This is robust to the repo's directory layout.

2. **`rocm-opencl-runtime` referenced before the ROCm repo is added.** In the "AMDGPU (Open Source - Built into Kernel)" section the post ran `sudo apt install rocm-opencl-runtime`, but that package is not in Ubuntu's default repositories — it comes from the ROCm apt repository that the post only adds later. As written the command would fail at that point. Changed to `sudo apt install mesa-opencl-icd clinfo` (Mesa's Rusticl ICD, available in Ubuntu's repos and consistent with the open-source theme of the section), and added a note pointing to `rocm-opencl-runtime` from the ROCm repo for the full stack.

## Review Notes
- The illustrative Nouveau OpenGL renderer string `NV136` does not match an Ampere GA104 (RTX 3070) part (NV136 is a Maxwell-era code); it is only example output and not misleading enough to warrant a change.
- `glxinfo`, `clinfo`, `vulkaninfo`, and `cvt` come from packages not explicitly installed in-line (`mesa-utils`, `clinfo`, `vulkan-tools`, `x11-xserver-utils`); this is conventional for a guide and not an error.
- The ROCm example pins `apt/6.0 jammy` (Ubuntu 22.04). ROCm has released much newer versions since; readers should substitute the current ROCm version and codename matching their Ubuntu release. Left as-is since it is a valid historical example and the URL pattern is correct.
- All NVIDIA driver/CUDA package names (`nvidia-driver-550/555`, `cuda-toolkit-12-6`, `cudnn`, `cuda-keyring_1.1-1_all.deb` for `ubuntu2404`), `nvidia-smi`/`rocm-smi` flags, `mokutil`/`sign-file` signing flow, PRIME, and EnvyControl modes were verified correct and current.
