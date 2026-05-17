# Validation Summary: How to Install NVIDIA Drivers on Ubuntu Server

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- Ubuntu Server (22.04 / 24.04)
- NVIDIA proprietary GPU drivers (nvidia-driver-535, nvidia-headless-*, nvidia-utils-*)
- `ubuntu-drivers` tool / `ubuntu-drivers-common`
- NVIDIA CUDA Toolkit (12.x)
- NVIDIA CUDA apt repository (`cuda-keyring`)
- nouveau kernel module blacklisting
- DKMS (Dynamic Kernel Module Support)
- UEFI Secure Boot / `mokutil`
- `nvidia-smi`, `nvidia-persistenced`, `nvidia-ctk`
- systemd unit files
- NVIDIA Container Toolkit (Docker / Kubernetes GPU support)

## Sources Consulted
- NVIDIA CUDA Toolkit Release Notes: https://docs.nvidia.com/cuda/cuda-toolkit-release-notes/index.html (driver–CUDA version compatibility table)
- NVIDIA CUDA Samples repository: https://github.com/NVIDIA/cuda-samples (sample location since CUDA 11.6)
- NVIDIA Container Toolkit installation guide: https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html (apt repo + `nvidia-ctk runtime configure`)
- Ubuntu `ubuntu-drivers-common` documentation (driver install syntax `nvidia:<branch>`)
- NVIDIA Driver Persistence documentation: https://docs.nvidia.com/deploy/driver-persistence/index.html
- `nvidia-smi` manual (flags `-pm`, `-pl`, `--query-gpu`, `dmon -s`)
- DKMS manual (`dkms install <module>/<version>`, `dkms autoinstall`)

## Issues Found
- **CUDA samples path is outdated.** The post originally instructed users to `cd /usr/local/cuda/samples/1_Utilities/deviceQuery` and run `sudo make`. NVIDIA removed bundled samples from the CUDA Toolkit starting with CUDA 11.6 — samples are now distributed via the `NVIDIA/cuda-samples` GitHub repository and use a CMake-based build. Updated the snippet to clone the repository and build with `cmake` + `make` against `Samples/1_Utilities/deviceQuery`.

## Review Notes
- Driver/CUDA compatibility numbers in the troubleshooting section (CUDA 12.3 ≥ 545.23, 12.2 ≥ 535.54, 12.0 ≥ 525.60, 11.8 ≥ 520.61) match NVIDIA's release-notes Table 3.
- The `ubuntu-drivers install nvidia:535` shorthand is valid (vendor:branch syntax supported by `ubuntu-drivers-common`).
- The hand-written `nvidia-persistenced.service` example works, but modern `nvidia-driver-*` packages already ship `/lib/systemd/system/nvidia-persistenced.service` (which runs as the dedicated `nvidia-persistenced` user). Using the shipped unit (`sudo systemctl enable --now nvidia-persistenced`) is generally preferable to authoring one with `--user root`; left as-is because both are functional.
- The DKMS troubleshooting command `sudo dkms install nvidia/$(nvidia-smi --query-gpu=driver_version ...)` has a chicken-and-egg risk: if the driver is broken enough that `nvidia-smi` fails, the substitution yields an empty argument. `sudo dkms autoinstall` (also shown) is the more reliable fallback. Not a hard error.
- `apt search` prints a warning ("WARNING: apt does not have a stable CLI interface…") when used in pipelines; `apt-cache search` or `apt list --installed` are more script-friendly but the shown command still works interactively.
- Both Ubuntu 22.04 and 24.04 repository paths (`ubuntu2204`, `ubuntu2404`) referenced in Method 3 are correct on `developer.download.nvidia.com`.
- The post is pinned heavily to driver branch 535 and CUDA 12.3, which were current LTS/release at the time of writing; readers running newer hardware (Blackwell / RTX 50-series, H200) will need a newer branch (≥ 550 / 570) but the methodology in the post remains valid.
