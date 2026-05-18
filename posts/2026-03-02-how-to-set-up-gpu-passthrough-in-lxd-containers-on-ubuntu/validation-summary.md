# Validation Summary: How to Set Up GPU Passthrough in LXD Containers on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- LXD (Linux container hypervisor)
- NVIDIA GPU drivers and CUDA toolkit
- NVIDIA MIG (Multi-Instance GPU) on A100/H100
- NVIDIA Container Toolkit
- AMD ROCm
- Ubuntu 24.04

## Sources Consulted
- LXD GPU device documentation: https://documentation.ubuntu.com/lxd/latest/reference/devices_gpu/
- NVIDIA Ada Lovelace architecture reference: https://en.wikipedia.org/wiki/Ada_Lovelace_(microarchitecture)
- NVIDIA MIG User Guide / Supported Profiles: https://docs.nvidia.com/datacenter/tesla/mig-user-guide/supported-mig-profiles.html
- NVIDIA MIG Device Names: https://docs.nvidia.com/datacenter/tesla/mig-user-guide/mig-device-names.html
- NVIDIA supported drivers and CUDA toolkit versions: https://docs.nvidia.com/datacenter/tesla/drivers/supported-drivers-and-cuda-toolkit-versions.html
- NVIDIA Driver 535.x release notes: https://docs.nvidia.com/datacenter/tesla/tesla-release-notes-535-104-12/index.html
- ROCm Ubuntu install docs: https://rocm.docs.amd.com/projects/install-on-linux/en/latest/install/install-methods/package-manager/package-manager-ubuntu.html
- ROCm 5.7 GPU/OS support matrix: https://rocm.docs.amd.com/en/docs-5.7.0/release/gpu_os_support.html
- PCI Device Hunt (NVIDIA vendor 0x10DE): https://devicehunt.com/view/type/pci/vendor/10DE

## Issues Found

1. **GPU resource output listed RTX 4090 as "Ampere"** (line 77). The RTX 4090 is based on NVIDIA's **Ada Lovelace** architecture (AD102), not Ampere (which is the RTX 30 series). Fixed by changing `Architecture: Ampere` to `Architecture: Ada Lovelace`.

2. **MIG profile example was invalid** (lines 188–191). The post showed creating `3x 3g.20gb on A100-80GB`. This is wrong on two counts: (a) `3g.20gb` is an A100-40GB profile — the A100-80GB equivalent is `3g.40gb`; (b) only 2 instances of the `3g` profile can fit on a single A100 because the `3g` profile consumes 3 of the 7 available compute slices (3+3=6, the remaining slice cannot host another 3g). Fixed by changing the comment to `2x 3g.40gb on A100-80GB` and removing the third `nvidia-smi mig -cgi` call.

3. **ROCm repository line targeted wrong Ubuntu codename and unsupported ROCm version** (line 219). The container is launched from `ubuntu:24.04` (noble), but the apt source pointed to `5.7 jammy`. ROCm 5.7 only supports Ubuntu 20.04 / 22.04, not 24.04. Fixed by updating the repo to `6.2 noble`, which is a ROCm series that officially supports Ubuntu 24.04.

## Review Notes

- The post uses the deprecated `apt-key add` pattern in several places (CUDA, NVIDIA Container Toolkit, ROCm). The modern approach is `gpg --dearmor` into `/etc/apt/keyrings/` and a `[signed-by=...]` clause in the sources list. For CUDA specifically, NVIDIA now recommends the `cuda-keyring_1.1-1_all.deb` package. These commands still work on current Ubuntu, but readers may see deprecation warnings. Left as-is since the post's approach is still functional and changing it is a stylistic rather than technical correction.
- The `Control: controlD64` line in the LXD GPU listing reflects older kernels — modern Linux kernels no longer create `/dev/dri/controlD*` device files. The field still appears (often empty) in some LXD versions. Left as-is since it is an illustrative comment.
- CUDA toolkit version pinning: the host driver 535 ships with CUDA 12.2; the main installation section installs `cuda-toolkit-12-3` and relies on CUDA minor-version compatibility, while the troubleshooting section recommends downgrading to `cuda-toolkit-12-2`. Both paths are valid given NVIDIA's compatibility model, so left unchanged.
- The `lxc info --resources` output format and field names have evolved across LXD versions; the snippet is illustrative and the field names shown are reasonable for recent LXD/Incus releases.
