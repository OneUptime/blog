# Validation Summary: Tuning WireGuard Request/Response Performance in Cilium

## Status
validated

## Post Type
Technical performance tuning guide

## Technologies Covered
- Cilium
- Kubernetes
- WireGuard
- Linux networking sysctls
- ethtool
- netperf TCP_RR
- Helm

## Sources Consulted
- Cilium WireGuard Transparent Encryption documentation: https://docs.cilium.io/en/stable/security/network/encryption-wireguard/
- Cilium CLI command reference for `cilium encryption status`: https://docs.cilium.io/en/latest/cmdref/cilium_encryption_status/
- Cilium Helm reference: https://docs.cilium.io/en/latest/helm-reference/
- Cilium kube-proxy replacement and socket load balancing documentation: https://docs.cilium.io/en/stable/network/kubernetes/kubeproxy-free/
- Linux kernel sysctl networking documentation for busy polling: https://docs.kernel.org/admin-guide/sysctl/net.html
- ethtool command help output from ethtool 6.7
- Netperf request/response training documentation: https://hewlettpackard.github.io/netperf/training/Netperf.html
- Netperf 2.7.x manual, TCP_RR section: https://hewlettpackard.github.io/netperf/doc/netperf.html
- WireGuard Linux Kernel Integration Techniques paper: https://www.wireguard.com/papers/wireguard-netdev22.pdf

## Issues Found
- The introduction implied every packet is encrypted. Cilium documents that same-node traffic is not encrypted by WireGuard, so the wording was changed to "encrypted cross-node packet" and "cross-node request and response."
- The post stated a typical 10-30% TCP_RR reduction and concluded that overhead can be kept below 20%. These fixed thresholds are workload and hardware dependent, so both claims were replaced with guidance to validate against the reader's own baseline.
- The socket-level BPF section implied all datapath length is reduced. It was clarified that this applies to the service load-balancing datapath.
- The WireGuard queue section suggested setting RX/TX ring sizes on `cilium_wg0` with `ethtool -G`. WireGuard is a virtual interface and commonly does not expose ethtool ring settings, so the command was replaced with inspection guidance and a note to tune the physical NIC if needed.
- The verification command used `cilium encrypt status`. The current Cilium CLI command is `cilium encryption status`, so it was corrected.
- The troubleshooting section referred to WireGuard key rotation as the cause of latency spikes. This was changed to node or endpoint changes, which better matches Cilium's documented WireGuard peer and allowed-IP update behavior.
- The systematic tuning baseline used `iperf3` throughput even though the article is about TCP_RR latency. It was changed to a repeated `netperf TCP_RR` benchmark that reports transactions per second.
- The final configuration example recorded throughput in Gbps. It now records final TCP_RR transaction rate.

## Review Notes
The low-latency host tuning commands are plausible but highly hardware and driver dependent. Busy polling can increase power usage, and interrupt coalescing or ring-size tuning should be tested carefully on the specific NIC and workload before being made persistent.
