# Validation Summary: Diagnose InfiniBand Down/Polling Without Guessing at the Cable

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- InfiniBand link states and link training
- Linux RDMA and rdma-core diagnostics
- NVIDIA ConnectX adapters and the `mlx5` driver stack
- NVIDIA VPI Ethernet/InfiniBand link modes
- NVIDIA Firmware Tools (`mst`, `mlxconfig`, `mlxlink`, and `mlxfwmanager`)
- OpenSM and InfiniBand Subnet Manager behavior
- InfiniBand cables, optical modules, breakout ports, speed, and width
- Adapter firmware, PSIDs, and OEM firmware compatibility

## Sources Consulted
- rdma-core `ibstat(8)` manual (https://github.com/linux-rdma/rdma-core/blob/master/infiniband-diags/man/ibstat.8.in.rst)
- rdma-core `ibstat` implementation and exact state-name mappings (https://github.com/linux-rdma/rdma-core/blob/master/infiniband-diags/ibstat.c)
- rdma-core `ibportstate(8)` manual (https://github.com/linux-rdma/rdma-core/blob/master/infiniband-diags/man/ibportstate.8.in.rst)
- iproute2 `rdma-dev(8)` and `rdma-link(8)` manuals (https://github.com/iproute2/iproute2/blob/main/man/man8/rdma-dev.8, https://github.com/iproute2/iproute2/blob/main/man/man8/rdma-link.8)
- Linux kernel stable InfiniBand sysfs ABI (https://www.kernel.org/doc/Documentation/ABI/stable/sysfs-class-infiniband)
- Linux kernel `mlx5` driver documentation (https://docs.kernel.org/next/networking/device_drivers/ethernet/mellanox/mlx5.html)
- NVIDIA MLNX_OFED `mlx5_core` and `mlx5_ib` architecture documentation (https://docs.nvidia.com/networking/display/mlnxofedv585112lts/introduction)
- NVIDIA NVOS InfiniBand interface state, speed, width, and counter documentation (https://docs.nvidia.com/networking/display/nvidianvosusermanualforinfinibandswitchesv25027002/infiniband-interface-commands)
- NVIDIA InfiniBand troubleshooting guidance for the `Initializing` state and LID assignment (https://networking-docs.nvidia.com/mlnxofedswum/23105140lts/infiniband-related-issues)
- NVIDIA MFT 4.36 Linux `mst` documentation (https://networking-docs.nvidia.com/mftswum/4.36.0/linux)
- NVIDIA MFT 4.36 `mlxlink` documentation (https://networking-docs.nvidia.com/mftswum/4.36.0/mlxlink-utility)
- NVIDIA MFT 4.36 `mlxconfig` VPI documentation (https://networking-docs.nvidia.com/mftswum/4.36.0/using-mlxconfig)
- NVIDIA MFT 4.36 `mlxfwmanager` documentation (https://networking-docs.nvidia.com/mftswum/4.36.0/mlxfwmanager-firmware-update-and-query-tool)
- NVIDIA MFT PSID documentation (https://networking-docs.nvidia.com/mftswum/4.36.0/assigning-psid)
- NVIDIA MFT 4.36 known issues (https://networking-docs.nvidia.com/mftswum/4.36.0/mft-known-issues)
- PCI Utilities `lspci(8)`, kmod `lsmod(8)`/`modinfo(8)`, and util-linux `dmesg(1)` manuals (https://man7.org/linux/man-pages/man8/lspci.8.html, https://man7.org/linux/man-pages/man8/lsmod.8.html, https://man7.org/linux/man-pages/man8/modinfo.8.html, https://man7.org/linux/man-pages/man1/dmesg.1.html)

## Issues Found
- The kernel-log command omitted elevated privileges even though Linux commonly restricts access to the kernel ring buffer. Changed it to `sudo dmesg -T ...` so the diagnostic works on systems with `dmesg_restrict` enabled.
- The `/dev/mst/...` examples did not first ensure that the MFT MST driver and device nodes exist. Added `mst start` when MST is not already running, before `mst status -v` and the `mlxlink` commands.
- The `mlxlink` warning referred broadly to FEC and transmitter commands, even though `--show_fec` and `--show_serdes_tx` are read-only queries. Replaced the broad categories with the exact modifying/test options: `--port_state`, `--speeds`, `--fec`, `--test_mode`/PRBS, and `--serdes_tx`.
- The `ibportstate` description overstated peer-relative validation for HCA ports. Clarified that it can query an InfiniBand port, but its speed/width validation against the peer runs only when the queried port is a switch port and requires functioning LID routing.
- The post used `Init`, while current `ibstat` prints `Initializing`. Updated the state label and made the Subnet Manager boundary conditional on the precise `Initializing/LinkUp` combination rather than on `LinkUp` alone.
- The PSID was described as identifying a board-specific image, which could imply one exact firmware binary or version. Clarified that it identifies the board-specific firmware configuration used to select a matching image.
- The media wording could imply that every optical cable contains electronics. Clarified that active copper cables, active optical cables, and optical modules contain electronics.
- Replaced the older MFT 4.26, 4.30, and 4.31 documentation references with current MFT 4.36 pages and added the official `mst` service reference.

## Review Notes
- `lsmod` reports loadable modules that are currently loaded; a driver compiled into the kernel will not appear there. The post appropriately combines this check with PCI, sysfs, `modinfo`, and kernel-log evidence, so an empty `lsmod` match should not be treated alone as proof that driver support is absent.
- NVIDIA MFT 4.36 lists a known `mlxlink --show_module` issue in which current RX/TX optical-power values can be repeated across all lanes. NVIDIA documents a PDDR-register query with `mlxreg` as the workaround when accurate per-lane power is required.
- MFT query fields and supported operations remain device- and firmware-dependent. The post correctly warns readers not to assume that every ConnectX SKU is VPI or exposes every MFT setting.
