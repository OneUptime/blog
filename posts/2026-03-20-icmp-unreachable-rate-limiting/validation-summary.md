# Validation Summary: How to Configure ICMP Unreachable Rate Limiting

## Status
validated

## Post Type
Guide

## Technologies Covered
- ICMPv4
- Linux kernel IPv4 networking sysctls
- `iptables`
- `nstat` from `iproute2`
- `/proc/net/snmp`

## Sources Consulted
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- `iptables-extensions(8)` manual page: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- `nstat(8)` manual page: https://man7.org/linux/man-pages/man8/nstat.8.html
- Local command help output: `iptables -p icmp -h`, `iptables -m limit -h`, `iptables -m hashlimit -h`, `nstat --help`
- Local runtime verification of counter names: `/proc/net/snmp`, `nstat -az 'IcmpOutRateLimit*' 'IcmpOutDestUnreachs' 'IcmpOutTimeExcds'`

## Issues Found
- The post described `net.ipv4.icmp_ratelimit=1000` as a token-bucket burst value. I corrected this to the documented behavior: it is the minimum spacing in milliseconds between rate-limited ICMP replies to the same target, and I noted that host-wide caps are handled separately by `net.ipv4.icmp_msgs_per_sec` and `net.ipv4.icmp_msgs_burst`.
- The default `icmp_ratemask` breakdown was wrong. I corrected the active bits and binary representation to match the kernel documentation: bits `3,4,11,12`, corresponding to destination unreachable, source quench, time exceeded, and parameter problem.
- The example `icmp_ratemask=65535` was labeled as covering all ICMP error types, which is inaccurate because the documented mask spans bits `0-18`. I corrected the example to `524287` for setting all documented bits.
- The monitoring commands used an `nstat` pattern that does not match the real counter names. I updated them to use `IcmpOutRateLimitGlobal` and `IcmpOutRateLimitHost`, and I fixed the `/proc/net/snmp` `awk` command so it prints both the header row and the values.
- The UDP `hashlimit` example could be read as a blanket rule for all UDP traffic. I added a placement note clarifying that it should come after explicit `ACCEPT` rules for legitimate UDP services.

## Review Notes
- The post is technically correct after the fixes above, but it is IPv4-specific. ICMPv6 uses different sysctls and message type handling, and many modern systems may prefer native `nftables` rules over `iptables`.
