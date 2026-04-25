# Validation Summary: How to Plan Disaster Recovery for IPv6 Networks

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 addressing and subnet planning
- Unique Local IPv6 Unicast Addresses (ULA)
- DNS AAAA records
- Cloudflare DNS API
- Cloudflare Load Balancing and Health Checks
- Amazon Route 53 health checks and DNS failover
- FRRouting (FRR) BGP configuration
- Bash scripting
- Netcat (`nc`)

## Sources Consulted
- IETF RFC 4291, *IP Version 6 Addressing Architecture*: https://datatracker.ietf.org/doc/rfc4291/
- IETF RFC 3849, *IPv6 Address Prefix Reserved for Documentation*: https://www.ietf.org/rfc/rfc3849.txt
- IETF RFC 4193, *Unique Local IPv6 Unicast Addresses*: https://datatracker.ietf.org/doc/html/rfc4193
- FRRouting BGP documentation: https://docs.frrouting.org/en/latest/bgp.html
- Cloudflare DNS API documentation: https://developers.cloudflare.com/api/resources/dns/
- Cloudflare Health Checks documentation: https://developers.cloudflare.com/health-checks/
- Cloudflare Load Balancing DNS records documentation: https://developers.cloudflare.com/load-balancing/load-balancers/dns-records/
- Amazon Route 53 health-check record selection: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/health-checks-how-route-53-chooses-records.html
- Amazon Route 53 health check configuration values: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/health-checks-creating-values.html
- Local `nc -h` output on the current system to confirm `-6` and `-w` flag usage

## Issues Found
- The post used invalid IPv6 example literals such as `2001:db8:primary::/48` and `2001:db8:dr::/48`. IPv6 text notation uses hexadecimal hextets, so those examples were replaced with valid documentation prefixes under `2001:db8::/32`.
- The introductory explanation implied that IPv6 internally uses global unicast addresses, with ULA mentioned parenthetically. This was adjusted to reflect that global unicast is common but ULA is also a valid deployment option.
- The DNS example showed multiple AAAA records for `webapp`, but the Cloudflare automation example updated only a single record. The DNS example was made consistent with the automation example by using a single AAAA record.
- The DNS failover bullet list referred to Cloudflare Health Checks as if they directly provided DNS failover. This was corrected to Cloudflare Load Balancing with Health Checks, which is the product that actually steers DNS responses based on origin health.
- The Cloudflare API example used a full-record update flow that did not match the current documentation as closely as a partial update. The example was updated to use `PATCH`, which aligns with the current Cloudflare DNS API docs for updating part of a record.
- The FRR BGP snippet had malformed configuration: an invalid IPv6 neighbor literal, incorrect peer-group syntax, and an imprecise preference comment. The snippet was rewritten to use valid FRR peer-group syntax, a valid documentation IPv6 peer address, and a clearer backup-path example using MED.
- The DR test script split service definitions on `:`, which breaks when the address field itself is IPv6. This was corrected by switching the record delimiter to `|`, allowing the Bash `read` command to parse `name`, `addr`, and `port` correctly.

## Review Notes
- The RTO values are planning targets, not protocol guarantees. Actual failover timing still depends on resolver caching behavior, routing policy, BGP convergence, and application readiness at the DR site.
