# Validation Summary: How to Handle IPv6 in GraphQL Federation Gateways

## Status
validated

## Post Type
Guide

## Technologies Covered
- GraphQL
- Apollo Federation
- Apollo Gateway (`@apollo/gateway`)
- IPv6
- Node.js
- Python
- Uvicorn
- Linux networking tools (`ip`, `ping`)
- `curl`
- UFW
- `ip6tables`
- DNS AAAA records
- OneUptime monitoring

## Sources Consulted
- Apollo Gateway API reference: https://www.apollographql.com/docs/federation/v1/api/apollo-gateway
- Apollo Gateway migration guidance: https://www.apollographql.com/docs/graphos/routing/migration/from-gateway
- Node.js `net.Server.listen()` documentation: https://nodejs.org/api/net.html
- Uvicorn settings and socket binding documentation: https://www.uvicorn.org/settings/
- curl tutorial, IPv6 URLs and `--ipv6`: https://curl.se/docs/tutorial.html
- RFC 3986, URI generic syntax for IPv6 literals in hosts: https://datatracker.ietf.org/doc/html/rfc3986
- RFC 2732, bracketed literal IPv6 addresses in URLs: https://datatracker.ietf.org/doc/html/rfc2732
- Linux `ip-address(8)` manual: https://man7.org/linux/man-pages/man8/ip-address.8.html
- Linux `ping(8)` manual: https://man7.org/linux/man-pages/man8/ping.8.html
- Ubuntu firewall documentation for UFW IPv4/IPv6 support: https://documentation.ubuntu.com/server/how-to/security/firewalls/
- OneUptime Website Monitor docs: https://oneuptime.com/docs/monitor/website-monitor
- OneUptime IP Monitor docs: https://oneuptime.com/docs/monitor/ip-monitor
- OneUptime monitoring product page: https://oneuptime.com/product/monitoring
- Local CLI help: `curl --help all`, `ip --help`, `ping6 -h`

## Issues Found
- The post was missing the Apollo Gateway-specific requirement to use valid subgraph URLs when targeting literal IPv6 addresses. I added a current `IntrospectAndCompose` example using bracketed IPv6 literals because URI syntax requires brackets around IPv6 hosts and Apollo Gateway subgraph definitions use URL strings.
- The IPv6 reachability check used `ping6`. I changed it to `ping -6`, which is the current portable form documented by modern Linux `ping(8)` implementations while preserving the same behavior.
- The conclusion implied that binding to `::` and opening firewall ports were the main requirements. I updated it to also mention bracketed IPv6 literals in gateway subgraph URLs, which is required for direct IPv6 endpoint configuration.

## Review Notes
`@apollo/gateway` remains documented and the corrected example is valid, but Apollo's current migration guidance points many production deployments toward Apollo Router instead of long-term gateway expansion. The post is still technically correct for gateway-based deployments.
