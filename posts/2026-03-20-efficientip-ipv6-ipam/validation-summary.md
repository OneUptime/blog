# Validation Summary: How to Configure EfficientIP for IPv6 IPAM

## Status
validated

## Post Type
Guide

## Technologies Covered
- EfficientIP SOLIDserver REST API
- IPv6 IPAM
- DHCPv6
- DNS AAAA records
- Python `requests`
- `curl`

## Sources Consulted
- EfficientIP official OpenAPI client overview: https://github.com/EfficientIP-Labs/solidserver-go-client
- EfficientIP IPAM API docs: https://raw.githubusercontent.com/EfficientIP-Labs/solidserver-go-client/main/sdsclient/docs/IpamAPI.md
- EfficientIP DHCP API docs: https://raw.githubusercontent.com/EfficientIP-Labs/solidserver-go-client/main/sdsclient/docs/DhcpAPI.md
- EfficientIP model docs for request/response fields: https://raw.githubusercontent.com/EfficientIP-Labs/solidserver-go-client/main/sdsclient/docs/IpamNetwork6AddInput.md, https://raw.githubusercontent.com/EfficientIP-Labs/solidserver-go-client/main/sdsclient/docs/DhcpScope6AddInput.md, https://raw.githubusercontent.com/EfficientIP-Labs/solidserver-go-client/main/sdsclient/docs/DhcpRange6AddInput.md, https://raw.githubusercontent.com/EfficientIP-Labs/solidserver-go-client/main/sdsclient/docs/DnsRrAddInput.md, https://raw.githubusercontent.com/EfficientIP-Labs/solidserver-go-client/main/sdsclient/docs/IpamAddress6AddInput.md, https://raw.githubusercontent.com/EfficientIP-Labs/solidserver-go-client/main/sdsclient/docs/DataInnerIpamNetwork6Data.md, https://raw.githubusercontent.com/EfficientIP-Labs/solidserver-go-client/main/sdsclient/docs/DataInnerIpamAddress6Data.md
- EfficientIP published OpenAPI schema: https://raw.githubusercontent.com/EfficientIP-Labs/solidserver-go-client/main/sdsclient/api/openapi.yaml
- Requests Quickstart: https://requests.readthedocs.io/en/latest/user/quickstart/
- curl manpage for `-u` / `--user`: https://curl.se/docs/manpage.html#-u
- RFC 3596 for AAAA records: https://datatracker.ietf.org/doc/html/rfc3596
- RFC 3849 for the `2001:db8::/32` documentation prefix: https://datatracker.ietf.org/doc/html/rfc3849

## Issues Found
- The post’s Step 1 did not create a SOLIDserver space. It used an older `/rest/ip6_block6_add` path and block-style fields instead. I changed it to the documented `/api/v2.0/ipam/space/add` call with `space_name` and `space_description`.
- The Python examples used legacy-style `/rest` routes and old field names such as `subnet6_*`, `hostaddr`, `value1`, and uppercase `WHERE` / `ORDERBY`. I updated them to the published `/api/v2.0` routes and current `network6_*`, `address6_*`, `rr_value1`, `where`, and `orderby` names.
- The post modeled IPv6 blocks and subnets through `subnet6_class_name` values like `block` and `vlan`, plus pipe-delimited class parameters. That does not match the documented v2 schema. I replaced it with the documented hierarchy fields `network_level`, `network6_is_terminal`, and `parent_network6_id`.
- The DHCPv6 section used incorrect request field names and a non-documented `dhcp6_failover6_add` operation. I replaced that section with the documented `dhcp/scope6/add` and `dhcp/range6/add` flow and correct `scope6_*` / `range6_*` parameters.
- The DNS AAAA examples omitted the documented DNS server identifier and used outdated parameter names. I changed them to use `server_name`, `zone_name`, full `rr_name` values, `rr_value1`, and integer `rr_ttl`.
- The utilization example read a non-documented `subnet6_utilization` field and iterated the response as if it were a bare list. I updated it to use the documented wrapped response shape and the IPv6 network field `percent_used`.
- The IP assignment section relied on a specific `ip6_find_free_address6` endpoint that is not present in the published v2 OpenAPI schema. I replaced it with a documented free-range query using `ipam/address6/list` and a separate `ipam/address6/add` example.
- The introduction described SOLIDserver using “smart folder-based organization,” which did not match the space-centered API and object model reflected in the official docs. I corrected that phrasing to “space-based organization.”

## Review Notes
- The fixes align the article with the published SOLIDserver API v2.0 interface exposed by EfficientIP’s official OpenAPI client.
- The Python samples still use `verify=False`, which is technically valid but disables TLS certificate verification. A production-oriented version of the article should prefer a trusted CA bundle.
- The documented free-range fields are `free_start_address6_addr` and `free_end_address6_addr`. The official schema documents them as API address fields rather than `hostaddr` convenience fields, so the article now treats them as inspection output instead of direct next-IP allocation input.
