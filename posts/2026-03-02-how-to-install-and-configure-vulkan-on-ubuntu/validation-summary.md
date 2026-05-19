# Validation Summary: How to Install and Configure Vulkan on Ubuntu

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Ubuntu package management
- Vulkan loader, ICDs, validation layers, and SDK
- NVIDIA, AMD RADV/AMDVLK, and Intel Vulkan drivers
- Vulkan tools (`vulkaninfo`, `vkcube`, `vkvia`)
- GLSL to SPIR-V compilation with `glslangValidator`
- Wine, DXVK, and Proton
- Mesa RADV environment variables

## Sources Consulted
- Ubuntu NVIDIA driver installation documentation: https://ubuntu.com/server/docs/how-to/graphics/install-nvidia-drivers/
- Ubuntu package pages for `libvulkan1`, `libvulkan-dev`, `vulkan-tools`, `vulkan-validationlayers`, `mesa-vulkan-drivers`, and NVIDIA driver packages: https://packages.ubuntu.com/
- LunarG Vulkan SDK Ubuntu setup documentation: https://vulkan.lunarg.com/doc/view/latest/linux/getting_started_ubuntu.html
- LunarG Ubuntu package deprecation notice: https://vulkan.lunarg.com/content/view/packages-home.dhtml
- Khronos Vulkan Loader driver discovery documentation: https://github.com/KhronosGroup/Vulkan-Loader/blob/main/docs/LoaderDriverInterface.md
- Khronos Vulkan validation overview: https://docs.vulkan.org/guide/latest/validation_overview.html
- Mesa RADV documentation: https://docs.mesa3d.org/drivers/radv.html
- Mesa environment variable documentation: https://docs.mesa3d.org/envvars.html
- Khronos Vulkan-Tools `vkcube` source and usage text: https://github.com/KhronosGroup/Vulkan-Tools/
- DXVK GitHub latest release metadata: https://api.github.com/repos/doitsujin/dxvk/releases/latest
- AMDVLK GitHub releases: https://github.com/GPUOpen-Drivers/AMDVLK/releases
- AMDVLK discontinuation announcement: https://github.com/GPUOpen-Drivers/AMDVLK/discussions/416

## Issues Found
- The NVIDIA install command pinned `nvidia-driver-545`, which is not the current recommended approach and may not be available or appropriate on current Ubuntu systems. Changed it to `sudo ubuntu-drivers install`, matching Ubuntu's documented recommendation.
- The Vulkan tools bullet listed `vkvia` as a generic Vulkan tools command. Ubuntu's `vulkan-tools` package provides tools such as `vulkaninfo` and `vkcube`; `vkvia` is associated with the LunarG SDK. Clarified the wording.
- The LunarG SDK setup hard-coded the Ubuntu 22.04 Jammy repository. Added the Ubuntu 24.04 Noble repository example and kept Jammy as the 22.04-specific alternative.
- The LunarG SDK text did not mention that LunarG announced Ubuntu package updates would stop after May 2025. Added a caveat to check the SDK download site for the newest SDK release.
- The AMD section described AMDVLK as an active alternative and included a pinned 2024 package download. AMD announced AMDVLK was discontinued in September 2025 in favor of RADV, so the post now recommends RADV and leaves AMDVLK releases only as an archived legacy testing option.
- The multi-line `apt-get install` example placed comments after continuation backslashes, which would break shell parsing. Moved the package list to executable continuation lines.
- The ICD selection examples used `VK_ICD_FILENAMES`. The Vulkan loader now documents `VK_DRIVER_FILES` as the override variable, with `VK_ICD_FILENAMES` retained as a legacy name. Updated examples to `VK_DRIVER_FILES`.
- The validation-layer environment variable example used deprecated `VK_INSTANCE_LAYERS`. Updated it to the current loader variable `VK_LOADER_LAYERS_ENABLE`.
- The DXVK section incorrectly said DXVK translates DirectX 12. Corrected it to Direct3D 9/10/11 and noted that Direct3D 12 translation is handled by VKD3D-Proton.
- The DXVK download command used a stale `latest/download/dxvk-2.3.tar.gz` URL pattern and then changed into a hard-coded old directory. Updated it to the current latest DXVK release tag and matching archive directory.
- Installing `wine32` requires i386 architecture on Ubuntu. Added `dpkg --add-architecture i386` and `apt-get update` before installing Wine packages.
- The software-rendering and ICD override examples used the legacy ICD environment variable. Updated them to `VK_DRIVER_FILES`.
- The multiple-GPU example used `DISPLAY=:0` and described it as selecting the first GPU, which is not how Vulkan physical device selection works. Replaced it with `vkcube --gpu_number 0`, which is supported by Vulkan-Tools.
- The RADV tuning example used `RADV_PERFTEST=gpl`, which is no longer the current documented way to enable graphics pipeline library behavior on Mesa. Replaced it with a current troubleshooting-oriented `RADV_DEBUG=nogpl` note.

## Review Notes
The post is technically valid after the fixes. Some version-sensitive examples, such as AMDVLK release file names and NVIDIA power limits, may still need periodic refreshes because driver package names, downloadable assets, and GPU-specific limits change over time.
