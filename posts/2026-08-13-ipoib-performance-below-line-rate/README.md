# Find Why IPoIB Is Far Below InfiniBand Line Rate

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPoIB, InfiniBand, Network Performance, iperf3, RDMA, NUMA

Description: Diagnose low IPoIB throughput by verifying the routed interface, link width, transport mode, MTU, queues, CPU/NUMA placement, counters, and a raw-verbs control test.

---

IP over InfiniBand does not promise that one TCP stream will equal the InfiniBand link's signaling rate. IPoIB passes IP traffic through a Linux netdev and the TCP/IP stack, while native verbs benchmarks exercise a different path. Protocol overhead, message size, transport mode, MTU, offloads, queue parallelism, CPU frequency, interrupts, NUMA, and PCIe can all limit the measured rate.

The goal is not to apply every tuning knob. It is to locate the first constrained layer with reproducible tests. Start by proving which route and physical link the traffic uses, then separate IPoIB-specific limits from HCA/PCIe limits with a native RDMA control.

## Prove the Test Uses the Intended IPoIB Path

On both endpoints, record the route, interface, RDMA mapping, and link state:

~~~console
$ ip route get <peer-ipoib-address> from <local-ipoib-address>
$ ip -d link show ib0
$ ip -s link show ib0
$ cat /sys/class/net/ib0/mode
$ cat /sys/class/net/ib0/pkey
$ readlink -f /sys/class/net/ib0/device
$ ibstat
$ rdma link show
$ ibv_devinfo -v -d <rdma-device> -i <port>
~~~

`ip route get` exposes the selected device and source address. A management-Ethernet route can make a successful test irrelevant. IPoIB child interfaces represent P_Key partitions; confirm that both endpoints use the intended child or parent and that the Subnet Manager installed compatible membership.

Require `State: Active`, `Physical state: LinkUp`, and the expected active width/rate before discussing IP tuning. If the link trained at 1X or a lower generation, IPoIB cannot recover the missing physical capacity.

## Build a Reproducible TCP Baseline

Use numeric IPoIB addresses, bind each endpoint to its IPoIB address, and confirm that the bound source follows the intended route before each test:

~~~console
# Server
$ iperf3 -s -B <server-ipoib-address>

# Client: one stream
$ iperf3 -c <server-ipoib-address> -B <client-ipoib-address> -t 30 -O 3

# Client: parallel streams
$ iperf3 -c <server-ipoib-address> -B <client-ipoib-address> -t 30 -O 3 -P 4

# Reverse direction
$ iperf3 -c <server-ipoib-address> -B <client-ipoib-address> -t 30 -O 3 -R
~~~

Use the same recent iperf3 version, record CPU utilization, and repeat each case. The examples are a diagnostic matrix, not a claim that four streams are optimal. Interpret the shape:

- one stream low, parallel streams higher: a single flow/CPU/queue limitation is likely;
- one direction low: inspect the receiving CPU/queue and that direction's physical counters;
- all IP tests low but verbs fast: focus on IPoIB mode, MTU, offloads, queues, and TCP/CPU;
- both IP and verbs low: move down to link, PCIe, NUMA, memory, or driver/firmware.

Do not increase socket buffers before checking for loss, retransmissions, and CPU saturation. Tuning buffers can hide a test-method problem and consumes memory without repairing a slow data path.

## Verify Mode and MTU as a Pair

The upstream Linux IPoIB driver defines datagram and connected modes. In datagram mode, the IPoIB MTU is the InfiniBand L2 MTU minus the four-byte IPoIB encapsulation header: a 2 KiB fabric MTU yields 2044. Connected mode can use an MTU up to the maximum IP packet size, but only where the driver, HCA, and peers support it.

~~~console
$ cat /sys/class/net/ib0/mode
$ ip link show ib0
$ tracepath -n <peer-ipoib-address>
~~~

If the `mode` file is absent, connected-mode support is not built or exposed by that driver stack.

Compare the effective MTU on both peers, every relevant child interface, and the partition/broadcast group configured by the SM. A locally configured jumbo value does not make the end-to-end path support it. MTU mismatch can produce fragmentation, PMTU behavior, drops, or a test that fails instead of becoming faster.

Do not blindly switch a modern mlx5 deployment to connected mode. NVIDIA Enhanced IPoIB is a vendor-optimized, UD/datagram-only path with multiple queues and RSS/TSS. Starting with MLNX_OFED 23.07, that release series and later releases support Enhanced IPoIB only; older LTS release branches may differ. The generic Linux connected-mode capability and the currently installed NVIDIA stack are not interchangeable promises.

## Check Enhanced Mode, Offloads, and Queues

Query what the running netdev actually exposes:

