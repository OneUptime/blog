# Validation Summary: How to Configure Multi-Cloud IPv6 Networking

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- IPv6 networking (RFC 4291, RFC 8200)
- Linux `iproute2` (`ip -6` commands)
- `ip6tables` firewall
- DNS AAAA / PTR records (`dig`)
- `curl` and `ping6` for connectivity testing
- Terraform (illustrative example)
- Multi-cloud context: AWS, Azure, GCP

## Sources Consulted
- RFC 3849 — IPv6 Address Prefix Reserved for Documentation (`2001:db8::/32`): https://datatracker.ietf.org/doc/html/rfc3849
- RFC 4291 — IP Version 6 Addressing Architecture (hexadecimal-only address syntax, link-local `fe80::/10`): https://datatracker.ietf.org/doc/html/rfc4291
- iproute2 `ip-route(8)` and `ip-address(8)` man pages
- ip6tables(8) man page
- `dig(1)` man page (`-x` for reverse lookup)
- `curl(1)` (bracketed IPv6 literals in URLs per RFC 3986)

## Issues Found
1. **Invalid IPv6 literal `2001:db8:admin::/48`** — IPv6 address fields are hexadecimal (0-9, a-f) per RFC 4291, so `m`, `i`, and `n` are not valid characters. Replaced with `2001:db8:abcd::/48`, which is a valid documentation-prefix subnet that preserves the example's intent.
2. **Default route gateway equal to the host's own address** — The static-assignment example added `2001:db8::1/64` to `eth0` and then set the default route via `2001:db8::1`, i.e. the host's own address. This wouldn't establish a usable next hop. Changed the gateway to a link-local address (`fe80::1`), matching standard IPv6 default-route practice and the pattern the post itself recommends in the Common Issues section.

## Review Notes
- `ping6 -c 3 2600::` is a placeholder-style target (`2600::` is the all-zeros host of the 2600::/12 RIR allocation and won't actually respond). It is syntactically valid but readers should substitute a real reachable address (e.g., `2606:4700:4700::1111` for Cloudflare or `2001:4860:4860::8888` for Google) for a meaningful test. Left as-is to preserve the author's intent.
- `ip6tables -m state --state ESTABLISHED,RELATED` works but is the legacy `state` match; the modern equivalent is `-m conntrack --ctstate ESTABLISHED,RELATED`. Both are still supported.
- The Terraform snippet is intentionally generic (`example_instance`) and is illustrative rather than runnable; provider-specific resources (`aws_instance`, `azurerm_network_interface`, `google_compute_instance`) would be needed for a real multi-cloud deployment.
- Setting `ip6tables -P INPUT DROP` after the rules above is fine but readers should ensure they do not lose remote access — a rule for loopback (`-A INPUT -i lo -j ACCEPT`) is generally also recommended.
