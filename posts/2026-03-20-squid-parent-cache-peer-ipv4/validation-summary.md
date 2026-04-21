# Validation Summary: How to Set Up Squid with a Parent Cache Peer Over IPv4

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Squid proxy
- Squid cache hierarchy and parent cache peers
- IPv4 networking
- Squid access control and cache manager
- curl

## Sources Consulted
- Squid `cache_peer` configuration directive: https://www.squid-cache.org/Doc/config/cache_peer/
- Squid cache hierarchy feature documentation: https://wiki.squid-cache.org/Features/CacheHierarchy
- Squid `never_direct` configuration directive: https://www.squid-cache.org/Doc/config/never_direct/
- Squid `prefer_direct` configuration directive: https://www.squid-cache.org/Doc/config/prefer_direct/
- Squid `nonhierarchical_direct` configuration directive: https://www.squid-cache.org/Doc/config/nonhierarchical_direct/
- Squid access log hierarchy codes: https://wiki.squid-cache.org/SquidFaq/SquidLogs
- Squid cache manager documentation: https://wiki.squid-cache.org/Features/CacheManager/Index
- Squid `squidclient` tool documentation: https://wiki.squid-cache.org/Features/CacheManager/SquidClientTool

## Issues Found
- The child configuration comment said to use ICP port `7` for ICP-based cache queries. Squid's examples and hierarchy documentation use the peer's configured ICP port, commonly `3130`, and Squid requires `icp_port`/`icp_access` when using ICP. I changed the comment to avoid recommending the wrong port.
- The fallback comment implied that `prefer_direct off` alone means "use the parent only for cache misses, allow direct for hits." Squid documentation describes `prefer_direct` as a preference for cacheable requests, while `nonhierarchical_direct off` is needed to prefer parents for non-cacheable requests, and `never_direct` is the directive that completely prevents direct connections. I corrected the comment and added the matching commented directive.
- The verification section used `squidclient`, but Squid documentation notes that `squidclient` was removed from Squid 7. I replaced it with the current HTTP cache manager URL using `curl`.
- The access log section grepped for `FIRSTUP_PARENT`, which is not the documented hierarchy code spelling and does not match the shown `default` parent configuration. Squid documents `DEFAULT_PARENT` for a parent selected because it was marked `default`, so I updated the grep command, explanatory text, and key takeaway.

## Review Notes
The main configuration is valid for current stable Squid 7-style deployments. The Squid configuration reference marks these hierarchy directives as unavailable in the future Squid 8 branch, but Squid 8 is documented as still being in development on the reviewed date.
