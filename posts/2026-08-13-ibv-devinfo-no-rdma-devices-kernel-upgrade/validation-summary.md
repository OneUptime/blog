# Validation Summary: Restore Missing RDMA Devices After a Kernel Upgrade

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Linux PCI device discovery and driver binding
- Linux kernel modules, kmod, kABI compatibility, and `weak-updates`
- Linux kernel module signing, Secure Boot, and kernel lockdown
- RDMA, InfiniBand, and the Linux RDMA subsystem
- NVIDIA ConnectX adapters and the `mlx5_core`/`mlx5_ib` driver stack
- rdma-core, libibverbs, libmlx5, `ibv_devinfo`, `ibv_devices`, and `ibstat`
- uverbs character devices and the stable InfiniBand sysfs ABI
- NVIDIA MLNX_OFED, DOCA-OFED, KMP packages, and DKMS
- KVM/QEMU VFIO device passthrough

## Sources Consulted
- rdma-core project overview and provider list (https://github.com/linux-rdma/rdma-core)
- rdma-core `ibv_devinfo(1)` manual (https://github.com/linux-rdma/rdma-core/blob/master/libibverbs/man/ibv_devinfo.1)
- rdma-core `ibv_devices(1)` manual (https://github.com/linux-rdma/rdma-core/blob/master/libibverbs/man/ibv_devices.1)
- rdma-core `ibv_get_device_list(3)` manual and `IBV_SHOW_WARNINGS` behavior (https://github.com/linux-rdma/rdma-core/blob/master/libibverbs/man/ibv_get_device_list.3.md)
- rdma-core libibverbs device-node, permissions, and logging documentation (https://github.com/linux-rdma/rdma-core/blob/master/Documentation/libibverbs.md)
- rdma-core libibverbs device/provider discovery implementation (https://github.com/linux-rdma/rdma-core/blob/master/libibverbs/init.c)
- rdma-core `ibstat(8)` manual (https://github.com/linux-rdma/rdma-core/blob/master/infiniband-diags/man/ibstat.8.in.rst)
- iproute2 `rdma-dev(8)` and `rdma-link(8)` manuals (https://git.kernel.org/pub/scm/network/iproute2/iproute2.git/tree/man/man8/rdma-dev.8, https://git.kernel.org/pub/scm/network/iproute2/iproute2.git/tree/man/man8/rdma-link.8)
- Linux kernel stable InfiniBand and uverbs sysfs ABI (https://www.kernel.org/doc/Documentation/ABI/stable/sysfs-class-infiniband)
- Linux kernel module-signing documentation (https://docs.kernel.org/admin-guide/module-signing.html)
- Linux kernel Kbuild output-file documentation for `modules.builtin` and `modules.builtin.modinfo` (https://docs.kernel.org/kbuild/kbuild.html)
- Linux kernel VFIO documentation (https://docs.kernel.org/driver-api/vfio.html)
- kmod `modinfo(8)`, `modprobe(8)`, and `lsmod(8)` manuals (https://man7.org/linux/man-pages/man8/modinfo.8.html, https://man7.org/linux/man-pages/man8/modprobe.8.html, https://man7.org/linux/man-pages/man8/lsmod.8.html)
- pciutils `lspci(8)` manual (https://man7.org/linux/man-pages/man8/lspci.8.html)
- systemd `journalctl(1)` manual (https://www.freedesktop.org/software/systemd/man/latest/journalctl.html)
- NVIDIA MLNX_OFED `mlx5_core`/`mlx5_ib` architecture and package overview (https://networking-docs.nvidia.com/mlnxofedswum/24104140lts/introduction)
- NVIDIA MLNX_OFED kernel ABI and `weak-updates` troubleshooting (https://networking-docs.nvidia.com/mlnxofedswum/24104140lts/installation-related-issues)
- NVIDIA MLNX_OFED driver installation and Debian/Ubuntu DKMS packages (https://networking-docs.nvidia.com/mlnxofedswum/24104140lts/installing-the-driver)
- NVIDIA MLNX_OFED UEFI Secure Boot key-enrollment documentation (https://networking-docs.nvidia.com/mlnxofedswum/24104140lts/uefi-secure-boot)
- NVIDIA MLNX_OFED-to-DOCA-OFED transition guide (https://networking-docs.nvidia.com/doca/archive/3-4-0/mlnx_ofed-to-doca-ofed-transition-guide)

## Issues Found
- The VM-passthrough wording implied that every hypervisor binds an assigned function specifically to `vfio-pci`. Qualified this as typical KVM/QEMU VFIO behavior and allowed for device-specific VFIO drivers.
- “Current NVIDIA ConnectX devices” did not state the generation boundary and could be read as including ConnectX-3, which uses the `mlx4` stack. Changed it to ConnectX-4 and newer, for which NVIDIA documents `mlx5_core` and `mlx5_ib`.
- The version-magic sentence could make a different release string shown by `modinfo` look conclusive even when a vendor has installed a compatible KMP through `weak-updates`. Clarified that a kernel-reported version-magic mismatch is the incompatibility evidence.
- The MLNX_OFED DKMS wording applied broadly to all Debian-family installations. Narrowed it to Debian/Ubuntu installations using NVIDIA's documented `mlnx-ofed-kernel-dkms` package.
- The kernel-journal commands assumed that an unprivileged account could read the system journal. Added `sudo` to all three `journalctl -k` commands so they work on systems where journal access is limited to root or designated groups.
- The Secure Boot log filter could miss explicit unsigned-module rejection and lockdown messages. Added `unsigned` and `lockdown` to the filter.

## Review Notes
- All remaining command names and options were confirmed as current, including `lspci -nnk`, `modinfo -F`, `lsmod`, `modprobe`, `dkms status`, `mokutil --sb-state`, `rdma dev show`, `rdma link show`, `ibv_devices`, `ibv_devinfo -v`, and `ibstat`.
- `lsmod` omits built-in drivers, and modern kmod can obtain built-in metadata from `modules.builtin.modinfo` when the distribution supplies it. The post appropriately treats module commands as one layer of evidence rather than as the sole test.
- `ldd` shows the directly linked libibverbs selected for `ibv_devinfo`, but normally does not list libmlx5 because libibverbs loads providers dynamically. The post's package-ownership checks, `IBV_SHOW_WARNINGS`, and verbs logging guidance cover that distinction.
- The NVIDIA links in the post are pinned to the MLNX_OFED 24.10 U4 documentation. They remain live and support the cited behavior; later 24.10 LTS updates do not change the reviewed KMP, Secure Boot, or transition claims.
