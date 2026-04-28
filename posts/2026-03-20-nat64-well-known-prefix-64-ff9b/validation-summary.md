# Validation Summary: How to Understand the NAT64 Well-Known Prefix (64:ff9b::/96)

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- IPv6 / IPv4 transition mechanisms
- NAT64 (RFC 6146)
- DNS64 (RFC 6147)
- RFC 6052 (IPv4-Embedded IPv6 Address Format / Well-Known Prefix)
- Python `ipaddress` standard library module
- Jool (stateful NAT64 implementation for Linux)
- BIND / Unbound DNS resolvers
- `ip6tables` netfilter firewall
- `dig`, `ping6` CLI utilities

## Sources Consulted
- RFC 6052 — IPv6 Addressing of IPv4/IPv6 Translators (https://www.rfc-editor.org/rfc/rfc6052)
- RFC 6146 — Stateful NAT64 (https://www.rfc-editor.org/rfc/rfc6146)
- RFC 6147 — DNS64 (https://www.rfc-editor.org/rfc/rfc6147)
- RFC 7050 — Discovery of the IPv6 Prefix Used for IPv6 Address Synthesis
- Python `ipaddress` module documentation (https://docs.python.org/3/library/ipaddress.html)
- Jool documentation (https://nicmx.github.io/Jool/en/documentation.html) — instance/pool4 CLI syntax
- Debian package metadata for `jool-tools` / `jool-dkms`
- `iptables`/`ip6tables` man pages

## Issues Found
- **"Binary: 0x5DB8D822"** — `0x5DB8D822` is hexadecimal notation, not binary. Changed the label from "Binary" to "Hex" to accurately describe the value being shown alongside the IPv4 dotted-decimal form.

## Review Notes
- Verified the IPv4-to-WKP embedding manually and by running the Python code: `93.184.216.34` → `64:ff9b::5db8:d822` and `8.8.8.8` → `64:ff9b::808:808`, both round-trip correctly. The Python code is syntactically valid and uses current `ipaddress` APIs.
- The Jool CLI syntax (`jool instance add`, `jool pool4 add --tcp/--udp/--icmp <prefix> <port-range>`, `instance display`, `session display --tcp`) matches the modern Jool 4.x command set.
- On Debian/Ubuntu, a fully working Jool install typically also requires the kernel module package (`jool-dkms`) in addition to `jool-tools`. The post's `apt-get install jool-tools` followed by `modprobe jool` will only succeed where the kernel module is already provided (e.g., via `jool-dkms` or a pre-built module). This is a minor caveat rather than an error and was left as written.
- `ping6` is deprecated on many modern Linux distributions in favor of `ping -6`, but `ping6` is still widely available via the `iputils-ping` package and works as shown.
- The IPv4 `93.184.216.34` was historically the address for `example.com` and is still commonly used in documentation; the post uses it as a self-contained illustrative example, so its current authoritative status is not material to the demonstration.
- The `dig AAAA example.com @[::1]` form with bracketed IPv6 server is accepted by recent BIND `dig` releases; the unbracketed `@::1` is also valid.
- The recommendation to filter `64:ff9b::/96` at organizational boundaries aligns with RFC 6052 §3.1 ("the Well-Known Prefix MUST NOT appear in non-NAT64 IPv6 packets" / not usable across organizational boundaries).
