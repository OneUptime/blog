# Validation Summary: Why InfiniBand Negotiated 1X or a Lower Link Rate

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- InfiniBand link training, link width, and link speed
- NVIDIA ConnectX host channel adapters
- NVIDIA InfiniBand switches, NVOS, and MLNX-OS
- rdma-core InfiniBand diagnostic utilities
- NVIDIA Firmware Tools (`mst`, `mlxlink`, and `mlxfwmanager`)
- NVIDIA `ibdiagnet`
- Linux InfiniBand sysfs ABI
- InfiniBand cables, optical modules, breakout links, BER, FEC, and link-level retransmission

## Sources Consulted
- rdma-core `ibstat(8)` manual and current implementation: https://github.com/linux-rdma/rdma-core/blob/master/infiniband-diags/man/ibstat.8.in.rst and https://github.com/linux-rdma/rdma-core/blob/master/infiniband-diags/ibstat.c
- rdma-core `iblinkinfo(8)` manual and current implementation: https://github.com/linux-rdma/rdma-core/blob/master/infiniband-diags/man/iblinkinfo.8.in.rst and https://github.com/linux-rdma/rdma-core/blob/master/infiniband-diags/iblinkinfo.c
- rdma-core `ibportstate(8)` manual: https://github.com/linux-rdma/rdma-core/blob/master/infiniband-diags/man/ibportstate.8.in.rst
- rdma-core `perfquery(8)` manual: https://github.com/linux-rdma/rdma-core/blob/master/infiniband-diags/man/perfquery.8.in.rst
- rdma-core `ibqueryerrors(8)` manual: https://github.com/linux-rdma/rdma-core/blob/master/infiniband-diags/man/ibqueryerrors.8.in.rst
- Linux kernel stable InfiniBand sysfs ABI: https://www.kernel.org/doc/Documentation/ABI/stable/sysfs-class-infiniband
- NVIDIA NVOS InfiniBand interface commands: https://docs.nvidia.com/networking/display/nvidianvosusermanualforinfinibandswitchesv25027002/infiniband-interface-commands
- NVIDIA MFT 4.35 `mst` documentation: https://networking-docs.nvidia.com/mftswum/4350/linux
- NVIDIA MFT 4.35 `mlxlink` documentation: https://networking-docs.nvidia.com/mftswum/4350/mlxlink-utility
- NVIDIA MFT 4.35 documentation for `mlxfwmanager`: https://docs.nvidia.com/networking/display/nvidia-firmware-tools-mft-documentation-v4-35-0.pdf
- NVIDIA `ibdiagnet` 2.25 basic commands and fabric-link validation: https://networking-docs.nvidia.com/ibdiagnetutilityum/2250/basic-commands and https://networking-docs.nvidia.com/ibdiagnetutilityum/2250/fabric-links-validation
- NVIDIA DGX SuperPOD breakout-cable guidance: https://docs.nvidia.com/dgx-superpod/design-guide-cabling-data-centers/latest/breakout-cables.html
- NVIDIA ConnectX-7 firmware cable and switch compatibility guidance: https://networking-docs.nvidia.com/connectx7fwrn/28441036/validated-and-supported-cables-and-switches
- NVIDIA InfiniBand link-level retransmission guidance: https://docs.nvidia.com/networking/display/mlnxofedv23102131201lts/infiniband-fabric-utilities.pdf
- InfiniBand Trade Association architecture specification index: https://infinibandta.org/ibta-specification/

## Issues Found
- The post said that `ibstat` reports active link width. The current rdma-core implementation reports local state, physical state, and aggregate active rate, but does not print negotiated lane width separately. The wording was corrected, `iblinkinfo` was identified as the command that supplies active width and speed with the remote endpoint, and the `ibstat` documentation label was updated.
- The `mlxlink` and `ibportstate` examples used unquoted angle-bracket placeholders, which a POSIX-style shell interprets as redirection syntax. The examples now use quoted shell variables, `ibportstate` names an explicit `query` operation, and the text explains how the variable values must be selected or discovered.
- The description of `ibportstate` peer validation omitted its documented scope. It now states that peer speed/width validation applies when the queried target is a switch port and LID routing is functioning.
- The switch configuration paragraph called the NVIDIA settings `speed` and `width` while citing NVOS documentation. NVOS uses `ib-speed` and `lanes`; `speed` and `width` are MLNX-OS names. The post now distinguishes the two operating-system command families.
- The fabric-wide `ibqueryerrors` example did not select the same local HCA and port used by the other diagnostic commands. `-C mlx5_0 -P 1` was added so a multi-HCA host does not silently scan a different connected fabric.
- The counter guidance described absolute totals as being “since boot,” although InfiniBand counters can be cleared independently of a reboot. It now refers to totals without a known baseline.
- The MFT and `ibdiagnet` links referenced older manuals. Their documented options were still valid, but the links were updated to the current MFT 4.35 and `ibdiagnet` 2.25 documentation.

## Review Notes
- The upstream `ibstat(8)` description still mentions active link width, but the current implementation does not print it as a separate field; the review followed the executable implementation and the stable sysfs definition of aggregate `rate`.
- `mlxlink` output and advanced BER, FEC, and retransmission fields depend on the adapter or switch generation, firmware, access method, and MFT release.
- `ibdiagnet --lw` applies one expected width across the checked fabric. Mixed-width fabrics and intentional breakouts require topology-aware interpretation, as the post notes.
- Current NVIDIA HDR and NDR breakout examples commonly create 2X logical links. An intentional 1X result is platform- and configuration-specific, so operators must verify the exact split profile and support matrix rather than infer the cause from width alone.
