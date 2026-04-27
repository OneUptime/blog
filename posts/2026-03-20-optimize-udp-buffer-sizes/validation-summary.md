# Validation Summary: How to Optimize UDP Buffer Sizes for High-Volume UDP Applications

## Status
validated

## Post Type
Tutorial / Guide (Linux network performance tuning)

## Technologies Covered
- Linux kernel sysctls (`net.core.rmem_max`, `wmem_max`, `rmem_default`, `wmem_default`)
- UDP socket options (`SO_RCVBUF`, `SO_SNDBUF`)
- Python `socket` module
- `netstat`, `nstat`, `ss`, `sar`, `watch` CLI tools
- unbound DNS resolver configuration
- syslog-ng configuration (`udp()` source, `so_rcvbuf()`)
- rsyslog configuration (`imudp` module, `rcvbufSize`)

## Sources Consulted
- `socket(7)` man page (SO_RCVBUF / SO_SNDBUF semantics, kernel doubling behavior)
- `sar(1)` / `sysstat` documentation for `-n UDP` output columns (idgm/s, odgm/s, noport/s, idgmerr/s)
- Linux kernel networking documentation on `net.core.rmem_max`, `rmem_default`, `wmem_max`, `wmem_default`
- `proc(5)` / kernel docs on `net.ipv4.ip_default_ttl`
- `ss(8)` man page (Recv-Q column meaning)
- unbound.conf(5) man page (`so-rcvbuf`, `so-sndbuf` directives)
- syslog-ng OSE administrator guide (UDP source `so_rcvbuf()` option)
- rsyslog `imudp` module documentation (`rcvbufSize`, `TimeRequery` parameters)
- SNMP UDP MIB counter names (UdpInErrors, UdpRcvbufErrors, UdpSndBufErrors via `nstat`)

## Issues Found

1. **Incorrect SO_RCVBUF doubling comment (Step 4).** The original comment read `# Verify (OS may halve the requested value)`. This is the opposite of what Linux does. According to `socket(7)`, the kernel *doubles* the value passed to `setsockopt(SO_RCVBUF)` to allow space for bookkeeping overhead, and `getsockopt` returns the doubled value (capped at `2 * rmem_max`). Updated the comment to correctly describe this doubling behavior.

2. **Misleading `ip_default_ttl` line (Step 6).** The VoIP sysctl block contained:
   ```
   # Disable DSCP remarking (preserve VoIP QoS marking)
   net.ipv4.ip_default_ttl = 64
   ```
   `net.ipv4.ip_default_ttl` controls the default Time-To-Live for outgoing IPv4 packets and has nothing to do with DSCP remarking or QoS preservation. The value `64` is also already the kernel default. Removed this misleading line entirely, since it neither tunes UDP buffers nor does what the comment claims.

3. **Wrong `sar -n UDP` output format (Step 7).** The example output used the columns `udp/s udperr/s rcv/s snd/s`, which is not the format `sar -n UDP` produces. Verified with sysstat: the actual columns are `idgm/s odgm/s noport/s idgmerr/s` (input/output datagrams per second, datagrams to closed ports per second, input datagram errors per second). Updated the example to use the correct column headers and corrected the interpretation note (`idgmerr/s > 0` indicates drops, not the non-existent `udperr/s`).

## Review Notes

- The Linux sysctl values (`rmem_max = 134217728`, etc.) are byte counts, and the inline `# 128 MB`, `# 25 MB`, `# 4 MB` annotations are accurate (134217728 / 2^20 = 128, 26214400 / 2^20 = 25, 4194304 / 2^20 = 4).
- `ss -upe | grep udp`: the `-u` flag already restricts output to UDP sockets, so the `grep udp` is redundant but harmless. Left as-is since it does not produce incorrect output.
- The `ss -upe | awk '$2 > 1000 ...'` snippet works in practice (Recv-Q is the second column for UDP sockets), though the header line is filtered out only because awk's numeric comparison silently rejects non-numeric strings; this is acceptable for a quick scan.
- syslog-ng accepts both `so_rcvbuf()` and `so-rcvbuf()` forms inside the `udp()` source driver, so the example is valid.
- The post conflates "bufferbloat" with simple queue latency in Step 6. Strictly, bufferbloat refers to excessive buffering in network devices (routers/queues), not in application-layer socket buffers. The point about increased queuing delay from oversized socket buffers is still valid, just terminologically loose. Not a technical error worth changing the prose for.
- Version-specific caveat: `nstat` counter names (`UdpInErrors`, `UdpRcvbufErrors`, `UdpSndBufErrors`) come from the kernel SNMP UDP MIB and are stable across modern kernels.
