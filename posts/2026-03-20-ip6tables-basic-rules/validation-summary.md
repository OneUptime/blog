# Validation Summary: How to Configure ip6tables Basic Rules for IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- `ip6tables`
- Linux netfilter
- IPv6
- ICMPv6
- Neighbor Discovery Protocol (NDP)

## Sources Consulted
- `ip6tables(8)` and `iptables(8)` local man pages from `iptables 1.8.10` on the review host
- `iptables-extensions(8)` local man page from `iptables 1.8.10` on the review host
- RFC 4861, Neighbor Discovery for IP version 6 (IPv6): https://www.rfc-editor.org/rfc/rfc4861
- RFC 4890, Recommendations for Filtering ICMPv6 Messages in Firewalls: https://datatracker.ietf.org/doc/html/rfc4890
- Linux man-pages mirror for `ip6tables`/`iptables`: https://man7.org/linux/man-pages/man8/ip6tables.8.html
- Linux man-pages mirror for `iptables-extensions`: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html

## Issues Found
- The overview described `ip6tables` as the kernel framework itself and listed only a partial set of tables. I corrected this to describe `ip6tables` as the userspace command and updated the table list to match current documented netfilter tables.
- The comparison table said IPv6 NAT support was limited and implied MASQUERADE was unavailable. Current `iptables` documentation states IPv6 NAT support is available since Linux kernel 3.7, so that row was updated.
- The comparison table implied `/etc/iptables/rules.v6` is the universal config file location. That path is distro-dependent, so the post now labels saved-rules paths as distro conventions rather than fixed `ip6tables` defaults.
- The rule-syntax snippet was oversimplified and mixed commands that do not share one syntax form. I replaced it with forms aligned with the current `ip6tables -h` synopsis.
- The established-connection example used the older `state` match alongside `conntrack`. I kept the section on the current `conntrack` form for the main guidance.
- The ICMPv6/NDP section incorrectly restricted Router Solicitations, Neighbor Solicitations, and Neighbor Advertisements to `fe80::/10` sources. Per RFC 4861, those messages can legitimately use unspecified or other assigned source addresses, so the rules were corrected.
- The SSH example used `fd00:mgmt::/48`, which is not a valid IPv6 prefix because `mgmt` is not hexadecimal. I replaced it with a valid example ULA prefix.
- The complete firewall example said `ip6tables -F` and `-X` flush all chains, but without `-t` those commands apply to the default filter table. I corrected the comments and updated the ICMPv6 rules in the example to match the fixed guidance above.
- The summary treated `/etc/iptables/rules.v6` as the default save/restore location. I changed it to a generic filename and noted that `/etc/iptables/rules.v6` is only a common distribution convention.

## Review Notes
`ip6tables` remains valid, but on many modern Linux systems it is provided by the nftables-backed `iptables-nft` compatibility layer. The commands in the post are still correct for that interface, but future revisions could mention nftables as the newer native frontend.
