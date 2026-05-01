# Validation Summary: How to Understand DHCPv6 Protocol Overview

## Status
validated

## Post Type
Guide / Protocol overview

## Technologies Covered
- DHCPv6
- IPv6
- Router Advertisements (RA)
- Linux networking tools (`ip`, `tcpdump`, `dhclient`, `dhcpcd`)
- Kea DHCP server
- IETF RFCs and IANA DHCPv6 registries

## Sources Consulted
- RFC 9915: Dynamic Host Configuration Protocol for IPv6 (DHCPv6) - https://www.rfc-editor.org/rfc/rfc9915.html
- RFC 4861: Neighbor Discovery for IP version 6 (IPv6) - https://www.rfc-editor.org/rfc/rfc4861.html
- RFC 3646: DNS Configuration options for Dynamic Host Configuration Protocol for IPv6 (DHCPv6) - https://www.rfc-editor.org/rfc/rfc3646.html
- IANA DHCPv6 Parameters registry - https://www.iana.org/assignments/dhcpv6-parameters/dhcpv6-parameters.xhtml
- Kea DHCPv6 Server ARM (Rapid Commit) - https://kea.readthedocs.io/en/kea-2.5.2/arm/dhcp6-srv.html
- `dhcpcd(8)` local man page
- `ip-address(8)` local man page and `ip address help`
- `tcpdump --help` local command output

## Issues Found
- The post referenced `RFC 8415` as the current DHCPv6 base specification. I updated it to `RFC 9915`, which obsoleted RFC 8415 in January 2026.
- Several DHCPv6 message type numbers were incorrect. I corrected the codes for `RENEW`, `REBIND`, `REPLY`, `RELEASE`, `DECLINE`, and `RECONFIGURE`, and I changed `INFO-REQUEST` to the RFC name `INFORMATION-REQUEST`.
- The Rapid Commit option code was incorrect. I changed it from `80` to `14` to match the current IANA DHCPv6 option registry.
- `IA_TA` was presented as a normal current address-assignment type. I marked it obsolete because RFC 9915 obsoletes temporary-address assignment via `IA_TA`.
- The renew/rebind section described `T1` and `T2` as fixed defaults of 50% and 80% of "lease time". I corrected this to reflect that `T1` and `T2` are server-supplied values; 0.5 and 0.8 of the shortest preferred lifetime are RFC-recommended values, not unconditional defaults.
- The Rapid Commit configuration example for `ISC dhcpd` was not reliable as current documented guidance. I removed that concrete example and kept the verified Kea `\"rapid-commit\": true` example, noting that syntax is implementation-specific on other servers.
- The Linux verification section used hard-coded lease file paths that are not portable across current clients and distributions. I replaced them with a generic file search and the documented `dhcpcd -U eth0` command.
- The post claimed `ip -6 addr show` can distinguish DHCPv6 from SLAAC via an `autoconf` flag. I corrected this because `ip-address(8)` does not document such a reliable distinction in normal output; the post now directs readers to packet capture or lease data instead.
- The conclusion implied DHCPv6 is simply activated by RA `M=1`. I corrected this to describe the actual RA flag semantics from RFC 4861: `M = 1` indicates managed address configuration, while `O = 1` indicates other configuration is available via DHCPv6.

## Review Notes
- The corrected post is technically sound after the fixes above.
- DHCPv6 client behavior around RA flags can still vary by operating system, so packet captures and client-specific lease/state inspection remain the most reliable validation methods in practice.
- Concrete server configuration examples age quickly; the Kea example is current, while older DHCPv6 server implementations should be checked against their own documentation before reuse.
