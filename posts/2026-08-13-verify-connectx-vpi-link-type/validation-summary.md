# Validation Summary: Verify ConnectX Ethernet or InfiniBand Mode Before Reconfiguring VPI

## Status
validated

## Post Type
Technical guide / Troubleshooting guide

## Technologies Covered
- NVIDIA ConnectX adapters and Virtual Protocol Interconnect (VPI)
- InfiniBand, Ethernet, RoCE, and IP over InfiniBand (IPoIB)
- Linux RDMA core, libibverbs, and RDMA sysfs
- NVIDIA Firmware Tools (MFT), `mlxconfig`, `mlxfwmanager`, and firmware reset flows
- PCI BDF mapping, SR-IOV PF/VF ownership, multi-host, and Socket Direct configurations
- InfiniBand Subnet Manager and OpenSM link-state diagnosis

## Sources Consulted
- Linux kernel stable InfiniBand sysfs ABI: https://www.kernel.org/doc/Documentation/ABI/stable/sysfs-class-infiniband
- Upstream rdma-core `ibv_devinfo(1)` manual: https://github.com/linux-rdma/rdma-core/blob/master/libibverbs/man/ibv_devinfo.1
- Upstream iproute2 `rdma-dev(8)` and `rdma-link(8)` manuals: https://github.com/iproute2/iproute2/blob/main/man/man8/rdma-dev.8 and https://github.com/iproute2/iproute2/blob/main/man/man8/rdma-link.8
- Upstream pciutils `lspci(8)` manual: https://github.com/pciutils/pciutils/blob/master/lspci.man
- systemd network-interface naming scheme: https://www.freedesktop.org/software/systemd/man/latest/systemd.net-naming-scheme.html
- Linux `ethtool(8)` manual: https://man7.org/linux/man-pages/man8/ethtool.8.html
- NVIDIA MFT 4.36 `mlxconfig` tool and usage documentation: https://networking-docs.nvidia.com/mftswum/4.36.0/mlxconfig-changing-device-configuration-tool and https://networking-docs.nvidia.com/mftswum/4.36.0/using-mlxconfig
- NVIDIA MFT 4.36 `mlxconfig` examples and supported-parameter documentation: https://networking-docs.nvidia.com/mftswum/4.36.0/examples-of-mlxconfig-usage and https://networking-docs.nvidia.com/mftswum/4.36.0/mft-supported-configurations-and-parameters
- NVIDIA MFT 4.36 `mlxfwmanager` and `mlxfwreset` documentation: https://networking-docs.nvidia.com/mftswum/4.36.0/mlxfwmanager-firmware-update-and-query-tool and https://networking-docs.nvidia.com/mftswum/4.36.0/mlxfwreset-loading-firmware-on-5th-generation-devices-tool
- NVIDIA MFT 4.31.0-6012 manual referenced by the post: https://docs.nvidia.com/networking/display/nvidia-firmware-tools-mft-documentation-v4-31-0-6012.0-6012.pdf
- NVIDIA RHEL 9.4 port type management procedure: https://docs.nvidia.com/networking/display/RHEL94/port-type-management.pdf
- NVIDIA ConnectX-6 firmware release notes, including the VPI protocol matrix: https://docs.nvidia.com/networking/display/nvidia-connectx-6-adapter-cards-firmware-release-notes-v20-43-4100-lts-2024-lts-u4.4100%20LTS%20%282024%20LTS%20U4%29.pdf
- NVIDIA ConnectX-6 InfiniBand/Ethernet adapter manual for Socket Direct and port mapping: https://docs.nvidia.com/networking/display/nvidia-connectx-6-infiniband-ethernet-adapter-cards-user-manual.pdf
- NVIDIA ConnectX-8 high-speed link-type and port-configuration documentation: https://networking-docs.nvidia.com/connectx8ocphw/setting-high-speed-port-link-type and https://networking-docs.nvidia.com/connectx8ocphw/port-configurations
- NVIDIA MLNX_OFED 24.10 LTS documentation for RoCE Ethernet link-layer behavior, GIDs, and the absence of an InfiniBand Subnet Manager/LID: https://docs.nvidia.com/networking/display/nvidia-mlnx-ofed-documentation-v24-10-2-1-8-0-lts-2024-lts-u2.pdf
- NVIDIA OpenSM documentation: https://docs.nvidia.com/networking/display/mlnxofedv590560107/opensm

## Issues Found
- The `lspci -s` example omitted the PCI domain even though the post instructs readers to use the complete BDF. An omitted domain acts as a wildcard and can be ambiguous on multi-domain systems. Changed `5e:00.0` to `0000:5e:00.0`.
- The netdev-name warning implied that predictable naming could replace `ens...`, even though `ens...` is itself a predictable Ethernet-name form and modern predictable InfiniBand names use an `ib` prefix. Reworded the warning to cover predictable and administratively assigned names without relying on misleading examples.
- Numeric `LINK_TYPE` values were described as belonging to older documentation. Current MFT and adapter documentation still supports and uses `1` for InfiniBand and `2` for Ethernet. Updated both references to state that the numeric and textual forms remain current.
- The activation guidance treated a host reboot as the universal requirement. NVIDIA's generic MFT procedure calls for a reboot, but some products, including the documented ConnectX-8 C8180P configurations, require a power cycle; supported firmware-reset flows are also product-specific. Updated the activation references throughout the post to require the exact product's documented reboot, firmware reset, or power cycle, changed post-change verification to occur after that activation step, and added the specific power-cycle documentation link.

## Review Notes
The runtime `link_layer` checks, `rdma` and `ibv_devinfo` syntax, next-boot `mlxconfig query` semantics, `show_confs` usage, `IB(1)`/`ETH(2)` values, PF/VF warning, mixed-port capability caveats, Subnet Manager diagnosis, and post-change validation criteria were verified as correct. The statement that an Ethernet-link-layer RDMA port uses RoCE is correct in the post's NVIDIA ConnectX context; it should not be generalized to all vendors because Ethernet RDMA can also use iWARP. All links originally listed in the post resolved successfully; the ConnectX-8 link redirects to NVIDIA's canonical Networking Docs site. The local environment included `ibv_devinfo`, whose `-d` and `-i` options were checked, but it had no `mlx5_0` device and did not include MFT or the other Linux hardware utilities, so hardware-dependent behavior was validated against official documentation rather than executed locally.
