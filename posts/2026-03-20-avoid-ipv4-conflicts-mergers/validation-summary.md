# Validation Summary: How to Avoid IPv4 Address Conflicts in Merged or Acquired Networks

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv4 private addressing (RFC 1918)
- Network address translation with Linux `iptables` `NETMAP`
- Python `ipaddress`
- Nmap host discovery
- MPLS L3VPN / VRF isolation

## Sources Consulted
- RFC 1918: Address Allocation for Private Internets - https://www.rfc-editor.org/rfc/rfc1918
- RFC 4364: BGP/MPLS IP Virtual Private Networks (VPNs) - https://www.rfc-editor.org/rfc/rfc4364
- RFC 4213: Basic IPv6 Transition Mechanisms for IPv6 Hosts and Routers - https://www.rfc-editor.org/rfc/rfc4213.html
- Nmap Host Discovery reference - https://nmap.org/book/man-host-discovery.html
- Nmap Output Formats / `--open` / grepable output reference - https://nmap.org/book/man-output.html
- Nmap Grepable Output reference - https://nmap.org/book/output-formats-grepable-output.html
- Python `ipaddress` library documentation - https://docs.python.org/3/library/ipaddress.html
- `iptables-extensions(8)` `NETMAP` reference - https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- Local CLI help: `iptables -j NETMAP -h`

## Issues Found
- The audit example used `nmap -sn` together with `--open`. `--open` filters port-scan results, but `-sn` performs host discovery without port scanning, so the flag was misleading. I removed `--open`.
- The audit example used Nmap grepable output (`-oG`), which the Nmap documentation marks as deprecated. I changed the example to use normal output (`-oN`) instead.
- The audit example claimed to find which subnets were in use, but the Python snippet only reported host count plus the lowest and highest discovered IPs. I corrected the comment so it matches what the code actually does.
- The Python snippet could raise an error when no IPs were found because it called `min()` and `max()` unconditionally. I updated it to print those values only when at least one host is present.
- The staged renumbering section used the term "dual-stack period" for hosts temporarily carrying two IPv4 addresses. In standards usage, dual stack refers to simultaneous IPv4 and IPv6 support, so I changed the wording to "dual-address period".
- The conclusion implied the "other half of 10.0.0.0/8" is always available for renumbering. I corrected that to say this only works if that space is actually available and otherwise another non-overlapping RFC 1918 block such as `172.16.0.0/12` should be used.

## Review Notes
- The `iptables` `NETMAP` example is syntactically valid for Linux `iptables`, but it is intentionally platform-specific; environments standardized on `nftables` would need equivalent rules expressed in `nft`.
- A ping scan of an entire `/8` is technically valid but operationally heavy. In practice, large estates often scope scans to allocated subnets, maintenance windows, or tuned host-discovery settings.
