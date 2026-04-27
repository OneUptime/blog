# Validation Summary: How to Set Optimal TCP Send and Receive Buffer Sizes on Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux TCP/IP stack (kernel networking)
- sysctl / `/etc/sysctl.d/` configuration
- `/proc/net/sockstat` interface
- iperf3 (network throughput testing)
- ping (latency measurement)
- ss (socket statistics)
- Python (BDP calculation example)
- Bandwidth-Delay Product (BDP) concept

## Sources Consulted
- Linux kernel networking documentation: https://www.kernel.org/doc/Documentation/networking/ip-sysctl.txt
- Linux kernel `/proc/net/sockstat` source (net/ipv4/proc.c) — verifies field ordering of `TCP: inuse N orphan N tw N alloc N mem N`
- iperf3 manpage: https://software.es.net/iperf/invoking.html (verified `-c`, `-t` flags)
- iproute2 ss manpage (verified `-t`, `-i`, `-n` flag combinations and `state` filter)
- ping(8) manpage (verified `-c`, `-i` options)
- Live verification by reading `/proc/net/sockstat` on a Linux host to confirm field positions
- RFC 7323 (TCP Extensions for High Performance — window scaling)
- Linux kernel `tcp_rmem` / `tcp_wmem` documentation: 3-tuple (min, default, max) format

## Issues Found

**Issue 1: Incorrect awk field index for `/proc/net/sockstat` mem value**

In the "Memory Impact Assessment" section, the awk command extracted field `$9`, which is the `alloc` value (number of allocated TCP sockets), not the `mem` value (pages used for socket buffers).

The actual format of the TCP line in `/proc/net/sockstat` is:
```
TCP: inuse N orphan N tw N alloc N mem N
```

When awk splits on whitespace:
- `$1` = `TCP:`
- `$8` = `alloc`, `$9` = alloc value
- `$10` = `mem`, `$11` = mem value (in pages)

**Fix applied:** Changed `awk '/^TCP:/{print $9}'` to `awk '/^TCP:/{print $11}'` so the script correctly reports TCP socket buffer memory in pages, matching the surrounding comment which documents extracting `mem`.

## Review Notes

- The BDP arithmetic in the Python examples is correct: 1 Gbps × 10 ms / 8 = 1.25 MB BDP, × 2 margin = 2.5 MB; 1 Gbps × 100 ms = 25 MB; 10 Gbps × 5 ms = 12.5 MB. All match the inline comments.
- The sysctl keys used (`net.ipv4.tcp_rmem`, `net.ipv4.tcp_wmem`, `net.core.rmem_max`, `net.core.wmem_max`, `net.ipv4.tcp_window_scaling`, `net.ipv4.tcp_moderate_rcvbuf`) are correct and current for modern Linux kernels.
- The 3-value tuple format for `tcp_rmem` / `tcp_wmem` (min, default, max) is correct.
- `tcp_window_scaling` and `tcp_moderate_rcvbuf` both default to `1` on modern kernels, so explicitly setting them is harmless and serves as documentation.
- `ss -tin state established` is valid syntax (`-t` TCP, `-i` info, `-n` numeric, plus the `state` filter), and `rcv_space` is indeed part of the `-i` extended output.
- The default Linux page size assumption of 4096 bytes is correct for x86_64; on aarch64 hosts that have been built with 16K or 64K pages, the calculation would understate memory. Not flagged as an error since 4K is overwhelmingly the common case for the post's audience.
- The bufferbloat caveat at the end is a useful and accurate guideline; pairing large buffers with BBR or `fq_codel` qdisc would be a reasonable future enhancement, but the existing mention of BBR is sufficient.
