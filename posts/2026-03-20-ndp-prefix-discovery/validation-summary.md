# Validation Summary: How to Understand Prefix Discovery in NDP

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- IPv6 Neighbor Discovery Protocol (NDP)
- Prefix Discovery and the host Prefix List
- Stateless Address Autoconfiguration (SLAAC)
- Router Advertisements (RA) and Prefix Information options
- iproute2 (`ip -6 route`, `ip -6 addr`)
- tcpdump (ICMPv6 capture filter)
- radvd (Router Advertisement Daemon) configuration
- Python `ipaddress` module

## Sources Consulted
- RFC 4861 — Neighbor Discovery for IP version 6 (IPv6): https://www.rfc-editor.org/rfc/rfc4861
- RFC 4862 — IPv6 Stateless Address Autoconfiguration: https://www.rfc-editor.org/rfc/rfc4862 (especially Section 5.5.3, the "2-hour rule" for Valid Lifetime)
- Linux kernel commit introducing `RTPROT_RA` (kernel 4.18, 2018) for routes installed from Router Advertisements
- iproute2 `ip-route(8)` man page — protocol identifiers including `ra`
- radvd configuration reference: https://www.litech.org/radvd/man/radvd.conf.5.html (AdvSendAdvert, MaxRtrAdvInterval, AdvOnLink, AdvAutonomous, AdvValidLifetime, AdvPreferredLifetime defaults)
- tcpdump ICMPv6 type filter convention (`ip6[40] == 134` selects RA when no extension headers are present)
- Python `ipaddress` module documentation — `IPv6Network.__contains__` returns False for cross-version address membership tests

## Issues Found

1. **Incorrect route protocol label for RA-installed routes.** The "Prefix List Maintenance" section claimed that on-link routes added by NDP from RA Prefix Information appear with `proto kernel` (e.g. `2001:db8::/64 dev eth0 proto kernel metric 256 expires 2591900sec`) and suggested filtering with `ip -6 route show | grep "kernel"`. Since Linux 4.18 (commit introducing `RTPROT_RA`, 2018), routes installed by the kernel from Router Advertisements are labeled `proto ra`, not `proto kernel`. `proto kernel` is reserved for routes the kernel installs autonomously (e.g. link-local `fe80::/64`). The post was already inconsistent — it correctly used `ip -6 route show proto ra` immediately above the incorrect `grep "kernel"` block. Updated the example output to `proto ra metric 100 expires 2591900sec` and the grep filter to `grep "proto ra"`, with a note that this applies to kernel >= 4.18.

## Review Notes

- The tcpdump filter `"icmp6 and ip6[40] == 134"` is correct for typical RA traffic but assumes no IPv6 extension headers between the IPv6 fixed header and ICMPv6 (which is the standard case for NDP).
- The Python simulation passes `"8.8.8.8"` (an IPv4 literal, not an IPv4-mapped IPv6 address like `::ffff:8.8.8.8`) and labels it "IPv4 mapped/different". This is loose terminology but the demonstration is functionally correct: `ipaddress.IPv6Network.__contains__` returns False for an `IPv4Address` argument (cross-version comparisons return False rather than raising), so the address is correctly classified as off-link without triggering the exception handler.
- The conclusion's advice to "Always set Valid Lifetime to at least 2 hours during renumbering" is a reasonable rule of thumb. The underlying mechanism is RFC 4862 §5.5.3's "2-hour rule": a host receiving an RA that would reduce a prefix's remaining Valid Lifetime below 2 hours must clamp the reduction (unless the RA is authenticated). So while a router can advertise a smaller value, hosts will typically not honor reductions below 2 hours — the post's advice aligns with the practical effect.
- The radvd configuration uses standard directives with their canonical default-style values (`AdvValidLifetime 2592000`, `AdvPreferredLifetime 604800`); syntax (block terminators, semicolons) is correct.
- The metric value in the example output (`metric 100`) is representative of what NetworkManager and similar managers install for `proto ra` routes; some configurations (e.g. systemd-networkd defaults) use `1024`. Either is plausible.
