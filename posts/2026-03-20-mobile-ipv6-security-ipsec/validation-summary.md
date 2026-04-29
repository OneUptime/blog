# Validation Summary: How to Understand Mobile IPv6 Security with IPsec

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- Mobile IPv6 (MIPv6) — RFC 6275
- IPsec — RFC 3776 (Using IPsec to Protect MIPv6 Signaling)
- ESP (Encapsulating Security Payload) — IP protocol 50
- Mobility Header — IP protocol 135
- Linux kernel IPsec via `ip xfrm`
- strongSwan / IKEv2 (`swanctl.conf` style configuration)
- tcpdump filter syntax
- Binding Update / Binding Acknowledgment messages

## Sources Consulted
- RFC 6275 — Mobility Support in IPv6 (https://datatracker.ietf.org/doc/html/rfc6275)
- RFC 3776 — Using IPsec to Protect Mobile IPv6 Signaling Between Mobile Nodes and Home Agents (https://datatracker.ietf.org/doc/html/rfc3776)
- RFC 4302 / RFC 4303 — IPsec AH and ESP
- IANA Protocol Numbers (verifying IP protocol 50 = ESP, 135 = Mobility Header)
- IANA Mobility Header Type registry (BU = 5, BA = 6)
- strongSwan swanctl.conf documentation (https://docs.strongswan.org/docs/latest/swanctl/swanctlConf.html)
- strongSwan swanctl command documentation (https://docs.strongswan.org/docs/latest/swanctl/swanctl.html)
- iproute2 `ip-xfrm(8)` manual page (selectors, states, policies)
- pcap-filter(7) for tcpdump filter syntax (`ip6 proto N`)

## Issues Found
1. **strongSwan configuration file path was incorrect.** The post placed the connection definition at `/etc/strongswan.d/mip6.conf`. That directory contains `strongswan.conf`-format daemon/plugin settings (hierarchical key-value), not the `connections { ... }` swanctl configuration shown. The connections-format file belongs under `/etc/swanctl/` (typically `/etc/swanctl/swanctl.conf` or, if include directives are configured, `/etc/swanctl/conf.d/*.conf`). Updated the path to `/etc/swanctl/conf.d/mip6.conf` so the example reflects strongSwan's actual configuration layout.

2. **`esp_proposals` included a PRF algorithm (`prfsha384`).** PRF (pseudo-random function) algorithms are part of IKE proposals only — they are not used for ESP, where the SA needs encryption + integrity (or an AEAD cipher) ± optional key exchange / ESN flags. strongSwan documents this distinction explicitly. Changed `esp_proposals = aes256gcm128-prfsha384-ecp384` to `esp_proposals = aes256gcm128-ecp384`. AES-GCM is AEAD so no separate integrity algorithm is needed; `ecp384` retains the optional DH group for PFS rekeying.

## Review Notes
- Protocol numbers and MH type values are correct (ESP = 50, Mobility Header = 135, Binding Update = 5, Binding Acknowledgment = 6).
- The `ip xfrm` syntax, key lengths (256-bit HMAC-SHA256 key = 64 hex chars; 128-bit AES key = 32 hex chars), and selector/template structure are valid for current iproute2.
- The `MN_COA` shell variable is defined but never used in the snippet. Not a technical error, just unused — left as-is to avoid stylistic edits.
- The tcpdump filter `ip6 proto 50` is valid pcap-filter syntax; `esp` would be a more idiomatic alternative but both work.
- The comment "After decryption by kernel, see the inner MH" before `ip xfrm monitor` is slightly misleading — `ip xfrm monitor` reports SA/policy events (ACQUIRE, EXPIRE, etc.), not decrypted packet payloads. Left unchanged because the command itself is correctly described in the inline comment that follows.
- RFC 3776 Policy 3 in the post describes "ESP transport mode on tunnel" (i.e., transport-mode ESP applied to the IPv6-in-IPv6 tunnel between MN CoA and HA), which matches RFC 3776 §3.
