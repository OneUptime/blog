# Validation Summary: Why IPv6 Doesn't Need NAT at Home

## Status
validated

## Post Type
Tutorial / Explainer guide

## Technologies Covered
- IPv6 addressing (global /56, /64, documentation prefix 2001:db8::/32)
- IPv4 NAT and its limitations
- ULA (Unique Local Addresses, RFC 4193, fc00::/7 / fd00::/8)
- nftables (Linux stateful firewall)
- OpenWrt `/etc/config/network` UCI configuration
- Python `http.server` module (`--bind` flag, IPv6 support)
- ICMPv6

## Sources Consulted
- RFC 4193 — Unique Local IPv6 Unicast Addresses
- RFC 3849 — IPv6 Address Prefix Reserved for Documentation (2001:db8::/32)
- RFC 6177 — IPv6 Home Site Addressing Assignment (/56 recommendation)
- RFC 6092 — Recommended Simple Security Capabilities in CPE
- RFC 4864 — Local Network Protection for IPv6 (NAT vs. stateful firewall equivalence)
- OpenWrt IPv6 configuration docs: https://openwrt.org/docs/guide-user/network/ipv6/configuration
- OpenWrt UCI network docs: https://openwrt.org/docs/guide-user/base-system/basic-networking
- nftables wiki: https://wiki.nftables.org/
- Python 3 `http.server` documentation: https://docs.python.org/3/library/http.server.html

## Issues Found

1. **OpenWrt ULA configuration was incorrect.** The original snippet used `option ip6class 'local'` on the LAN interface with a comment claiming ULA would be distributed "alongside global." Per OpenWrt docs, `ip6class 'local'` actually **restricts** the interface to accept only the ULA prefix class, suppressing the WAN-delegated global prefix on LAN — the opposite of what the comment described. The correct pattern is to define `option ula_prefix` under `config globals 'globals'` and omit `ip6class` on the interface so both global and ULA prefixes are accepted. Replaced the snippet with the standard OpenWrt pattern using `config globals 'globals' / option ula_prefix` plus the existing `ip6assign '64'` and `ip6ifaceid '::1'` lines.

## Review Notes

- IPv6 arithmetic checks out: 2^128 ≈ 3.4 × 10^38 ("340 undecillion"), /56 → 2^8 = 256 /64 networks, /64 → 2^64 ≈ 1.8 × 10^19 ("18 quintillion").
- The example IPv6 addresses use non-hex labels like `home`, `server`, `laptop`, `media-server` (e.g., `2001:db8:home:1::server`). These are not valid IPv6 hex digits but are used pedagogically as self-documenting placeholders. The 2001:db8::/32 documentation prefix is otherwise used correctly. A reader should understand these are labels to be replaced with real hex values; the author's intent is clear from context.
- The nftables snippet is syntactically valid. The final `ip6 nexthdr icmpv6 accept` rule is effectively dead code for new inbound ICMPv6 because the preceding `iif "eth0" oif "br-lan" ct state new drop` rule catches it first; related ICMPv6 (e.g., Packet Too Big for Path MTU Discovery) is still accepted via the `ct state established,related accept` rule, so this is a stylistic redundancy rather than a functional bug. Note also that `ip6 nexthdr icmpv6` does not match ICMPv6 behind IPv6 extension headers; `meta l4proto icmpv6` is more robust in modern nftables but both are accepted.
- The Python ULA-generation one-liner is correct: `random.getrandbits(40)` split into 8+16+16 bit fields produces a valid `fdXX:XXXX:XXXX::/48` prefix per RFC 4193. The `struct` import is unused but harmless (dead code — not a correctness issue).
- `python3 -m http.server --bind 2001:db8:... 8080` is valid syntax; the `--bind` flag has accepted IPv6 addresses since Python 3.4, and bracket-less form is correct for a CLI argument (brackets only needed when the address appears in a URL, as shown in the subsequent comment).
- The RFC 4864 framing ("NAT security is a side effect of connection tracking, not translation") is accurate and is the widely accepted guidance for replacing NAT security with a stateful firewall in IPv6 deployments.
- ULA range notation is consistent: the post correctly identifies `fc00::/7` as the full ULA block and `fd00::/8` as the portion used in practice (since `fc00::/8` has the `L` bit unset and is reserved for future centrally-assigned use).
