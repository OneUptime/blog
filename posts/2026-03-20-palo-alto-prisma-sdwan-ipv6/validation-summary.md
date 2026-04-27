# Validation Summary: How to Configure Palo Alto Prisma SD-WAN with IPv6

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Palo Alto Networks Prisma SD-WAN (formerly CloudGenix)
- ION (Instant-On Network) devices
- Prisma SASE platform (Prisma Access, GlobalProtect, ZTNA, SWG)
- Prisma SD-WAN REST API (unified SASE API)
- IPv6 (DHCPv6, Router Advertisements, RDNSS, Split Tunneling)
- Python (requests library)
- ION CLI commands (show interface, show route, ping6, traceroute6, show dhcpv6 bindings)

## Sources Consulted
- [Prisma SD-WAN Instant-On Network (ION) Device Specifications — Palo Alto Networks](https://www.paloaltonetworks.com/resources/datasheets/prisma-sd-wan-instant-on-network-ion-device-specifications)
- [Welcome to Prisma SD-WAN APIs — pan.dev](https://pan.dev/sdwan/docs/)
- [Unified SASE SD-WAN APIs — pan.dev](https://pan.dev/sdwan/api/)
- [Welcome to Prisma SASE — pan.dev](https://pan.dev/sase/docs/)
- [Prisma SASE API Get Started — pan.dev](https://pan.dev/sase/docs/getstarted/)
- [Access Tokens (SASE OAuth2) — pan.dev](https://pan.dev/sase/docs/access-tokens/)
- [Create an access token — pan.dev](https://pan.dev/sase/api/auth/post-auth-v-1-oauth-2-access-token/)
- [Prisma SD-WAN Administrator's Guide — Palo Alto Networks Docs](https://docs.paloaltonetworks.com/prisma-sd-wan/administration)
- RFC 8106 (IPv6 RDNSS option in Router Advertisements)
- RFC 3849 (2001:db8::/32 IPv6 documentation prefix)

## Issues Found

1. **ION acronym expanded incorrectly.** The post originally said ION stands for "Intelligent Orchestrated Network." The official Palo Alto Networks branding (and the CloudGenix-era naming that was retained) is **"Instant-On Network"**, as confirmed in the official ION device datasheet and product SKUs (e.g., PAN-ION-SUB-250M, PAN-VION-7108). Fixed.

2. **OAuth2 authentication endpoint and request format wrong.** The post used `POST {BASE_URL}/auth/v1/generate_token` with a JSON body of `{client_id, client_secret}` and read `token` from the response. The actual Prisma SASE authentication uses the OAuth 2.0 Client Credentials flow against `https://auth.apps.paloaltonetworks.com/am/oauth2/access_token`, with HTTP Basic Auth (Client ID/Secret) and a form-encoded body containing `grant_type=client_credentials` and a `scope=tsg_id:<TSG_ID>`. The response field is `access_token`, not `token`. Replaced the `get_token()` function and added `AUTH_URL` and `TSG_ID` constants.

3. **SD-WAN interface API URL path missing site segment.** The post's `PUT` URL was `/sdwan/v2.1/api/elements/{element_id}/interfaces/{interface_id}`. The unified SASE Prisma SD-WAN element interface endpoints are nested under a site, i.e. `/sdwan/v2.1/api/sites/{site_id}/elements/{element_id}/interfaces/{interface_id}`. Added the missing `sites/{site_id}/` segment and threaded `site_id` through `configure_interface_ipv6()` and the `__main__` invocation.

4. **Invalid IPv6 placeholder in Python `__main__`.** `2001:db8:site-a::1/64` is not a syntactically valid IPv6 address — `site-a` contains non-hex characters, so a strict address parser rejects it. Replaced with `2001:db8:a::1/64`, which is a valid address inside the RFC 3849 documentation prefix. (Left the textual configuration block at the top of the post unchanged since it is clearly an illustrative field-value listing rather than executable input.)

## Review Notes

- The post uses `v2.1` of the Prisma SD-WAN unified API. This version is currently valid (the documented profile call is `GET /sdwan/v2.1/api/profile`), though some endpoints have higher per-resource versions (e.g. `v4.x` for elements/sites/interfaces in newer references). For an introductory tutorial, sticking to a single `v2.1` placeholder is acceptable.
- `ping6` and `traceroute6` are valid on ION's underlying Linux shell; modern Linux distributions also accept `ping -6` / `traceroute -6`. Either form is fine.
- The CLI commands shown (`show interface ipv6`, `show route ipv6`, `show paths`, `show dhcpv6 bindings`) are illustrative of ION local toolbox-style commands. Local SSH access to ION devices is restricted by default and intended for diagnostics; readers should expect to drive most operations through the portal or API.
- API field names in the JSON payload (e.g. `ipv6_config`, `dhcpv6_config`, `ipv6_ra_config`) are illustrative. Readers should consult the live API reference for exact schemas, which may evolve between releases.
- The textual placeholder addresses `2001:db8:site-a::1/64` and `2001:db8:wan::isp-assigned/64` in the first config block are not syntactically valid IPv6 either, but were left as-is because they appear inside a non-code descriptive listing where the intent (a per-site or ISP-assigned prefix) is clear from context.
