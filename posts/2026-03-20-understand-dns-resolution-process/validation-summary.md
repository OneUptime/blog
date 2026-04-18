# Validation Summary: How to Understand DNS Resolution Process Step by Step

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- DNS (Domain Name System) resolution
- `dig` command-line tool (BIND utilities)
- systemd-resolved
- `/etc/hosts` and `/etc/resolv.conf`
- nscd (Name Service Cache Daemon)
- DNS status codes (SERVFAIL, NXDOMAIN, REFUSED)
- DNSSEC (mentioned in context of SERVFAIL)

## Sources Consulted
- RFC 1034 / RFC 1035 (DNS fundamentals and message format)
- RFC 8499 (DNS terminology - stub resolver, recursive resolver, authoritative)
- IANA root server list (https://www.iana.org/domains/root/servers) — confirms 13 root server letters a-m
- Verisign .com TLD nameserver list (a-m.gtld-servers.net)
- BIND 9 `dig` man page and `dig -h` output (verified `+trace`, `+short`, `+stats`, `+time=N` options)
- systemd-resolved documentation (confirms 127.0.0.53 stub listener address)
- RFC 1035 §4.1.1 (AA — Authoritative Answer flag)

## Issues Found
No technical issues found. All claims, commands, flags, and behavior descriptions are accurate:
- 13 root server sets (a.root-servers.net through m.root-servers.net) is correct.
- `.com` TLD nameservers `a-m.gtld-servers.net`; `g.gtld-servers.net` is a valid example.
- AA flag description (authoritative vs cached) matches RFC 1035.
- `127.0.0.53` as the systemd-resolved stub listener is correct.
- `dig` options used (`+trace`, `+short`, `+stats`, `+time=2`, `@server`) are all valid per `dig -h`.
- Status codes SERVFAIL / NXDOMAIN / REFUSED and their typical causes are described correctly.
- DNSSEC validation failure as a cause of SERVFAIL is accurate.
- Cache-bypass technique of querying the authoritative NS directly is correct.

## Review Notes
- The illustrative IP `93.184.216.34` was the long-standing public IP for `example.com` (operated by Edgecast/Verizon). In mid-2024, IANA moved `example.com` to new IP space. The post uses this IP as an illustrative example for a fictional `api.example.com`, so it remains valid as a teaching example rather than a factual claim.
- The bullet descriptions under "Important details in +trace output" (`[query]`, `QUERY TIME`, `SERVER`) are conceptual descriptions rather than literal markers in dig's output. Actual `dig +trace` output uses lines like `;; Received X bytes from SERVER_IP#53(hostname) in Y ms`. This is not technically incorrect but a future revision could tighten the wording to match literal dig output.
- `/etc/hosts` is a static lookup file (consulted before DNS via nsswitch.conf), not strictly a "cache" — grouping it with nscd/systemd-resolved under "OS stub resolver cache" is a minor simplification but acceptable in a conceptual overview.
- The example nameserver `ns1.example.com` is illustrative; the real authoritative servers for `example.com` are `a.iana-servers.net` and `b.iana-servers.net`. Used as a placeholder, this is fine.
