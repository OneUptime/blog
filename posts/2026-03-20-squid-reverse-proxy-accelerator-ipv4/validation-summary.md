# Validation Summary: How to Set Up Squid Reverse Proxy (Accelerator) on IPv4

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Squid reverse proxy / accelerator mode
- Squid `http_port`, `https_port`, `cache_peer`, ACL, cache, and `refresh_pattern` configuration
- IPv4 reverse proxy listener configuration
- HTTP caching and cache manager monitoring
- `curl`, `tail`, `awk`, and access log inspection

## Sources Consulted
- Squid `http_port` configuration reference: https://www.squid-cache.org/Doc/config/http_port/
- Squid `https_port` configuration reference: https://www.squid-cache.org/Doc/config/https_port/
- Squid `cache_peer` configuration reference: https://www.squid-cache.org/Doc/config/cache_peer/
- Squid `cache_peer_access` configuration reference: https://www.squid-cache.org/Doc/config/cache_peer_access/
- Squid `never_direct` configuration reference: https://www.squid-cache.org/Doc/config/never_direct/
- Squid `cache`, `acl`, and `refresh_pattern` configuration references: https://www.squid-cache.org/Doc/config/cache/, https://www.squid-cache.org/Doc/config/acl/, https://www.squid-cache.org/Doc/config/refresh_pattern/
- Squid `http_access`, `cache_mem`, `maximum_object_size`, and `cache_dir` configuration references: https://www.squid-cache.org/Doc/config/http_access/, https://www.squid-cache.org/Doc/config/cache_mem/, https://www.squid-cache.org/Doc/config/maximum_object_size/, https://www.squid-cache.org/Doc/config/cache_dir/
- Squid basic reverse proxy configuration example: https://wiki.squid-cache.org/ConfigExamples/Reverse/BasicAccelerator
- Squid cache manager and `squidclient` documentation: https://wiki.squid-cache.org/Features/CacheManager/Index and https://wiki.squid-cache.org/Features/CacheManager/SquidClientTool

## Issues Found
- The HTTPS listener used legacy `cert=` and `key=` options. Updated it to current `tls-cert=` and `tls-key=` syntax and clarified that Squid must be built with TLS support.
- The single-site accelerator example omitted `no-vhost` and site-scoped access controls. Added `no-vhost`, an `our_site` ACL, `cache_peer_access` rules, manager denial rules, and a final `http_access deny all` to match the official reverse-proxy pattern.
- The load-balancing example claimed round-robin behavior but did not configure Squid's `round-robin` peer selection option. Added `round-robin` to each backend `cache_peer`.
- The caching policy comment said authenticated requests were not cached, but no ACL matched authentication headers. Added an `Authorization` request-header ACL and deny rule, and placed deny rules before the static-asset allow rule.
- The `refresh_pattern` section claimed to override origin TTLs. Reworded it to describe Squid's documented heuristic freshness behavior and changed the example to match client-facing static asset URLs instead of backend IP URLs.
- The testing commands used the public IPv4 address without a `Host` header. Added `Host: www.example.com` so the requests exercise the intended accelerator site.
- The monitoring example used `squidclient mgr:info`, but Squid documentation marks `squidclient` as removed from Squid 7 and recommends HTTP cache manager access. Replaced it with a `curl` request to `/squid-internal-mgr/info`.

## Review Notes
The configuration is accurate for current Squid v5-v7 style directives. Squid's documentation marks many of these directives as unavailable in v8, so the post should be revisited if it is updated for Squid v8. A local `squid` binary was not available in this environment, so validation was performed against official documentation rather than with `squid -k parse`.
