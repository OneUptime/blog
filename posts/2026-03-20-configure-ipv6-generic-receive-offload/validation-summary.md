# Validation Summary: How to Configure IPv6 Generic Receive Offload (GRO) on Linux

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Linux networking stack (GRO / GSO offloads)
- `ethtool` (offload control, statistics, coalesce tuning)
- IPv6 (TCP and UDP)
- UDP_GRO socket option (Linux kernel)
- Python `socket` module (AF_INET6, SOCK_DGRAM, setsockopt)
- VXLAN and GENEVE tunnels
- `perf` tracepoints (`napi:napi_poll`)
- `/proc/net/dev` and `/proc/softirqs`

## Sources Consulted
- Linux kernel UAPI header: include/uapi/linux/udp.h (https://github.com/torvalds/linux/blob/master/include/uapi/linux/udp.h) — confirms `UDP_GRO = 104`
- Kernelnewbies Linux 5.0 release notes (https://kernelnewbies.org/Linux_5.0) — §1.5 "UDP Generic Receive Offload", confirms UDP_GRO landed in kernel 5.0 (commit e20cf8d3f1f7 by Paolo Abeni), not 5.4
- ethtool(8) man page — `-K` (set offload features), `-k` (show offload features), `-S` (statistics), `-C` (coalesce parameters)
- Linux kernel tracepoint definitions in `include/trace/events/napi.h` and `include/trace/events/irq.h`
- Python socket module documentation (https://docs.python.org/3/library/socket.html) — confirms IPv6 4-tuple bind format and setsockopt usage

## Issues Found
1. **Kernel version for UDP_GRO was incorrect.** The post said UDP_GRO requires "kernel 5.4+" in three places (Step 2 prose, Step 3 heading, Step 3 Python comments). UDP_GRO was actually added in Linux 5.0 (March 2019, commit `e20cf8d3f1f7`). Updated all three references to "5.0+" / "5.0".

2. **Non-existent perf tracepoint.** Step 5 used `sudo perf stat -e irq:net_rx_action -a sleep 5`. `net_rx_action` is a kernel function (in `net/core/dev.c`), not a tracepoint — the command would fail with an unknown-tracepoint error. Replaced with `sudo perf stat -e napi:napi_poll -a sleep 5`, which is a real tracepoint and the closest standard instrumentation point for measuring NAPI/NET_RX activity. Updated the comment to reflect that this measures NAPI poll rate.

## Review Notes
- The `UDP_GRO = 104` constant value is verified correct against current `include/uapi/linux/udp.h`.
- The Python IPv6 bind 4-tuple `("::", 9000, 0, 0)` (host, port, flowinfo, scopeid) is correct.
- The Mermaid diagram uses `\n` for newlines in node labels. Current Mermaid (v11+) renders `\n` literally for traditional string node labels; the canonical form is `<br/>`. However, this convention (`\n`) is used consistently across many other posts in this repo, so it was left unchanged to match the repo's renderer setup.
- `awk` parsing of `/proc/net/dev` works because the interface name field includes the trailing colon as one whitespace-separated token, so `$2` is rx_bytes and `$3` is rx_packets — verified correct.
- The post is conservative on UDP_GRO version (now 5.0+); be aware that some IPv6-specific UDP GRO improvements and bug fixes landed in later kernels (5.5–5.10), so users on very old 5.0/5.1 kernels may still see edge cases.
- Disabling GRO with `ethtool -K eth0 gro off` is correct, but on some NICs/drivers (especially virtio_net in older kernels) the setting may not persist across link resets — worth a callout in a future revision.
