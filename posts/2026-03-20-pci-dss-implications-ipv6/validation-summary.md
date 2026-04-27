# Validation Summary: How to Understand PCI DSS Implications for IPv6

## Status
validated

## Post Type
Guide / Reference (compliance + Linux network configuration)

## Technologies Covered
- PCI DSS v4.0 (Payment Card Industry Data Security Standard)
- IPv6 networking
- ip6tables (Linux IPv6 firewall)
- iptables-persistent (rules persistence package on Debian/Ubuntu)
- Linux sysctl IPv6 tunables (`net.ipv6.conf.*`)
- ss (socket statistics)
- rsyslog
- nmap (with `-6` flag for IPv6 scanning)
- RFC 3849 documentation prefix (`2001:db8::/32`)

## Sources Consulted
- PCI DSS v4.0 / v4.0.1 standard, Requirements 1, 2, 6, 10, 11 (https://www.pcisecuritystandards.org/document_library/)
- ip6tables(8) man page
- iptables-persistent package documentation (Debian/Ubuntu) — confirms rules path is `/etc/iptables/rules.v4` and `/etc/iptables/rules.v6`
- /etc/protocols — confirms protocol 41 = "ipv6" (IPv6 encapsulation, used by 6in4 per RFC 4213)
- RFC 4213 (Basic Transition Mechanisms for IPv6 Hosts and Routers) — 6in4 is IPv6 encapsulated in IPv4 (protocol 41)
- RFC 3849 (IPv6 Address Prefix Reserved for Documentation) — confirms `2001:db8::/32`
- nmap(1) man page — `-6` flag and IPv6 address syntax requirements

## Issues Found
1. **Incorrect iptables-persistent path.** The post saved IPv6 rules to `/etc/ip6tables/rules.v6`. The standard iptables-persistent path on Debian/Ubuntu is `/etc/iptables/rules.v6` (a single `iptables` directory holds both `rules.v4` and `rules.v6`). Updated to the correct path and added a clarifying comment.

2. **Misleading "Block 6in4" comment.** The line `sudo ip6tables -A INPUT -p ipv6 -j DROP` matches IPv6 packets whose next-header is 41, i.e. IPv6-in-IPv6 (4in6/6in6) encapsulation. True 6in4 tunnels are IPv4 packets with protocol 41 and must be blocked at the IPv4 firewall (`iptables`), not `ip6tables`. Updated the comment to accurately describe the rule's effect and added a note showing the equivalent `iptables` rule for true 6in4.

3. **Invalid IPv6 address `2001:db8::cde-server`.** The string contains a hyphen and non-hex characters (`s`, `r`, `v`), so it is not a valid IPv6 literal. Replaced both occurrences (the commented example on line 103 and the active `nmap` command on line 112) with `2001:db8::1`, a valid address from the RFC 3849 documentation prefix.

## Review Notes
- The PCI DSS Requirement-numbering claims (1, 2, 6, 10, 11) and the v4.0 reference to "Requirement 1.3 - Network Access Controls" are consistent with PCI DSS v4.0 / v4.0.1.
- The `kern.warning /var/log/ipv6-security.log` rsyslog rule will capture all kernel warnings, not only IPv6-related entries; the IPv6-specific filtering is achieved upstream via the `--log-prefix "PCI-IPV6-..."` strings and would require a more specific rsyslog filter (e.g. on `:msg, contains, "PCI-IPV6-"`) to truly isolate IPv6 events. This is a refinement opportunity rather than an outright error and was left unchanged to preserve the author's intent.
- The `ss -6 -tlnp | grep -v "127.0.0.1\|::1"` pipeline filters `127.0.0.1`, which is an IPv4 loopback that will never appear in `ss -6` output. Harmless but redundant — left unchanged as it is not technically incorrect.
- The DROP rule on line 43 is appended after `-P INPUT DROP` is set; since the policy already drops unmatched traffic, this rule is largely defensive/explicit. Left as-is since it documents intent.
