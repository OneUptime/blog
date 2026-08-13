# Validation Summary: Find Why IPoIB Is Far Below InfiniBand Line Rate

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- IP over InfiniBand (IPoIB)
- Linux InfiniBand and RDMA networking
- NVIDIA ConnectX/mlx5 and Enhanced IPoIB
- iperf3 TCP throughput testing
- linux-rdma perftest and `ib_write_bw`
- Linux network offloads, queues, interrupts, and softirqs
- PCI Express and NUMA topology
- InfiniBand performance and error counters

## Sources Consulted
- Linux kernel IPoIB documentation (https://docs.kernel.org/infiniband/ipoib.html)
- Linux kernel stable InfiniBand sysfs ABI (https://www.kernel.org/doc/Documentation/ABI/stable/sysfs-class-infiniband)
- Linux kernel PCI NUMA-node sysfs ABI (https://docs.kernel.org/admin-guide/abi-testing.html)
- RFC 4391: Transmission of IP over InfiniBand (https://www.rfc-editor.org/rfc/rfc4391.html)
- RFC 4392: IP over InfiniBand Architecture (https://www.rfc-editor.org/rfc/rfc4392.html)
- RFC 4755: IP over InfiniBand Connected Mode (https://www.rfc-editor.org/rfc/rfc4755.html)
- NVIDIA DOCA IP over InfiniBand documentation (https://docs.nvidia.com/doca/sdk/ip-over-infiniband.pdf)
- NVIDIA DOCA MLX Drivers documentation (https://docs.nvidia.com/doca/sdk/mlx-drivers.pdf)
- NVIDIA MLNX_OFED 23.07 changes and new features (https://docs.nvidia.com/networking/display/mlnxofedv23070500/changes+and+new+features)
- NVIDIA MLNX_OFED-to-DOCA-OFED transition guide (https://docs.nvidia.com/doca/sdk/nvidia-mlnx-ofed-to-doca-ofed-transition-guide.pdf)
- ESnet iperf3 invocation reference (https://software.es.net/iperf/invoking.html)
- linux-rdma perftest documentation (https://github.com/linux-rdma/perftest)
- rdma-core `ibv_devinfo` manual (https://man7.org/linux/man-pages/man1/ibv_devinfo.1.html)
- rdma-core `ibqueryerrors` manual (https://github.com/linux-rdma/rdma-core/blob/master/infiniband-diags/man/ibqueryerrors.8.in.rst)
- iproute2 `ip-route` manual (https://man7.org/linux/man-pages/man8/ip-route.8.html)
- ethtool manual (https://man7.org/linux/man-pages/man8/ethtool.8.html)
- util-linux `lscpu` source and manual (https://github.com/util-linux/util-linux/blob/master/sys-utils/lscpu.c, https://man7.org/linux/man-pages/man1/lscpu.1.html)

## Issues Found
- The original route check did not specify the same source address later bound by iperf3, and the prose overstated what `iperf3 -B` guarantees. `-B` binds a local address rather than a Linux netdev, so it cannot by itself prevent a route change from selecting another egress interface. The route query now includes `from <local-ipoib-address>`, and the baseline instructions now require numeric addresses plus source-aware route confirmation before each test.
- The post required verification of active link width, but the command set did not reliably display it: current `ibstat` reports aggregate rate while `rdma link show` does not report active width. Added `ibv_devinfo -v -d <rdma-device> -i <port>`, which exposes the selected port's active width and speed.
- The `mode` sysfs file is absent when connected-mode support is not built or exposed by the installed stack. Added a caveat so a missing file is interpreted as a capability result rather than an unexplained command failure.
- The MLNX_OFED statement was too vague and did not account for maintained older LTS branches. It now identifies MLNX_OFED 23.07 as the start of Enhanced-IPoIB-only releases and notes that older LTS branches can differ.
- The CPU command listed only `MINMHZ` and `MAXMHZ`, which are frequency bounds, while the prose said to observe current frequency. Added the `MHZ` column for the current per-CPU value.
- The counter section requested deltas but showed only snapshot reads, and its prose referred to BER without reading a BER counter. It now tells readers to take before/after snapshots and refers specifically to the sampled symbol and link-recovery errors.
- The version-pinned NVIDIA fabric-utilities link was updated from MLNX_OFED 23.10 to the last standalone MLNX_OFED 24.10 LTS documentation.

## Review Notes
- The iperf3 flags shown (`-s`, `-c`, `-B`, `-t`, `-O`, `-P`, and `-R`) remain current and match ESnet's documentation. On Linux, `--bind-dev ib0` can provide explicit device binding when supported and permitted, but the source-aware route check remains necessary for diagnosing the actual path.
- The IPoIB MTU explanation is correct: datagram mode subtracts the four-byte encapsulation header from the InfiniBand L2 MTU, while connected mode can negotiate a much larger unicast MTU where supported. Broadcast and multicast still use UD.
- NVIDIA Enhanced IPoIB is correctly described as UD-only and as providing RSS/TSS, multiple queues, interrupt moderation, and partition optimizations on supported hardware. NVIDIA now packages new driver-stack feature releases as DOCA-OFED; the last standalone MLNX_OFED release is under LTS.
- `ibqueryerrors --report-port --details` is valid, but it reports absolute fabric counters subject to configured thresholds. The local sysfs and fabric snapshots should be captured around the same test interval when comparing deltas.
- The perftest server/client roles and `-d`/`-i` selections are correct. `ib_write_bw` is appropriately used only as a verbs-path control and not as a measurement of TCP or IPoIB.
