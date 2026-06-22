# Validation Summary: How to Monitor IPv6 Network Traffic in Kubernetes with eBPF

## Status
validated

## Post Type
Tutorial / Implementation Guide

## Technologies Covered
- eBPF (XDP, TC, kprobes, ring buffers, perf event arrays, BPF maps)
- IPv6 (addressing, NDP/ICMPv6, extension headers)
- Kubernetes (DaemonSet, RBAC, dual-stack networking, CNI)
- Cilium / Hubble (eBPF-based observability)
- Go (cilium/ebpf library userspace loader, Prometheus client)
- Prometheus & Grafana (metrics export, dashboards, alerting rules)
- C (libbpf-style eBPF programs)

## Sources Consulted
- Cilium Hubble CLI documentation and reference (`hubble observe` flags) — https://docs.cilium.io/en/stable/observability/hubble/
- cilium/hubble GitHub repository — https://github.com/cilium/hubble
- Cilium configuration / Helm values (ipv6.enabled, hubble.metrics, listen/metrics ports) — https://docs.cilium.io/en/stable/
- cilium/ebpf Go library (link.AttachXDP, XDPGenericMode, Collection/Map APIs) — https://pkg.go.dev/github.com/cilium/ebpf
- Linux kernel UAPI headers: linux/ipv6.h (ipv6hdr, ipv6_opt_hdr, frag_hdr), linux/icmpv6.h (icmp6hdr), linux/if_ether.h (ETH_P_IPV6)
- RFC 4291 (IPv6 Addressing Architecture — fe80::/10 link-local, ff00::/8 multicast), RFC 4861 (Neighbor Discovery — ICMPv6 types 133–137)
- Go language specification (unused/undefined import rules)
- Prometheus Go client library (client_golang) — https://pkg.go.dev/github.com/prometheus/client_golang/prometheus

## Issues Found
1. **`main.go` — invalid imports (compile error).** The import block declared `encoding/binary` and `encoding/hex`, neither of which is used anywhere in the file, while `strings.Repeat` (line ~596) was used without importing `strings`. Go fails to compile on both unused imports and undefined identifiers. Fixed by removing `encoding/binary` and `encoding/hex` and adding `strings`.
2. **`metrics.go` — invalid imports (compile error).** The import block declared `sync` and `time`, neither of which is referenced, while `log.Printf` (in the metrics server goroutine) was used without importing `log`. Fixed by removing `sync` and `time` and adding `log` (imports are per-file in Go, so `metrics.go` needs its own `log` import even though `main.go` already has one).

## Review Notes
- The `hubble observe` filter flags used (`--ipv6`, `--ip`, `--protocol ICMPv6`, `--from-namespace`/`--to-namespace`, `--verdict DROPPED`, `-o json`) are all valid against current Hubble CLI. `--ipv6` exists as the `-6, --ipv6` boolean filter.
- Cilium config values are accurate: Hubble server default port `:4244` and Hubble metrics default port `:9965` match upstream defaults; `monitor-aggregation`, `enable-ipv6`, and `ipv6-native-routing-cidr` are real keys.
- IPv6 technical claims verified: 128-bit addresses, fe80::/10 link-local (`addr[0]==0xfe && (addr[1]&0xc0)==0x80`), ff00::/8 multicast (`addr[0]==0xff`), NDP ICMPv6 types 133–137, and the IPv6 minimum MTU value (1280) used as a histogram bucket are all correct.
- The eBPF design choices are sound: XDP is correctly used for ingress only, with a separate TC program for egress (XDP cannot attach to egress); the extension-header parser uses `#pragma unroll` with a bounded loop, which is the standard pattern for satisfying the BPF verifier.
- Kernel-struct names (`ipv6hdr`, `ipv6_opt_hdr`, `frag_hdr`, `icmp6hdr`, `tcphdr`, `udphdr`) and their field accesses (`nexthdr`, `hdrlen`, `icmp6_type`, `icmp6_code`, `payload_len`, `saddr`/`daddr`) match the Linux UAPI headers included.
- Minor (not changed, illustrative): the Mermaid diagram assigns `fe80::` (link-local) addresses to pods for inter-pod communication, whereas real pod-to-pod IPv6 traffic uses ULA/global addresses. This is a simplification, not a technical error. Likewise `extract_ports` assumes the transport header immediately follows the IPv6 header and does not walk extension headers — acknowledged implicitly by the dedicated extension-header section later in the post.
