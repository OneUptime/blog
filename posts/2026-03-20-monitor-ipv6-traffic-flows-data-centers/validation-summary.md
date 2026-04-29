# Validation Summary: How to Monitor IPv6 Traffic Flows in Data Centers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- IPv6 flow monitoring (NetFlow v9 / IPFIX)
- Cisco Nexus NX-OS Flexible NetFlow
- pmacct (`nfacctd`) flow collector
- PostgreSQL backend for pmacct
- Grafana visualization (SQL query)
- Linux eBPF / bpftrace (`tcp_v6_connect` kprobe)

## Sources Consulted
- [Cisco Nexus 9000 Series NX-OS System Management Configuration Guide, Release 10.6(x) — NetFlow](https://www.cisco.com/c/en/us/td/docs/switches/datacenter/nexus9000/sw/106x/config-guides/sys-mgmt/cisco-nexus-9000-series-nx-os-system-management-configuration-guide-release-106x/m-configuring-netflow-104x.html)
- [Cisco Nexus 9000 Series NX-OS System Management Configuration Guide, Release 10.3(x) — Configuring NetFlow](https://www.cisco.com/c/en/us/td/docs/dcn/nx-os/nexus9000/103x/configuration/system-management/cisco-nexus-9000-series-nx-os-system-management-configuration-guide-103x/m-configuring-netflow-10x.html)
- [pmacct CONFIG-KEYS reference (master branch)](https://github.com/pmacct/pmacct/blob/master/CONFIG-KEYS)
- [bpftrace tcpconnect.bt example tool](https://github.com/bpftrace/bpftrace/blob/master/tools/tcpconnect.bt)
- RFC 7011 (IPFIX protocol specification) — IANA registered UDP port 4739

## Issues Found
1. **Cisco Nexus interface attachment used the IPv4 form for an IPv6 monitor.**
   The original config applied `ip flow monitor IPv6-MONITOR input/output` to the interface. On Cisco NX-OS, `ip flow monitor` only matches IPv4 traffic; IPv6 requires the dedicated `ipv6 flow monitor` keyword. In addition, the Nexus 9000 NetFlow guide explicitly states that egress NetFlow does not support IPv6 (or multicast) traffic, so attaching the monitor in the `output` direction would silently fail to capture IPv6 flows.
   Fix: changed to `ipv6 flow monitor IPv6-MONITOR input` only, with a short inline comment noting the egress IPv6 limitation.

2. **`bytes` and `packets` are not valid pmacct aggregate primitives.**
   The original `aggregate:` line ended with `...,bytes,packets`. In pmacct, the `aggregate` directive selects the *keys* used to aggregate flows — byte and packet counts are not keys, they are the counters that are accumulated automatically per aggregate. Listing them produces a config error and at minimum is misleading. The full list of valid primitives in `CONFIG-KEYS` (e.g. `src_host`, `dst_host`, `src_port`, `dst_port`, `proto`, `flows`, `tos`, `tcpflags`, etc.) does not include `bytes` or `packets`.
   Fix: removed `bytes,packets` from the aggregate list.

3. **bpftrace IPv6 destination-port extraction was type-incorrect.**
   The original snippet used `args->uaddr->sin6_port` inside `kprobe:tcp_v6_connect`. The kernel signature is `tcp_v6_connect(struct sock *sk, struct sockaddr *uaddr, int addr_len)`, so `uaddr` has type `struct sockaddr *` and has no `sin6_port` member; bpftrace will reject the field access. Additionally, `sin6_port` is stored in network byte order, so even a successful read needs a byte-swap to be human-readable.
   Fix: added an explicit cast `$sa = (struct sockaddr_in6 *)arg1;` and wrapped the port read in `bswap(...)` (consistent with the pattern used in the upstream `tools/tcpconnect.bt` example).

## Review Notes
- The "Enabling IPFIX on Cisco Nexus" section uses `version 9` in the flow exporter. Strictly, IPFIX is NetFlow v10 (RFC 7011) and the IANA-registered destination port 4739 is also for IPFIX. However, Cisco's Nexus platforms historically expose NetFlow v9 as the main exporter version (with IPFIX-style templates), and many deployments label this loosely as "IPFIX." The configuration as written is syntactically valid and will work on Nexus; it is left unchanged. If the platform/NX-OS release supports it, `version 10` would be a closer fit to the section title.
- The `pgsql_passwd: secret` value is illustrative only; real deployments should source it from a secret manager. No change made — this is clearly a placeholder.
- `match ip protocol` inside an IPv6 flow record on Nexus is permitted (the IP protocol/next-header field is shared between v4 and v6 records). No change needed.
- The Grafana SQL query uses the standard pmacct PostgreSQL schema (`stamp_inserted`, `bytes`), which is correct.
- IANA port 4739 (UDP) for IPFIX is correct.
