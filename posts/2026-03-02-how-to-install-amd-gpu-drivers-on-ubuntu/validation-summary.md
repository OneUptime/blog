# Validation Summary: How to Install AMD GPU Drivers on Ubuntu

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Ubuntu
- AMDGPU kernel driver
- Radeon Software for Linux
- ROCm
- OpenCL
- HIP
- PyTorch
- AMD SMI / ROCm SMI

## Sources Consulted
- AMD ROCm quick start installation guide: https://rocm.docs.amd.com/projects/install-on-linux/en/latest/install/quick-start.html
- AMD ROCm Ubuntu package-manager installation guide: https://rocm.docs.amd.com/projects/install-on-linux/en/latest/install/install-methods/package-manager/package-manager-ubuntu.html
- AMD ROCm system requirements and supported GPUs: https://rocm.docs.amd.com/projects/install-on-linux/en/latest/reference/system-requirements.html
- AMD Radeon Software for Linux with ROCm installation guide: https://rocm.docs.amd.com/projects/radeon-ryzen/en/latest/docs/install/installrad/native_linux/install-radeon.html
- AMD ROCm post-installation instructions: https://rocm.docs.amd.com/projects/install-on-linux/en/latest/install/post-install.html
- PyTorch local installation selector: https://pytorch.org/get-started/locally/
- AMD ROCm SMI documentation and deprecation notice: https://rocm.docs.amd.com/projects/rocm_smi_lib/en/docs-6.1.1/install/install.html
- AMD SMI documentation: https://rocm.docs.amd.com/projects/amdsmi/en/latest/

## Issues Found
- The post described the desktop install path as AMDGPU-PRO and implied `--usecase=graphics` installs the proprietary stack. Updated the terminology to Radeon Software for Linux and clarified that `graphics` installs the open-source Mesa graphics stack, while proprietary workstation components apply only to supported workstation cases.
- The ROCm GPU support link and examples were outdated. Updated the support URL and adjusted the supported GPU examples to match the current AMD ROCm supported GPU matrix.
- The installer examples used an old AMDGPU installer package. Updated the Ubuntu 22.04 examples to the current ROCm 7.2.3 package shown in AMD documentation and changed `dpkg -i` to `apt install ./...deb` to handle dependencies.
- The ROCm install flow skipped AMD's current kernel driver package step when using the package-manager path. Added installation of matching kernel headers/modules and `amdgpu-dkms` before installing `rocm`.
- The post added users to a `rocm` group. Current AMD guidance uses `render` and `video`; removed `rocm` from the command.
- The ROCm environment snippet used `LD_LIBRARY_PATH` as a general default. Replaced it with AMD's documented linker configuration via `/etc/ld.so.conf.d/rocm.conf` and `ldconfig`.
- The PyTorch ROCm wheel index was outdated. Updated it to the current PyTorch ROCm selector value and kept the note to check pytorch.org for the latest.
- The benchmark called `torch.cuda.synchronize()` and `torch.cuda.memory_allocated()` even when running on CPU fallback. Added guards so the example remains valid without a detected ROCm GPU.
- The OpenCL package names were outdated. Replaced `rocm-opencl` and `rocm-opencl-dev` with `rocm-opencl-runtime` and `rocm-opencl-sdk`.
- The troubleshooting section recommended an unsupported `HSA_OVERRIDE_GFX_VERSION` workaround as a normal fix. Removed the override command and directed readers back to the ROCm support matrix.
- The uninstall example used an outdated AMDGPU-PRO framing. Updated it to use `amdgpu-uninstall` and reinstall only the needed ROCm package.
- The monitoring section presented `rocm-smi` as the main current tool. Clarified it as the legacy ROCm management tool and added `amd-smi list`.

## Review Notes
The post is technically relevant and validated after the corrections above. ROCm support changes frequently by GPU, Ubuntu point release, kernel, and PyTorch wheel version, so future maintenance should re-check AMD's ROCm compatibility matrix and PyTorch's install selector before publishing.
