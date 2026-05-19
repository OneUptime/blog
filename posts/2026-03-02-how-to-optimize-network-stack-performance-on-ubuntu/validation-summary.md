# Validation Summary: How to Optimize Network Stack Performance on Ubuntu

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- Linux kernel network stack (sysctl parameters)
- TCP/IP (buffers, TIME_WAIT management, keepalive, SYN backlog, congestion control)
- TCP BBR congestion control algorithm
- fq qdisc (queueing discipline)
- ethtool (NIC ring buffers, interrupt coalescing, offload features: TSO/GSO/GRO/LRO/checksum)
- systemd-networkd `.link` files
- networkd-dispatcher
- Receive Side Scaling (RSS), Receive Packet Steering (RPS), Receive Flow Steering (RFS)
- Jumbo frames / MTU configuration
- netplan
- iperf3, ss, nicstat, ip, ping monitoring tools

## Sources Consulted
- Linux kernel networking docs: https://www.kernel.org/doc/Documentation/networking/ip-sysctl.txt
- Linux kernel scaling.txt (RPS/RFS): https://www.kernel.org/doc/Documentation/networking/scaling.txt
- ethtool(8) man page
- systemd.link(5) man page (RxBufferSize/TxBufferSize/RxMiniBufferSize/RxJumboBufferSize options)
- sysctl(8) man page
- ss(8) man page
- TCP BBR commit history (Linux 4.9+, BBR + fq pairing)
- Ubuntu kernel defaults reference (rmem_max ~212992, ip_local_port_range 32768-60999, somaxconn historic 65535 cap pre-5.4)

## Issues Found
1. **Misleading `tcp_mem` math comment** — The original comment `# 4096 * 1048576 / 4096 = 1048576 pages = 4GB` was a numerical tautology (it just evaluates to 1048576 = 1048576) and didn't show a useful derivation. Replaced with `# 1048576 pages * 4096 bytes/page = 4GB`, which is the actual relevant calculation (page count × default page size = total bytes).

2. **Incorrect comment about how RFS is configured** — The original comment said `(set via ethtool rfs, not sysctl)`. This is factually wrong: RFS is configured via sysctl/sysfs (`/proc/sys/net/core/rps_sock_flow_entries` and `/sys/class/net/*/queues/rx-*/rps_flow_cnt`), exactly as the post itself demonstrates later in the RSS/RFS section. There is no `ethtool rfs` subcommand. Updated to correctly point to the kernel knobs and reference the later section.

## Review Notes
- The sysctl values (rmem_max=256MB, tcp_max_tw_buckets=2M, somaxconn=65535, tcp_max_syn_backlog=65535, ip_local_port_range=10000-65535) are aggressive but technically valid for high-throughput servers. Readers should understand these are tuning ceilings, not universal recommendations.
- `tcp_moderate_rcvbuf` is more precisely "TCP receive buffer auto-tuning" rather than "TCP memory auto-tuning" — the comment is loose but not strictly incorrect; left unchanged to preserve author voice.
- `somaxconn`: In kernels < 5.4 the value was capped at 65535 (unsigned short); in 5.4+ the cap was lifted. Ubuntu 20.04+ (kernel 5.4+) supports larger values. 65535 remains a safe, portable choice across supported Ubuntu releases.
- BBR + `fq` qdisc pairing: From Linux 4.13 BBRv1 works with non-fq qdiscs (e.g., `fq_codel`), but `fq` is still the recommended pairing and produces the most predictable pacing behavior. The post's "required for BBR to work well" framing is accurate.
- `lro on` (Large Receive Offload): Correctly flagged with a caution. LRO is generally inadvisable on forwarding/bridging hosts and on hypervisors; many modern drivers default it off in favor of GRO. The caveat in the post is appropriate.
- `ping -M do -s 8972` math: 8972 (payload) + 8 (ICMP header) + 20 (IPv4 header) = 9000 bytes. Correct.
- The `for i in $(ls ...)` loop in the RPS section is a minor shellcheck anti-pattern (parsing `ls`) but functions correctly given the predictable sysfs path naming.
- ip_local_port_range 10000-65535 widens the ephemeral range below the default 32768 floor; readers should verify no locally-listening services in that range to avoid conflicts.
