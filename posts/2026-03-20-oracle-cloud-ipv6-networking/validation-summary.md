# Validation Summary: How to Configure Oracle Cloud Infrastructure IPv6

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Oracle Cloud Infrastructure (OCI)
- OCI Virtual Cloud Network (VCN) and Subnets
- IPv6 networking
- Linux `iproute2` (`ip -6`) command
- `ip6tables` (Linux IPv6 firewall)
- DNS (AAAA records, reverse DNS via `dig`)
- `curl` and `ping6`
- Terraform (Oracle OCI provider — `oci_core_vcn`, `oci_core_subnet`)

## Sources Consulted
- [Terraform OCI provider — `oci_core_vcn`](https://registry.terraform.io/providers/oracle/oci/latest/docs/resources/core_vcn) (verified `is_ipv6enabled` and `ipv6cidr_blocks` attribute names)
- [Terraform OCI provider — `oci_core_subnet`](https://registry.terraform.io/providers/oracle/oci/latest/docs/resources/core_subnet) (verified `ipv6cidr_block` singular attribute)
- [Oracle docs — OCI Terraform provider `core_vcn`](https://docs.oracle.com/en-us/iaas/tools/terraform-provider-oci/latest/docs/r/core_vcn.html)
- [RFC 3849 — IPv6 Address Prefix Reserved for Documentation](https://datatracker.ietf.org/doc/html/rfc3849) (`2001:db8::/32` is the documentation range; addresses must be valid hex)
- [RFC 4291 — IP Version 6 Addressing Architecture](https://datatracker.ietf.org/doc/html/rfc4291) (link-local `fe80::/10` for default gateways)
- `man ip-route(8)` and `man ip6tables(8)` (syntax for the Linux commands)

## Issues Found
1. **Invalid IPv6 literal in `ip6tables` rule.** The original SSH-allow rule used `2001:db8:admin::/48`. The label `admin` contains characters (`m`, `i`, `n`) that are not valid hexadecimal, so this is not a syntactically valid IPv6 address and would be rejected by `ip6tables`. Replaced with `2001:db8:1::/48`, which is a valid prefix inside the documentation range (`2001:db8::/32`, RFC 3849).

2. **Static-route example pointed the default route at the host's own address.** The original Step 2 added `2001:db8::1/64` to `eth0` and then created a default route `via 2001:db8::1` — i.e., a route through the local interface address rather than a gateway. Changed the host address to `2001:db8::2/64` and the default-route next hop to `fe80::1`, which matches the link-local gateway pattern shown in the post's own "Common Issues" section and is consistent with how OCI / typical cloud IPv6 default gateways are presented.

3. **Unreachable test target for `ping6`.** The original Step 5 used `ping6 -c 3 2600::`, which is the all-zeros host inside the `2600::/8` ARIN allocation and is not a routable, responsive host. Replaced with `2606:4700:4700::1111` (Cloudflare's public IPv6 resolver), which is a real anycast target appropriate for outbound IPv6 connectivity testing.

## Review Notes
- The Terraform snippet was verified against the current Oracle OCI provider docs: `is_ipv6enabled`, `ipv6cidr_blocks` (computed list, plural, on the VCN) and `ipv6cidr_block` (singular, on the subnet) are the correct attribute names. `cidr_blocks` (list) on `oci_core_vcn` is also valid in current versions of the provider; older code may use the deprecated singular `cidr_block`.
- `ip6tables -m state --state ESTABLISHED,RELATED` still works but the more modern equivalent on current distributions is `-m conntrack --ctstate ESTABLISHED,RELATED`. Left as-is to match the author's style; both forms are functionally correct.
- `ping6` is deprecated on many modern Linux distributions in favor of `ping -6 <host>` from iputils, though `ping6` is still shipped as a wrapper on most systems. Left as-is for clarity.
- Step 1 ("Enable IPv6 on the Instance/Resource") is a placeholder `echo` rather than concrete OCI CLI / console steps. Not technically incorrect, but a future revision could include the real `oci network vcn update --is-ipv6-enabled true ...` invocation or console steps for completeness.
