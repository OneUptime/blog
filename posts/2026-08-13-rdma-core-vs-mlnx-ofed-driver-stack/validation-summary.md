# Validation Summary: Choose Distribution RDMA or NVIDIA OFED Without Mixing Stacks

## Status
validated

## Post Type
Technical selection and migration guide

## Technologies Covered
- Linux RDMA kernel drivers and userspace
- Upstream `rdma-core`, libibverbs, librdmacm, and hardware providers
- NVIDIA MLNX_OFED and DOCA-OFED / DOCA-Host profiles
- NVIDIA ConnectX, BlueField, mlx4, and mlx5 hardware support
- InfiniBand, RoCE, IPoIB, SRP, and NFS/RDMA
- Linux kernel module packaging, DKMS/KMP compatibility, initramfs, and Secure Boot
- NVIDIA firmware inventory and MFT `mlxfwmanager`

## Sources Consulted
- rdma-core upstream README and supported-provider list (https://github.com/linux-rdma/rdma-core)
- Linux kernel mlx5 driver documentation (https://www.kernel.org/doc/html/latest/networking/device_drivers/ethernet/mellanox/mlx5/index.html)
- Linux kernel mlx5 Kconfig and module documentation (https://www.kernel.org/doc/html/latest/networking/device_drivers/ethernet/mellanox/mlx5/kconfig.html)
- Linux kernel module-signing documentation (https://docs.kernel.org/admin-guide/module-signing.html)
- iproute2 `rdma dev` manual (https://man7.org/linux/man-pages/man8/rdma-dev.8.html)
- rdma-core `ibv_devinfo` manual (https://man7.org/linux/man-pages/man1/ibv_devinfo.1.html)
- pciutils `lspci` manual (https://man7.org/linux/man-pages/man8/lspci.8.html)
- kmod `modinfo` manual (https://man7.org/linux/man-pages/man8/modinfo.8.html)
- Linux `ldd` manual (https://man7.org/linux/man-pages/man1/ldd.1.html)
- NVIDIA Linux drivers and MLNX_OFED-to-DOCA-OFED transition page (https://network.nvidia.com/products/infiniband-drivers/linux/mlnx_ofed/)
- NVIDIA DOCA profiles and supported-device list (https://networking-docs.nvidia.com/doca/archive/3-4-0/doca-profiles)
- NVIDIA MLNX_OFED-to-DOCA-OFED transition guide (https://networking-docs.nvidia.com/doca/archive/3-4-0/mlnx_ofed-to-doca-ofed-transition-guide)
- NVIDIA DOCA current general support, host OS, kernel, and DKMS information (https://networking-docs.nvidia.com/doca/archive/3-4-0/general-support)
- NVIDIA DOCA-Host installation, uninstallation, upgrade, and module-signing instructions (https://networking-docs.nvidia.com/doca/archive/3-4-0/doca-host-installation-and-upgrade)
- NVIDIA MLNX_OFED installation behavior and package contents (https://docs.nvidia.com/networking/display/MLNXOFEDv24040660/Introduction)
- NVIDIA MLNX_OFED 4.9 LTS release notes for ConnectX-3 and ConnectX-3 Pro (https://docs.nvidia.com/networking/display/nvidia-mlnx-ofed-documentation-v4-9-7-1-0-0-lts.0%20LTS.pdf)
- NVIDIA networking LTS release catalog (https://networking-docs.nvidia.com/software/lts-releases)
- NVIDIA MLNX_OFED upstream-library and split-package options (https://docs.nvidia.com/networking/display/nvidia-mlnx-ofed-documentation-v24-10-4-1-4-0-lts-2024-lts-u4.0%20LTS%20%282024%20LTS%20U4%29.pdf)
- NVIDIA MLNX_OFED kernel ABI and rebuild troubleshooting (https://docs.nvidia.com/networking/display/mlnxofedv23102131201lts/installation-related-issues.pdf)
- NVIDIA MFT `mlxfwmanager` command reference (https://docs.nvidia.com/networking/display/nvidia-firmware-tools-mft-documentation-v4-26-1-6-lts-2023-lts-u3.pdf)

## Issues Found
- The vendor-kernel table described drivers only as packages matched to OS/kernel builds. Current DOCA-Host normally ships driver sources that DKMS builds locally on supported OS/profile combinations, while legacy MLNX_OFED packaging varies by OS. Updated the table to reflect the current architecture.
- The post's generic `mlx5` family reference could be read as the name of a single module. Clarified it by naming the relevant Linux modules, `mlx5_core` and `mlx5_ib`.
- The ConnectX-3 discussion could imply that MLNX_OFED 4.9 remains a currently maintained NVIDIA LTS branch. NVIDIA still directs these adapters to 4.9, but that archived branch is absent from the current LTS catalog. Changed the text to require an applicable support agreement for that legacy option.
- The warning and conclusion could be read as rejecting every split-origin kernel/userspace layout. NVIDIA documents specific upstream-rdma-core and split package combinations, so the text now rejects undocumented overlays while allowing combinations that the vendor explicitly supports.
- Corrected `kernel live-cycle integration` to `kernel lifecycle integration`.

## Review Notes
- All commands and flags shown are valid: `lspci -nnk`, `mlxfwmanager --query`, `rdma dev show`, `ibv_devinfo -v`, `uname -r`, `modinfo`, `ofed_info -s`, and `ldd`. They require their corresponding packages; MFT and `ofed_info` are not necessarily present on a distribution-only installation.
- The `rdma` command is supplied by iproute2. `ldd` shows the executable's direct ELF dependencies, including libibverbs, but does not identify a provider loaded later with `dlopen`; the post correctly also calls for package ownership checks.
- `modinfo` resolves the module file for the selected/running kernel. If a module file changed after the module was loaded, it is not by itself proof of the exact bytes currently resident in memory.
- NVIDIA documents October 2024 as the last standalone MLNX_OFED release, with LTS updates through October 2027, and states that new features moved to DOCA-OFED starting in January 2025.
- Current NVIDIA profile guidance identifies `doca-ofed` as the MLNX_OFED-like drivers-and-tools profile, recommends broader profiles for ConnectX and BlueField deployments, and publishes a finite supported-device list.
- All seven external links in the post returned HTTP 200 and led to relevant upstream Linux, rdma-core, or NVIDIA documentation.
