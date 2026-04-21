# Validation Summary: How to Map Squid Incoming IPv4 Ports to Different Outgoing IPv4 Addresses

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Squid forward proxy
- Squid ACLs (`localport`, `src`)
- Squid `tcp_outgoing_address`
- Squid `server_persistent_connections`
- Linux `ip addr`
- `curl`
- `tcpdump`
- IPv4 addressing

## Sources Consulted
- Squid official `tcp_outgoing_address` configuration reference: https://www.squid-cache.org/Doc/config/tcp_outgoing_address/
- Squid official ACL configuration reference: https://www.squid-cache.org/Doc/config/acl/
- Squid official `http_port` configuration reference: https://www.squid-cache.org/Doc/config/http_port/
- Squid official `http_access` configuration reference: https://www.squid-cache.org/Doc/config/http_access/
- Squid official `server_persistent_connections` configuration reference: https://www.squid-cache.org/Doc/config/server_persistent_connections/
- Squid Web Cache wiki command-line documentation for `-k parse` and `-k reconfigure`: https://wiki.squid-cache.org/SquidFaq/InstallingSquid
- RFC 5737, IPv4 Address Blocks Reserved for Documentation: https://datatracker.ietf.org/doc/html/rfc5737
- Local `ip address help` output for `ip addr add` and `ip -4 addr show` syntax
- Live URL checks for the GitHub author profile and `http://ipinfo.io/ip`

## Issues Found
- The post did not mention that Squid's current configuration reference lists `tcp_outgoing_address` for Squid v7 and earlier, and marks it unavailable in Squid v8. I updated the introduction and key takeaway to scope the guidance to Squid v7 and earlier.
- The Squid examples used client/request-dependent ACLs with `tcp_outgoing_address` but did not disable server-side persistent connections. Squid's official documentation warns that client-dependent ACLs are incompatible with server-side persistent connections for this directive. I added `server_persistent_connections off` to both configuration snippets.
- The examples used `203.0.113.0/24` addresses without clarifying that they are documentation placeholders. RFC 5737 reserves that block for examples and says it should not appear on the public Internet. I updated the prerequisites to tell readers to replace those addresses with routable IPv4 addresses assigned to their server.
- The final takeaway described the "last" unqualified `tcp_outgoing_address` line as the default. Squid processes `tcp_outgoing_address` lines in order and stops at the first matching line, so placement is the important detail. I changed the wording to tell readers to put the unqualified fallback after the specific rules.

## Review Notes
The remaining Squid configuration syntax is consistent with the official configuration references. `http_access allow all` is syntactically valid but unsafe for production exposure; the post already warns readers to adjust access control for production. I did not run `squid -k parse` locally because the Squid binary is not installed in this workspace.
