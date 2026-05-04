# Validation Summary: How to Configure IPv6 Congestion Control Algorithms

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Linux TCP congestion control (BBR, CUBIC, HTCP, Westwood, Vegas, Illinois)
- Linux kernel sysctl interface (`/proc/sys/net/ipv4/tcp_*`)
- Linux `tc` traffic control and `fq` qdisc
- Python 3 `socket` module (AF_INET6, IPPROTO_TCP, TCP_CONGESTION)
- `iperf3` for throughput benchmarking
- `ss`, `netstat` for socket and retransmission monitoring
- `modprobe`, `lsmod` for kernel module management

## Sources Consulted
- tcp(7) Linux manual page — https://man7.org/linux/man-pages/man7/tcp.7.html
- Linux kernel `<linux/tcp.h>` (TCP_CONGESTION = 13)
- Python socket documentation — IPv6 4-tuple address format `(host, port, flowinfo, scope_id)` for AF_INET6
- ip-link(8), tc(8), ss(8) Linux manual pages
- iperf3 documentation (`-6`, `-c`, `-t`, `-P`, `--format` flags)
- Linux kernel BBR/fq pacing documentation (kernel 4.9+ for BBR, 4.13+ for internal pacing)

## Issues Found
No technical issues found.

Verified items:
- `/proc/sys/net/ipv4/tcp_available_congestion_control` is the correct path; despite the `ipv4` segment, this sysctl applies to both IPv4 and IPv6 TCP connections in Linux.
- Module names `tcp_bbr`, `tcp_htcp`, `tcp_illinois`, `tcp_westwood` are correct.
- `net.core.default_qdisc = fq` and `net.ipv4.tcp_congestion_control = bbr` are the correct sysctl keys, and they govern all TCP regardless of address family.
- `TCP_CONGESTION = 13` matches the Linux header definition; `setsockopt(IPPROTO_TCP, TCP_CONGESTION, name)` with a byte-encoded algorithm name is the correct invocation.
- IPv6 `connect()` 4-tuple `(host, port, flowinfo, scope_id)` is the documented Python form for `AF_INET6` sockets.
- `iperf3 -6 -c <addr> -t N -P 4 --format m` flags are valid.
- `tc qdisc replace dev <iface> root fq` is the correct syntax.
- `ss -6 -t -i` correctly shows IPv6 TCP socket info including cwnd/rtt; the example output fields (`cwnd`, `ssthresh`, `reordering`, `rtt`, `ato`) are plausible for an established connection.

## Review Notes
- The claim "BBR requires the Fair Queue (fq) packet scheduler to function optimally" is accurate as worded. Original BBRv1 (Linux 4.9) effectively required `fq` for pacing; since kernel 4.13+ BBR can use internal TSQ/EDT pacing without `fq`, but `fq` still provides best-quality pacing and remains the recommended pairing — so the qualifier "to function optimally" is correct.
- The `ip -6 link show` invocation in Step 5 works but the `-6` flag is essentially a no-op for `link` (which is L2); plain `ip link show` would be equivalent. Not incorrect, just redundant.
- The awk parser `awk -F': ' '/^[0-9]+/{print $2}'` will return names like `eth0.100@eth0` for VLAN sub-interfaces, which `tc` would reject. Acceptable for typical setups; users with VLAN/bridge/veth devices may need to strip the `@parent` suffix.
- CUBIC has been the Linux default since kernel 2.6.19 — the table entry is accurate.
- No version pinning is provided, but all commands shown are compatible with mainstream Linux distributions running kernel 4.9+ (where BBR is available).
