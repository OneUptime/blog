# Validation Summary: How to use eBPF XDP for DDoS protection at network edge

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- eBPF
- XDP
- Linux networking
- libbpf/BPF maps
- iproute2
- bpftool
- Kubernetes DaemonSet
- Prometheus Python client
- hping3

## Sources Consulted
- Linux kernel BPF maps documentation: https://www.kernel.org/doc/html/latest/bpf/maps.html
- eBPF docs for XDP program type and XDP return actions: https://docs.ebpf.io/linux/program-type/BPF_PROG_TYPE_XDP/
- eBPF docs for `BPF_MAP_TYPE_LPM_TRIE`: https://docs.ebpf.io/linux/map-type/BPF_MAP_TYPE_LPM_TRIE/
- Linux `bpf-helpers(7)` manual: https://man7.org/linux/man-pages/man7/bpf-helpers.7.html
- BCC Python reference guide for `BPF(src_file=...)` and `attach_xdp`: https://github.com/iovisor/bcc/blob/master/docs/reference_guide.md
- Kubernetes DaemonSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
- Kubernetes ConfigMap API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/config-map-v1/

## Issues Found
- The SYN parser assumed a fixed 20-byte IPv4 header. Updated it to honor `iph->ihl`, reject invalid IPv4 header lengths, and skip fragmented packets that may not contain the TCP header.
- The packet size filter compared XDP packet length directly to 1500 bytes and 64 bytes. XDP packet length includes the Ethernet header and excludes the FCS, so the thresholds were corrected to 1514 bytes for a standard 1500-byte MTU Ethernet frame and 60 bytes for the minimum Ethernet frame without FCS.
- The CIDR blacklist example was incomplete and referenced an undefined `check_blacklist` callback. Replaced it with a `BPF_MAP_TYPE_LPM_TRIE` map using `BPF_F_NO_PREALLOC`, and updated the XDP lookup code to perform longest-prefix matching.
- The user-space blacklist management code stored network/mask pairs in a hash map, which did not match CIDR longest-prefix lookup semantics. Updated it to write LPM trie keys containing `prefixlen` and the IPv4 address in network byte order.
- The UDP drop counter used an atomic increment on a per-CPU array value. Changed it to increment the current CPU's per-CPU value directly.
- The Prometheus exporter loaded a BCC object but did not attach the XDP program or export any real map values. Replaced it with a small exporter that reads the existing `drop_stats` map through `bpftool` and publishes the observed drop total.

## Review Notes
- The Kubernetes DaemonSet snippet is structurally valid, but in production the compiled XDP object should usually be shipped in an image or a binary ConfigMap (`binaryData`) rather than built or mounted ad hoc at pod start.
- The rate limiting examples are intentionally simple and do not address distributed attacks that rotate source IPs, NAT-heavy clients, IPv6, VLAN tags, or multi-program XDP chaining.