~~~console
$ ethtool -i ib0
$ ethtool -k ib0
$ ethtool -l ib0
$ ethtool -S ib0
$ ls -d /sys/class/net/ib0/queues/*
~~~

Unsupported `ethtool` operations are evidence of driver capability, not a reason to invent settings. The Linux IPoIB documentation says stateless checksum/large-send offloads are hardware-dependent and supported in datagram mode. NVIDIA Enhanced IPoIB adds vendor-specific multi-queue, RSS/TSS, interrupt moderation, and partition optimizations on capable mlx5 devices.

Confirm that expected offloads are present and that multiple traffic streams distribute rather than pinning one receive queue. Do not toggle GRO/LRO, checksum, TSO/LSO, channel counts, or coalescing all at once. Capture a baseline, change one supported setting, and compare throughput, latency, CPU, and drops.

## Find CPU and Interrupt Saturation

While the test runs, observe per-CPU use, frequency, softirqs, and HCA interrupts:

~~~console
$ mpstat -P ALL 1
$ grep -iE 'mlx5|ib0' /proc/interrupts
$ cat /proc/softirqs
$ lscpu -e=CPU,NODE,SOCKET,CORE,ONLINE,MHZ,MAXMHZ,MINMHZ
~~~

One saturated core with idle peers explains why parallel flows help. Check whether receive queues and application threads are on the HCA-local NUMA node. Container CPU sets and IRQ affinity can silently force work onto remote or overloaded cores.

Do not stop `irqbalance` or apply a vendor affinity script as a universal fix. Either can be correct for a validated platform and wrong for another. First capture the current mapping; then use the operating system or NVIDIA tuning procedure supported by that stack and preserve housekeeping capacity.

## Check PCIe and NUMA Below the Netdev

Map the HCA to PCIe and its NUMA node:

~~~console
$ readlink -f /sys/class/infiniband/mlx5_0/device
$ cat /sys/class/infiniband/mlx5_0/device/numa_node
$ lspci -vv -s 5e:00.0 | grep -E 'LnkCap|LnkSta'
$ numactl --hardware
~~~

Use the real BDF. Compare `LnkSta` width and speed with the adapter/platform requirement; a card in a narrow or downgraded slot can limit every transport. A NUMA node of `-1` means the kernel has no specific association, not node zero. Test CPU and memory placement explicitly before drawing conclusions.

## Separate Physical Errors from Congestion

Take synchronized counter snapshots before and after the test, then compare the deltas:

~~~console
$ grep -H . /sys/class/infiniband/mlx5_0/ports/1/counters/{symbol_error,link_error_recovery,link_downed,port_rcv_errors,port_xmit_discards,port_xmit_wait}
$ ip -s link show ib0
$ ibqueryerrors --report-port --details
~~~

Growing symbol or link-recovery errors implicate the physical path. `port_xmit_wait` points toward credit/arbitration pressure; transmit discards can reflect congestion or time spent down. TCP retransmissions and netdev drops explain low goodput even when raw link rate is high.

## Run a Native Verbs Control, Not a Replacement Test

Use the same perftest build on both endpoints and explicitly select device and port. For example, run `ib_write_bw` as server on one host and client on the other with matching `-d mlx5_0 -i 1` selection. Read the installed command's help because perftest options and units vary by release.

`ib_write_bw` measures an RDMA verbs path; it does not measure IPoIB or TCP. That is precisely why it is useful as a control. A fast verbs result proves much of the HCA/link/PCIe path can perform while a slow IPoIB result narrows the problem upward. It does not establish that one TCP stream should equal the verbs number.

After locating the layer, change the smallest supported control and rerun the same matrix. Preserve latency and CPU measurements; throughput gained by unacceptable CPU consumption may not improve the workload.

## Official Documentation

- [Linux kernel: IPoIB modes, MTU, offloads, and interrupt moderation](https://docs.kernel.org/infiniband/ipoib.html)
- [NVIDIA DOCA: current IPoIB and Enhanced IPoIB capabilities](https://docs.nvidia.com/doca/sdk/ip-over-infiniband.pdf)
- [NVIDIA DOCA: MLX drivers, IPoIB offloads, and operating constraints](https://docs.nvidia.com/doca/sdk/mlx-drivers.pdf)
- [NVIDIA: MLNX_OFED 23.07 changes and Enhanced-IPoIB-only support](https://docs.nvidia.com/networking/display/mlnxofedv23070500/changes+and+new+features)
- [linux-rdma: official perftest repository and methodology](https://github.com/linux-rdma/perftest)
- [ESnet: official iperf3 invocation reference](https://software.es.net/iperf/invoking.html)
- [Linux kernel: stable InfiniBand rate and counter ABI](https://www.kernel.org/doc/Documentation/ABI/stable/sysfs-class-infiniband)
- [NVIDIA: InfiniBand fabric diagnostic utilities](https://docs.nvidia.com/networking/display/mlnxofedv24104140lts/infiniband-fabric-utilities)

## Conclusion

Measure IPoIB as an IP netdev path, not as a synonym for raw InfiniBand line rate. Prove the route and active link, benchmark bound addresses in both directions and with controlled stream counts, then verify mode/MTU, enhanced support, offloads, queues, CPU/IRQ placement, PCIe, NUMA, and counter deltas. A native verbs test is the decisive control: if it is fast, optimize above the HCA; if it is also slow, investigate the shared hardware path.
