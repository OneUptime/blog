# Validation Summary: How to Build GeoDNS for Global Traffic Routing

## Status
validated

## Post Type
Technical guide / implementation tutorial

## Technologies Covered
- DNS and GeoDNS
- EDNS Client Subnet (ECS)
- AWS Route 53 geolocation routing
- Cloudflare Load Balancing geo steering
- PowerDNS Authoritative Server GeoIP backend
- BIND 9 GeoIP ACLs and views
- Node.js UDP DNS server with dns-packet and maxmind
- Python health checking with asyncio, aiohttp, and maxminddb
- MaxMind GeoLite2 / GeoIP databases

## Sources Consulted
- AWS CLI Route 53 `change-resource-record-sets` documentation: https://docs.aws.amazon.com/cli/latest/reference/route53/change-resource-record-sets.html
- Amazon Route 53 `ResourceRecordSet` API documentation: https://docs.aws.amazon.com/Route53/latest/APIReference/API_ResourceRecordSet.html
- Cloudflare Load Balancers API documentation: https://developers.cloudflare.com/api/resources/load_balancers/
- Cloudflare Load Balancing Geo steering documentation: https://developers.cloudflare.com/load-balancing/understand-basics/traffic-steering/steering-policies/geo-steering/
- PowerDNS Authoritative Server GeoIP backend documentation: https://doc.powerdns.com/authoritative/backends/geoip.html
- ISC Knowledge Base, Using GeoIP with BIND 9: https://kb.isc.org/docs/aa-01149
- BIND 9 configuration reference: https://bind9.readthedocs.io/en/stable/reference.html
- RFC 7871, Client Subnet in DNS Queries: https://datatracker.ietf.org/doc/html/rfc7871
- Google Public DNS ECS guidelines: https://developers.google.com/speed/public-dns/docs/ecs
- dns-packet README/API documentation: https://github.com/mafintosh/dns-packet
- node-maxmind README/API documentation: https://github.com/runk/node-maxmind
- MaxMind GeoIP2 Node.js API documentation: https://github.com/maxmind/GeoIP2-node

## Issues Found
- The ECS explanation said modern resolvers forward the client's subnet. Changed this to "some resolvers" because ECS is not universal and RFC 7871 describes it as an EDNS0 option used by willing recursive resolvers.
- The Cloudflare load balancer API example used `region_pools` without explicitly setting Geo steering. Added `"steering_policy": "geo"` so the example matches Cloudflare's Geo steering behavior.
- The PowerDNS GeoIP YAML used `svc` entries under `records`, put `services` at the wrong level, omitted the required SOA record, used raw IP values instead of typed `a` records, and reversed PowerDNS MMDB placeholder meanings. Updated the snippet to match the documented `records` and `services` structure and corrected `%co` / `%cn` comments.
- The BIND section claimed BIND 9.10+ includes native GeoIP support without qualification. Updated it to note that BIND must be built with GeoIP support, that BIND 9.16+ uses the MaxMind DB API with `--with-maxminddb`, and that older releases used the legacy GeoIP API.
- The Node.js authoritative DNS example set `RECURSION_AVAILABLE`, ignored ECS even though the article later discusses it, and would attempt to answer non-A queries with A-record data. Updated the response flags, added ECS extraction using dns-packet's `CLIENT_SUBNET` option shape, and limited the example resolver to A queries.
- The Node.js resolver tried continent-specific records before country-specific records, which made the more specific country mappings secondary. Reversed the order so country mappings take precedence and continent mappings are the fallback.
- The standalone ECS helper checked numeric option code `8`, while dns-packet decodes supported ECS options as `CLIENT_SUBNET`. Updated it to use the documented symbolic code.
- The Python example labelled `1.1.1.1` as an APAC client. Replaced it with `202.12.27.33` and adjusted comments so the examples do not imply anycast public resolver IPs are the end-user's location.

## Review Notes
The provider examples are illustrative and still assume prerequisite resources such as Route 53 hosted zones and Cloudflare load balancer pools already exist. The Python health-check sketch is technically coherent for a blog example, but a production implementation should reuse `aiohttp.ClientSession` instances rather than creating a new session for every probe.
