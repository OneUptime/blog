# Choose IPoIB Datagram, Connected, or Enhanced Mode by Capability

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPoIB, InfiniBand, Datagram Mode, Connected Mode, Enhanced IPoIB, ConnectX

Description: Distinguish IPoIB datagram and connected transports from NVIDIA Enhanced IPoIB, then select a supported mode and MTU for the driver, HCA, peers, and workload.

---

IPoIB “datagram,” “connected,” and “enhanced” are not three equivalent choices. Datagram and connected are transport modes of the generic Linux IPoIB implementation; connected is available only when the kernel and device support it. NVIDIA Enhanced IPoIB is an optimized vendor data path for datagram/UD operation. It does not add a third value to `/sys/class/net/<interface>/mode` when that attribute is exposed, and it does not support connected mode.

That distinction prevents two common mistakes: forcing `connected` on an mlx5 stack that supports only Enhanced IPoIB, or disabling enhanced multi-queue/offload behavior to chase a larger MTU without measuring the real workload.

## Compare the Modes Precisely

| Property | Datagram | Connected | NVIDIA Enhanced IPoIB |
| --- | --- | --- | --- |
| InfiniBand transport | UD | RC for eligible unicast; UD remains for multicast/fallback | UD only |
| Linux `mode` value | `datagram` | `connected` | `datagram` when exposed, never `enhanced` |
| IPoIB MTU | IB L2 MTU minus 4 bytes | up to maximum IP packet size where supported | datagram MTU |
| multicast/broadcast | supported through UD | still uses UD | supported through UD |
| stateless offloads | hardware/driver dependent | upstream documentation says stateless offloads are datagram-only | RSS/TSS, multi-queue, interrupt moderation, and vendor optimizations on capable devices |
| availability | baseline Linux IPoIB | driver/HCA/peer dependent | NVIDIA mlx5-capable device and stack dependent |

For example, a fabric with a 2048-byte InfiniBand L2 MTU yields a 2044-byte IPoIB datagram MTU. A 4096-byte L2 MTU can yield 4092. Do not infer the actual setting from those examples; the SM's partition/broadcast configuration and every endpoint must agree.

Connected mode allows an IPoIB interface MTU up to 65520 in commonly documented Linux/NVIDIA configurations. That larger number is valid only when the involved unicast peers and interfaces really operate in connected mode. Multicast remains on UD and therefore retains the smaller path constraint. On upstream Linux, multicast packets larger than the UD MTU can be dropped even when the connected-mode interface MTU is larger.

## Identify the Running Stack and Device

Inspect the interface, driver, RDMA port, and package lineage before selecting anything:

~~~console
$ ip -d link show ib0
$ if test -r /sys/class/net/ib0/mode; then cat /sys/class/net/ib0/mode; fi
$ if test -r /sys/class/net/ib0/pkey; then cat /sys/class/net/ib0/pkey; fi
$ ethtool -i ib0
$ rdma link show
$ ibv_devinfo -v
$ command -v ofed_info >/dev/null && ofed_info -s
~~~

The legacy sysfs attributes are not universal. A kernel built without connected-mode support can omit `mode`, and rtnetlink-created P_Key children can omit `mode` and `pkey`; `ip -d link show` remains the more general view.

Also map the device to PCI and its exact adapter identity:

~~~console
$ readlink -f /sys/class/net/ib0/device
$ lspci -nnk -s 5e:00.0
$ sudo mlxfwmanager --query
~~~

Use the real BDF. The words `mlx5` and `ConnectX` are not sufficient capability checks. Exact SKU, firmware, kernel driver, distribution or DOCA/MLNX release, and whether the interface is a PF, VF, or P_Key child can affect available behavior.

## Understand Generic Datagram Mode

Linux datagram mode sends IPoIB traffic over InfiniBand Unreliable Datagram transport. It naturally supports unicast, multicast, and broadcast without maintaining an RC connection to every peer. The smaller MTU means more IP packets for a large transfer, but modern offloads and parallel queues can offset CPU costs on capable devices.

The Linux kernel documentation makes an important point: IPoIB checksum/large-send and receive-offload capabilities are hardware dependent, and stateless offloads are supported only in datagram mode. Query the running interface instead of assuming:

