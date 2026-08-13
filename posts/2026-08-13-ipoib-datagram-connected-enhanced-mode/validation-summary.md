# Validation Summary: Choose IPoIB Datagram, Connected, or Enhanced Mode by Capability

## Status
validated

## Post Type
Technical guide / Reference

## Technologies Covered
- Linux IP over InfiniBand (`ib_ipoib`)
- InfiniBand UD and RC transports
- IPoIB datagram and connected modes
- NVIDIA Enhanced IPoIB
- NVIDIA ConnectX / mlx5 adapters
- MLNX_OFED and DOCA-OFED
- InfiniBand P_Keys, broadcast groups, and MTU configuration
- Linux networking, RDMA, ethtool, MFT, tracepath, and iperf3 tools

## Sources Consulted
- Linux kernel IPoIB documentation: https://docs.kernel.org/infiniband/ipoib.html
- Linux kernel IPoIB Kconfig, including connected-mode availability and multicast/UD MTU warnings: https://github.com/torvalds/linux/blob/master/drivers/infiniband/ulp/ipoib/Kconfig
- Linux kernel IPoIB implementation, including MTU validation, mode switching, and multicast warnings: https://github.com/torvalds/linux/blob/master/drivers/infiniband/ulp/ipoib/ipoib_main.c
- Linux kernel IPoIB constants and connected-mode feature guards: https://github.com/torvalds/linux/blob/master/drivers/infiniband/ulp/ipoib/ipoib.h
- Linux kernel IPoIB P_Key-child handling: https://github.com/torvalds/linux/blob/master/drivers/infiniband/ulp/ipoib/ipoib_vlan.c
- RFC 4391, Transmission of IP over InfiniBand: https://www.rfc-editor.org/rfc/rfc4391
- RFC 4392, IP over InfiniBand Architecture: https://www.rfc-editor.org/rfc/rfc4392
- RFC 4755, IP over InfiniBand Connected Mode: https://www.rfc-editor.org/rfc/rfc4755
- NVIDIA DOCA current IPoIB documentation: https://docs.nvidia.com/doca/sdk/ip-over-infiniband/index.html
- NVIDIA MLNX_OFED 5.8 LTS documentation: https://docs.nvidia.com/nvidia-mlnx-ofed-documentation-v5-8-5-1-1-2-lts.pdf
- NVIDIA MLNX_OFED 23.07 documentation: https://docs.nvidia.com/networking/display/nvidia-mlnx-ofed-documentation-v23-07-0-5-1-2.2.pdf
- NVIDIA MLNX_OFED to DOCA-OFED transition guide: https://docs.nvidia.com/doca/sdk/nvidia-mlnx-ofed-to-doca-ofed-transition-guide.pdf
- ip-link(8), ethtool(8), and rdma-link(8) manual pages: https://man7.org/linux/man-pages/man8/ip-link.8.html, https://man7.org/linux/man-pages/man8/ethtool.8.html, https://man7.org/linux/man-pages/man8/rdma-link.8.html
- iperf3 command documentation: https://software.es.net/iperf/invoking.html

## Issues Found
- The post treated `/sys/class/net/<interface>/mode` as universally present. Upstream kernels built without `CONFIG_INFINIBAND_IPOIB_CM` omit it, and rtnetlink-created P_Key children omit the legacy `mode` and `pkey` attributes. Qualified the claims, guarded the reads, and identified `ip -d link show` as the more general inspection path.
- The connected-mode discussion did not make clear that a large interface MTU does not protect oversized multicast traffic. Upstream Linux warns that multicast packets above the smaller UD multicast MTU can be dropped. Added that caveat and changed the mode-selection and change procedure to validate RC unicast separately from UD fallback and multicast.
- The conclusion said mode and MTU should be consistent across an entire partition. RFC 4755 permits mixed UD/connected peers and per-destination MTUs. Replaced that overbroad requirement with the actual requirement to keep the partition's UD/broadcast MTU compatible and validate larger connected-mode MTUs per peer.
- Shell examples used angle-bracket placeholders as bare arguments. A shell interprets those tokens as input redirections, so the commands were not directly valid. Replaced them with quoted shell variables and explicit example assignments.
- The URL labeled as current DOCA IPoIB documentation served an older PDF. Updated it to NVIDIA's current canonical IPoIB documentation page.
- The Enhanced IPoIB device scope could be read as including Ethernet-only mlx5 variants. Qualified it as supported InfiniBand-capable ConnectX-4-and-later hardware.

## Review Notes
The core claims were verified: Linux datagram mode uses UD with an IPoIB MTU equal to the IB L2 MTU minus the 4-byte encapsulation header; upstream Linux connected mode uses RC for eligible unicast while retaining UD for multicast and non-connected peers; 65520 is the commonly implemented Linux connected-mode maximum; and upstream stateless offloads are datagram-only. NVIDIA's Enhanced IPoIB documentation confirms RSS/TSS, multiple queues, interrupt moderation, shared work queues, partition optimizations, and UD-only operation. MLNX_OFED 5.8 documents the historical `ipoib_enhanced` switch, while MLNX_OFED 23.07 documents Enhanced-IPoIB-only operation and removal of the switch back to generic ULP mode.

All listed command forms and remaining external links were checked. Hardware-dependent ethtool operations can legitimately report that a capability is unsupported, and optional NVIDIA/OFED tools may be absent; the post uses these as capability probes. No InfiniBand hardware was available in the review environment, so behavior was validated against upstream source, RFCs, and vendor documentation rather than by changing a live fabric.
