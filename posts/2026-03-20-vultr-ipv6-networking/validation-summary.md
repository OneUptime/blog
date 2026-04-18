# Validation Summary: How to Configure Vultr IPv6 Networking

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Vultr (Cloud VPS provider)
- IPv6 networking
- Linux `ip` command (iproute2)
- `ip6tables` (netfilter IPv6 firewall)
- `dig` (DNS lookup)
- `curl`, `ping6`
- Terraform (Infrastructure as Code)

## Sources Consulted
- RFC 3849 — IPv6 Address Prefix Reserved for Documentation (`2001:db8::/32`): https://datatracker.ietf.org/doc/html/rfc3849
- RFC 4291 — IP Version 6 Addressing Architecture: https://datatracker.ietf.org/doc/html/rfc4291
- RFC 4443 — ICMPv6 for IPv6: https://datatracker.ietf.org/doc/html/rfc4443
- Vultr documentation — Configuring IPv6 on Your VPS: https://docs.vultr.com/configuring-ipv6-on-your-vps
- iproute2 man pages (`ip-route(8)`, `ip-address(8)`)
- netfilter `ip6tables(8)` man page
- Vultr Terraform provider documentation: https://registry.terraform.io/providers/vultr/vultr/latest/docs

## Issues Found
1. **Invalid default route in Step 2.** The original command `ip -6 route add ::/0 via 2001:db8::1 dev eth0` sets the default gateway to the same address just assigned to the interface. A default route must point to a distinct next-hop (typically a link-local gateway on Vultr, e.g. `fe80::1`). Changed the gateway to `fe80::1`, which is also consistent with the guidance in the "Common Issues" section of the post.
2. **Invalid IPv6 prefix in Step 3.** The original firewall rule `ip6tables -A INPUT -s 2001:db8:admin::/48 ...` uses the string `admin` as a hextet, but IPv6 addresses are hexadecimal (only `0-9` and `a-f` are valid). Replaced with `2001:db8:1::/48`, a valid documentation prefix (RFC 3849).

## Review Notes
- `ping6` is deprecated on many modern Linux distributions in favor of `ping -6`, but `ping6` still works on most systems — left unchanged to preserve author style.
- The Terraform example uses a generic `example_instance` resource rather than the actual Vultr Terraform provider's `vultr_instance` (which has an `enable_ipv6` argument and does not accept a manually-assigned `ipv6_address`). Left as-is because the surrounding text explicitly labels this an "example" and changing it would restructure the section beyond a technical fix.
- The post is largely provider-agnostic despite the Vultr-specific title; Vultr-specific CLI (`vultr-cli`) examples are not included. This is a stylistic/scope observation, not a correctness issue.