~~~console
$ ethtool -k ib0
$ ethtool -l ib0
$ ethtool -S ib0
$ ls -d /sys/class/net/ib0/queues/*
~~~

Datagram is generally the interoperability baseline and is the only choice for NVIDIA Enhanced IPoIB. It is not synonymous with “slow.” A capable enhanced mlx5 path may outperform an older connected-mode implementation despite its smaller MTU because it can distribute work and offload more effectively.

## Understand Generic Connected Mode

Connected mode uses InfiniBand Reliable Connected transport for eligible unicast peers. Its larger MTU reduces the number of IP packets needed for large TCP segments or UDP datagrams. The interface still keeps a UD QP for multicast and for peers that do not support connected mode; the Linux driver handles the smaller path requirement for those neighbors.

Connected transport also creates per-peer connection state and has driver/HCA resource implications. Test peer count, connection churn, failover, multicast, and memory—not only two-host bulk throughput. NVIDIA documentation exposes connected-mode queue-pair limits for implementations without a shared receive queue, illustrating why capability and scale matter.

Do not assume that the generic kernel feature means a particular HCA driver implements it. A write of `connected` may be rejected, or a vendor distribution may intentionally ship only its enhanced UD path.

## Understand NVIDIA Enhanced IPoIB

NVIDIA documents Enhanced IPoIB as offloading the generic ULP's basic data path into a lower vendor-specific driver. On supported InfiniBand-capable ConnectX-4-and-later mlx5 deployments, documented benefits include RSS/TSS, multiple queues, interrupt moderation, shared work queues, partition optimizations, and other vendor optimizations. The documented transport restriction is unambiguous: UD mode only.

Stack history matters. Older MLNX_OFED documentation described an `ipoib_enhanced` module parameter that switched between enhanced and generic ULP behavior. NVIDIA's MLNX_OFED 23.07 change notes say that release supports Enhanced IPoIB only and no longer supports switching back with that parameter. DOCA-OFED succeeds MLNX_OFED for new vendor features, so verify the exact DOCA release rather than following an old blog that writes `ipoib_enhanced=0`.

If the parameter exists, query it read-only as one piece of evidence:

~~~console
$ test -r /sys/module/ib_ipoib/parameters/ipoib_enhanced && \
    cat /sys/module/ib_ipoib/parameters/ipoib_enhanced
~~~

NVIDIA also documents a link-address prefix convention for detecting enhanced operation in specific upstream/OFED versions. Treat it as version-specific, not a protocol standard. Driver/package provenance and the current release documentation are stronger evidence.

## Select by a Capability Gate, Then by Workload

Use this order:

1. **Is the port native InfiniBand and Active?** IPoIB does not operate over an Ethernet/RoCE link layer.
2. **What does the installed driver support?** If current NVIDIA mlx5 documentation says enhanced UD only, connected is not a candidate.
3. **Can the partition carry the required UD/broadcast MTU, and can connected peers use the intended larger MTU?** A mixed cluster must retain a common UD working path.
4. **What traffic dominates?** Bulk unicast may benefit from larger MTU on a supported legacy/generic connected implementation; multicast and broad peer sets remain UD concerns.
5. **Which mode wins on the real workload?** Compare throughput, tail latency, CPU, memory, drops, peer scale, and recovery.

For current capable mlx5 vendor deployments, Enhanced IPoIB datagram is normally the path to validate first. For an inbox or legacy HCA/driver that genuinely supports connected mode, benchmark both on a staging fabric before standardizing.

## Change Mode and MTU Safely

When the installed stack exposes it, the `mode` sysfs file selects the generic interface transport. Builds without connected-mode support and some rtnetlink-created P_Key children can omit the attribute. NVIDIA documentation requires the interface to be down when changing between UD and connected. During a maintenance window, a generic supported change has this shape:

~~~console
$ sudo ip link set ib0 down
$ echo datagram | sudo tee /sys/class/net/ib0/mode
$ VALIDATED_DATAGRAM_MTU=4092  # Example for a validated 4096-byte IB MTU
$ sudo ip link set ib0 mtu "$VALIDATED_DATAGRAM_MTU"
$ sudo ip link set ib0 up
~~~

For a connected-capable stack, replace `datagram` with `connected` and use a larger MTU only after validating the required RC unicast peers and the smaller UD fallback and multicast paths. If the mode write is rejected, stop; do not work around the driver. That is capability evidence.

Sysfs writes are not a persistence strategy. Apply the selected mode and MTU through the distribution's supported network manager/configuration system, including P_Key child interfaces. Coordinate the SM's IPoIB broadcast-group MTU. Roll the change through a mixed cluster only with an interoperability plan.

Afterward, verify rather than trusting configuration:

~~~console
$ if test -r /sys/class/net/ib0/mode; then cat /sys/class/net/ib0/mode; fi
$ ip -d link show ib0
$ PEER_IPOIB_ADDRESS=192.0.2.2    # Replace with the peer's IPoIB address
$ LOCAL_IPOIB_ADDRESS=192.0.2.1   # Replace with the local IPoIB address
$ tracepath -n "$PEER_IPOIB_ADDRESS"
$ iperf3 -c "$PEER_IPOIB_ADDRESS" -B "$LOCAL_IPOIB_ADDRESS" -t 30
~~~

Test unicast both ways, multicast-dependent functions, multiple peers, and application reconnect. Watch netdev, IB error, recovery, and congestion counters.

## Official Documentation

- [Linux kernel: IPoIB datagram/connected modes, MTU, and offloads](https://docs.kernel.org/infiniband/ipoib.html)
- [IETF RFC 4391: Transmission of IP over InfiniBand](https://www.rfc-editor.org/rfc/rfc4391)
- [IETF RFC 4392: IP over InfiniBand Architecture](https://www.rfc-editor.org/rfc/rfc4392)
- [IETF RFC 4755: IPoIB Connected Mode](https://www.rfc-editor.org/rfc/rfc4755)
- [NVIDIA DOCA: current IPoIB and Enhanced IPoIB capabilities](https://docs.nvidia.com/doca/sdk/ip-over-infiniband/index.html)
- [NVIDIA MLNX_OFED 5.8 LTS: connected, datagram, and Enhanced IPoIB behavior](https://docs.nvidia.com/nvidia-mlnx-ofed-documentation-v5-8-5-1-1-2-lts.pdf)
- [NVIDIA MLNX_OFED 23.07: Enhanced-IPoIB-only change](https://docs.nvidia.com/networking/display/nvidia-mlnx-ofed-documentation-v23-07-0-5-1-2.2.pdf)

## Conclusion

Datagram and connected are IPoIB transport modes; Enhanced IPoIB is NVIDIA's optimized datagram implementation. Start with the installed driver and HCA capability, not a desired MTU. Current capable mlx5 vendor stacks favor enhanced UD with multi-queue and offloads, while connected mode remains relevant only where the exact generic or legacy stack supports it and peer scale is acceptable. Keep the partition's UD/broadcast MTU compatible across members, validate connected-mode MTUs per peer, persist them through supported OS configuration, and prove the result with workload and recovery tests.
