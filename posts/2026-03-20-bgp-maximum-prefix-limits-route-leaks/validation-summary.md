# Validation Summary: How to Set Up BGP Maximum-Prefix Limits to Prevent Route Leaks

## Status
validated

## Post Type
Guide

## Technologies Covered
- Border Gateway Protocol (BGP)
- Cisco IOS / IOS XE BGP configuration
- Maximum-prefix protection
- Route leak mitigation

## Sources Consulted
- Cisco IOS IP Routing: BGP Command Reference, `neighbor maximum-prefix`: https://www.cisco.com/c/en/us/td/docs/ios/iproute_bgp/command/reference/irg_book/irg_bgp3.html
- Cisco IOS XE 17.x IP Routing Configuration Guide, `BGP Maximum-Prefix on IOS XE`: https://www.cisco.com/c/en/us/td/docs/routers/ios/config/17-x/ip-routing/b-ip-routing/m_irg-max-prefix.html
- Cisco Support, `Configure the BGP Maximum-Prefix Feature`: https://www.cisco.com/c/en/us/support/docs/ip/border-gateway-protocol-bgp/25160-bgp-maximum-prefix.html
- RFC 7908, `Problem Definition and Classification of BGP Route Leaks`: https://www.rfc-editor.org/rfc/rfc7908.html
- Potaroo BGP Table Data, current IPv4 table counts as of 2026-05-06: https://bgp.potaroo.net/index-bgp.html

## Issues Found
- The post used outdated full-table sizing guidance (`900000` / `950,000` / `1,000,000`) that is too low for 2026. I updated the example and recommendation to `1,300,000` and aligned the sample received-prefix count with current May 6, 2026 Internet table data.
- The monitoring example showed `820000` received prefixes while the text recommended keeping limits about 25% above expected counts. I updated the sample `PfxRcd` value to `1052261` and changed the text to `20-25%` so the guidance and example are consistent.
- The syslog example did not match Cisco's documented message format. I corrected it to use `%BGP-4-MAXPFX` and `%BGP-3-MAXPFXEXCEED` with the documented field structure.
- The address-family example omitted `neighbor ... activate`, which is normally required in the address-family model for the neighbor to participate in that AF. I added the activation line.

## Review Notes
- `maximum-prefix` is effectively applied per neighbor and per address family in modern IOS XE deployments, so operational limits should be sized separately for IPv4 unicast, IPv6 unicast, and any other enabled AFs.
- Full-table counts are operational data, not fixed values. The `1,300,000` recommendation is reasonable on 2026-05-06, but should be revisited periodically as the global table grows.
