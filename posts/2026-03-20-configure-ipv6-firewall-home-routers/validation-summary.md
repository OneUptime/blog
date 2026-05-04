# Validation Summary: How to Configure IPv6 Firewall on Home Routers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- IPv6
- OpenWrt firewall (UCI / `/etc/config/firewall`, fw4 / nftables)
- ip6tables
- UFW (Uncomplicated Firewall) on Ubuntu/Raspberry Pi
- ICMPv6

## Sources Consulted
- RFC 3849 — IPv6 Address Prefix Reserved for Documentation (defines `2001:db8::/32`)
- RFC 4443 — ICMPv6 specification (valid type/code names)
- RFC 4890 — Recommendations for Filtering ICMPv6 Messages in Firewalls
- OpenWrt firewall configuration documentation: https://openwrt.org/docs/guide-user/firewall/firewall_configuration
- OpenWrt fw4 / nftables migration documentation: https://openwrt.org/docs/guide-user/firewall/fw4_configuration
- Ubuntu UFW manual page and `/etc/default/ufw` documentation
- ip6tables(8) man page (valid ICMPv6 type names)

## Issues Found
- **Invalid IPv6 example addresses (multiple).** Several example addresses contained letters that are not valid hexadecimal digits, so the strings were not syntactically valid IPv6 addresses:
  - `2001:db8:home::10` — `h`, `o`, `m` are not valid hex. Changed to `2001:db8:abcd::10` (still inside the RFC 3849 documentation prefix `2001:db8::/32`).
  - `2001:db8:home::/64` (in the UFW SSH allow rule) — same issue. Changed to `2001:db8:abcd::/64`.
  - `2001:bad:address::1` — `r` and `s` are not valid hex. Changed to `2001:db8:bad::1`.
  - `2001:bad:prefix::/48` (used twice) — `p`, `r`, `i`, `x` are not valid hex. Changed to `2001:db8:bad::/48`.

## Review Notes
- The post states OpenWrt uses `nftables` (fw4) in recent versions, then later uses `ip6tables` commands for inspection and the `/etc/firewall.user` file for persistence. With fw4, `ip6tables` only reflects the legacy `iptables-nft` compatibility layer and will not show the actual fw4 ruleset (use `nft list ruleset` for that), and `/etc/firewall.user` is no longer included by default — the recommended approach on fw4 is the `include` config or files under `/etc/nftables.d/`. This isn't strictly wrong (the `iptables-nft` shim is typically present and the `firewall.user` legacy script can still be wired up), but readers on a fresh fw4 install may find their persistent `ip6tables` rules don't load. Worth a future clarification.
- The OpenWrt default `Allow-ICMPv6-Input` rule typically also rate-limits with `option limit '1000/sec'` — omitted here, which is fine for clarity but is a defensive practice worth recommending.
- The `option icmp_type` value uses a space-separated list rather than the more conventional repeated `list icmp_type 'value'` UCI form. The space-separated form is parsed by fw3/fw4, but the `list` form is the documented OpenWrt convention.
- ICMPv6 type names used (including British spellings `neighbour-solicitation` / `neighbour-advertisement` and parameter-problem subtypes `bad-header` / `unknown-option`) are all valid per `ip6tables` / netfilter naming.
- The `ping6` command is valid but the modern recommendation is `ping -6` (iputils unified the binaries). Not an error.
