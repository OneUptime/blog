# Validation Summary: How to Understand USGv6 (US Government IPv6 Profile)

## Status
validated

## Post Type
Guide / Reference overview

## Technologies Covered
- USGv6 Profile (NIST SP 500-267B Rev 1)
- IPv6 (RFC 8504 IPv6 Node Requirements)
- ICMPv6, NDP, SLAAC, DHCPv6
- Linux IPv6 sysctls (`/proc/sys/net/ipv6/...`)
- `ip6tables` (including the `rpfilter` match)
- Quagga (ospf6d, bgpd) and `radvd`
- Routing protocols: OSPFv3, IS-IS for IPv6 (RFC 5308), BGP4+/MP-BGP (RFC 4760, RFC 2545)
- IPv6 Privacy Extensions (`use_tempaddr`, RFC 4941/8981)
- UNH-IOL, Spirent, Keysight (IXIA) testing labs

## Sources Consulted
- NIST SP 500-267B Rev 1, "USGv6 Profile" (Nov 2020) — https://www.nist.gov/programs-projects/usgv6-program
- RFC 8504 "IPv6 Node Requirements" (Jan 2019) — https://www.rfc-editor.org/rfc/rfc8504
- RFC 6434 "IPv6 Node Requirements" (Dec 2011, obsoleted by RFC 8504)
- RFC 4861 (Neighbor Discovery), RFC 4941/8981 (Privacy Extensions), RFC 5308 (IS-IS for IPv6), RFC 4760/2545 (MP-BGP)
- OMB Memoranda M-05-22 and M-21-07 on federal IPv6 adoption
- Linux kernel IPv6 sysctl documentation (`Documentation/networking/ip-sysctl.rst`)
- `iptables-extensions(8)` man page for the `rpfilter` match
- UNH-IOL IPv6 Consortium — https://www.iol.unh.edu/

## Issues Found
- The post listed RFC 6434 as the "foundation" RFC for USGv6. NIST SP 500-267B Rev 1 (2020) actually normatively references RFC 8504, which obsoleted RFC 6434 in January 2019. Updated the Key Documents list to cite RFC 8504 (noting it obsoletes RFC 6434), and updated the concluding paragraph accordingly. Also clarified "SP 500-267B Rev 1" (the full designation of the 2020 revision) in the key documents list.

## Review Notes
- Linux commands (`dhclient -6`, `ip -6 neigh show`, `ip6tables -m rpfilter --invert`, `use_tempaddr=2`, `/proc/sys/net/ipv6/conf/<iface>/autoconf`) are all syntactically correct and behave as described.
- The compliance shell script correctly uses `awk '{print $3}'` against `sysctl` output of the form `key = value`.
- Quagga is still installable on many distros but has been largely superseded by FRRouting (FRR) — users on recent Ubuntu/Debian/RHEL releases may need `frr` instead of `quagga`. Left as-is since both forms work where available and the example is illustrative.
- The "BGP4+" terminology is a slightly dated colloquial name for MP-BGP (RFC 4760) with the IPv6 address family (RFC 2545). Still widely understood.
- The UNH-IOL URL (`https://www.iol.unh.edu/services/testing/usgv6`) is plausible but UNH-IOL has reorganized its site over time; readers may need to start at `https://www.iol.unh.edu/` if the exact path changes. Left unchanged.
- Privacy Extensions are specified as SHOULD in RFC 8504, but USGv6 elevates them toward required for hosts, so the post's framing is consistent with the profile.
