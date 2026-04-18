# Validation Summary: How to Troubleshoot RADIUS with IPv6

## Status
validated

## Post Type
Troubleshooting Guide / Tutorial

## Technologies Covered
- RADIUS protocol (RFC 2865/2866, RFC 3162 for IPv6 attributes)
- FreeRADIUS 3.0
- IPv6 networking
- `radclient` (FreeRADIUS client utility)
- `ping6`, `nc` (netcat), `tcpdump`, `tshark` (Wireshark CLI)
- `ip6tables` / firewalling
- `systemctl` / service management (Debian/Ubuntu conventions)
- MySQL (`radreply` table from FreeRADIUS SQL schema)
- Redis (for FreeRADIUS IPv6 pool module)
- `ss` socket statistics

## Sources Consulted
- RFC 3162 — RADIUS and IPv6 (defines `NAS-IPv6-Address`, `Framed-IPv6-Prefix`, etc.)
- RFC 3849 — IPv6 Address Prefix Reserved for Documentation (`2001:db8::/32`)
- FreeRADIUS 3.0 documentation (`clients.conf` syntax, `ipv6addr`, debug mode `-X`)
- FreeRADIUS `radclient` manpage (syntax, `-t`, `-x`, IPv6 bracket notation)
- iputils manpage (`ping`, `ping6`, `-6` flag)
- netcat manpage (`-6`, `-u`, `-z`, `-w` flags)
- tshark display filter documentation (`-Y` flag)
- ip6tables manpage

## Issues Found
Fixed invalid IPv6 addresses that contained non-hex characters (IPv6 addresses only accept `0-9` and `a-f`). These addresses would have failed immediately if a reader copied them:

1. `2001:db8::radius` (contains `r`, `i`, `u`, `s`) → replaced with `2001:db8::1` in the connectivity script variable and the diagnostic script.
2. `[2001:db8::radius]:1812` (bracketed form in every `radclient` invocation) → replaced with `[2001:db8::1]:1812`.
3. `2001:db8:nas::1` (contains `n`, `s`) → replaced with `2001:db8:a::1` (for `NAS-IPv6-Address` in the Step 2 heredoc).
4. `2001:db8:nas::2` (contains `n`, `s`) → replaced with `2001:db8:a::2` (for the `client new_nas { ipv6addr = ... }` block in Step 3).
5. `2001:db8:diag::1` (contains `i`, `g`) → replaced with `2001:db8:d::1` (for `NAS-IPv6-Address` in the diagnostic script).

All other technical content was verified as accurate:
- FreeRADIUS matches clients by packet source IP (not by `NAS-IPv6-Address` attribute) — correct.
- `clients.conf` syntax with `ipv6addr = <addr>` inside a `client <name> { ... }` block — correct for FreeRADIUS 3.0.
- `radclient -x [addr]:port auth secret` bracket syntax for IPv6 — correct.
- `freeradius -X` debug mode flag — correct.
- `NAS-IPv6-Address` is RADIUS attribute type 95 per RFC 3162 — correct.
- `tshark -Y "radius"` display filter syntax — correct.
- `ip6tables` rule syntax — correct.
- `ss -6 -u -l -n` to list IPv6 UDP listening sockets — correct.

## Review Notes
- `ping6` still works on most distros but has been deprecated upstream in iputils since ~2019 in favor of `ping -6`. On newer distros it may be a symlink or removed. The post's usage still works in practice but readers on minimal images may need `ping -6`.
- On RHEL/CentOS/Fedora the FreeRADIUS binary is `radiusd` (not `freeradius`) and the config lives under `/etc/raddb/` (not `/etc/freeradius/3.0/`). The post is written Debian/Ubuntu-first — worth noting for RHEL users but not incorrect.
- `nc -u -z` UDP port scans are inherently unreliable: UDP is connectionless, so the "success" return can be a false positive (no ICMP unreachable received ≠ port is open). The post's connectivity test is a reasonable first-pass check but shouldn't be treated as definitive; `radclient` itself is the authoritative test.
- `ip6tables` is being superseded by `nftables` / `firewalld` on modern distros; on recent RHEL 9 / Ubuntu 22.04+ `ip6tables` is usually a compatibility shim over nftables. The rule syntax still works but `nft` equivalents may be preferred long-term.
- The use of the `2001:db8::/32` documentation prefix (RFC 3849) for example addresses is appropriate.
