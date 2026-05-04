# Validation Summary: How to Configure TCP ECN (Explicit Congestion Notification) on Linux

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- TCP Explicit Congestion Notification (ECN), RFC 3168
- Linux kernel sysctl (`net.ipv4.tcp_ecn`)
- `tcpdump` for handshake inspection
- `nstat` and `/proc/net/netstat` for ECN statistics
- `iptables` `ecn` match and `ECN` target (mangle table)

## Sources Consulted
- RFC 3168: "The Addition of Explicit Congestion Notification (ECN) to IP" — https://www.rfc-editor.org/rfc/rfc3168
- Linux `tcp(7)` man page — `net.ipv4.tcp_ecn` value semantics
- `iptables-extensions(8)` man page — `-m ecn` match and `-j ECN` target options
- Linux kernel `/proc/net/netstat` and `/proc/net/snmp` counter layout
- Linux kernel TCP MIB counters (`TcpExt:` and `IpExt:` sections)

## Issues Found

1. **Reversed SYN / SYN-ACK ECN flag descriptions** (lines 54–56 originally).
   - The post claimed the SYN had only `ECE`, and the SYN-ACK had both `ECE` and `CWR`.
   - Per RFC 3168 §6.1.1, this is reversed: the **ECN-setup SYN** has both `ECE` and `CWR`, while the **ECN-setup SYN-ACK** has `ECE` set and `CWR` *not* set.
   - Fixed by swapping the two flag descriptions and aligning the lower explanatory comment to explicitly state `CWR` must be unset on the SYN-ACK.

2. **Incorrect counter description: `TcpExtTCPSACKReneging`** (line 70 originally).
   - The post described this counter as "SACK blocks discarded by ECN", which is wrong. `TCPSACKReneging` is a SACK loss-recovery counter that tracks peers reneging on previously-SACKed data; it is unrelated to ECN.
   - Fixed by removing this entry and replacing it with the actual ECN-related counters: `IpExtInNoECTPkts`, `IpExtInECT0Pkts`, `IpExtInECT1Pkts`, `IpExtInCEPkts`, and `TcpExtTCPDeliveredCE`.

3. **Wrong /proc file for `TcpExt:` counters** (line 74 originally).
   - The post used `/proc/net/snmp` to read `TcpExt:` counters. `/proc/net/snmp` only contains the classic MIB sections (`Ip`, `Icmp`, `IcmpMsg`, `Tcp`, `Udp`, `UdpLite`). The extended sections (`TcpExt:`, `IpExt:`) live in `/proc/net/netstat`.
   - Fixed by changing the path to `/proc/net/netstat` and simplifying the pipeline to a working `grep` over both `IpExt` and `TcpExt` sections.

4. **Non-existent counter pattern: `TcpExtTCPECN*`** (line 71 originally).
   - There is no counter named `TcpExtTCPECNQueue` or a `TCPECN*` family in mainline Linux. The actual ECN packet counters are in the `IpExt:` section (`InNoECTPkts`, `InECT0Pkts`, `InECT1Pkts`, `InCEPkts`), with `TCPDeliveredCE` in `TcpExt:`.
   - Fixed in the same edit as #2/#3 by listing the real counter names.

## Review Notes

- The `nstat` filter pattern was tightened to `ECT|CEPkts|DeliveredCE` so it actually matches kernel counter names instead of substring-matching on `CE` (which would also hit unrelated counters).
- The `tcpdump` flag-display strings shown in the post are illustrative; modern `tcpdump` actually renders ECN flags as compact letters inside the flag bracket (e.g. `[SEW]` for a SYN with ECE+CWR, `[S.E]` for a SYN-ACK with ECE). The post's "ECE CWR" textual rendering is a simplification; it is acceptable for a tutorial but not byte-exact tcpdump output.
- The `iptables` examples are correct; note that the `ECN` target is only valid in the `mangle` table, which the post already uses.
- `net.ipv4.tcp_ecn=2` has been the Linux default since 2.6.31 — readers on modern distros may already be in mode 2 by default. This is not an error in the post but worth knowing.
- ECN++ / Accurate ECN (AccECN, RFC 9768) is a more recent extension exposed via `net.ipv4.tcp_ecn_fallback` and related sysctls; the post intentionally focuses on classic RFC 3168 ECN, which remains correct.
