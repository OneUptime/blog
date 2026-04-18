# Validation Summary: How to Understand UDP Checksum Calculation and Validation

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- UDP protocol (RFC 768)
- IPv4 and IPv6 checksum behavior (RFC 8200, RFC 6935, RFC 6936)
- Linux kernel networking (checksum offload, GSO, GRO, LRO)
- `ethtool` (NIC feature control)
- `nstat` / `/proc/net/snmp` (UDP kernel counters)
- `tcpdump` and Wireshark display filters
- `sysctl` (Linux network tunables)

## Sources Consulted
- RFC 768 — User Datagram Protocol (pseudo-header, one's complement sum, zero checksum semantics)
- RFC 8200 / RFC 2460 — IPv6 spec (UDP checksum mandatory)
- RFC 6935 / RFC 6936 — IPv6 UDP zero-checksum for tunnels
- Linux kernel networking docs — `Documentation/networking/segmentation-offloads.rst` (GSO/GRO/LRO semantics)
- Linux kernel `ip-sysctl` documentation (udp_early_demux is a socket-lookup optimization, unrelated to checksum validation)
- Wireshark display filter reference — https://www.wireshark.org/docs/dfref/u/udp.html (`udp.checksum.status` field)
- `ethtool(8)` man page (feature names for `-K`)

## Issues Found
Three technical inaccuracies were corrected:

1. **Incorrect Wireshark filter field name.** The post used `udp.checksum_status == "Bad"` (underscore). The correct current field is `udp.checksum.status` (dot), per the Wireshark UDP display-filter reference. It also used the deprecated boolean `udp.checksum_bad == true` (deprecated since Wireshark 2.2.0). Both lines were replaced with the current filter `udp.checksum.status == "Bad"` (plus the numeric equivalent `== 2`).

2. **Incorrect description of GRO.** The post said "GRO: NIC reassembles incoming packets before passing to kernel". GRO (Generic Receive Offload) is a **software** feature of the Linux networking stack, performed during NAPI polling — not in the NIC hardware. The hardware counterpart is LRO (Large Receive Offload). Corrected the description to reflect that GRO is a kernel/software feature and noted LRO as the hardware counterpart.

3. **Misleading sysctl reference.** The post referenced `net.ipv4.udp_early_demux` as a "related setting" under "Enable strict checksum validation". That sysctl enables early socket demultiplexing for performance and is unrelated to checksum validation. Linux has no sysctl to toggle UDP checksum validation — it is controlled per-socket via `SO_NO_CHECK` and by the skb state set by the NIC/stack during offload. Replaced the line with an accurate note.

## Review Notes
- The IPv4 pseudo-header layout (12 bytes: Src IP + Dst IP + Zero + Proto=17 + UDP Length) is correct per RFC 768. The ASCII diagram's column alignment is slightly uneven visually but the byte counts are accurate.
- The claim that IPv4 UDP checksum is optional (zero = not computed) and IPv6 is mandatory is correct. The post does not cover the IPv6 zero-checksum exception for tunneling (RFC 6935/6936), but this is a niche case and the post's framing for general usage is accurate.
- `ethtool -K eth0 tx-checksumming off` is valid: `tx-checksumming` is the long feature name listed by `ethtool -k`, and the short alias `tx` would also work. No change needed.
- The loopback note ("checksums may be wrong on `lo`") is accurate — checksum offload is not applied on loopback, and tcpdump captures packets before offload, so "incorrect" checksums are expected.
- The GSO description is simplified but not wrong: GSO defers segmentation as late as possible; if the NIC supports hardware segmentation (TSO/USO), it happens there, otherwise the kernel does it before handoff.
