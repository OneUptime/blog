# Validation Summary: How to Chain Squid Proxies Using cache_peer with IPv4 Addresses

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Squid proxy server
- Squid cache hierarchy and parent cache peers
- Squid ACLs and `http_access` rules
- Squid disk and memory cache sizing directives
- Squid cache manager reports
- Squid access logs
- curl

## Sources Consulted
- Squid `cache_peer` configuration directive: https://www.squid-cache.org/Doc/config/cache_peer/
- Squid cache hierarchy documentation: https://wiki.squid-cache.org/Features/CacheHierarchy
- Squid `never_direct` configuration directive: https://www.squid-cache.org/Doc/config/never_direct/
- Squid `http_port` configuration directive: https://www.squid-cache.org/Doc/config/http_port/
- Squid `acl` and `http_access` configuration directives: https://www.squid-cache.org/Doc/config/acl/ and https://www.squid-cache.org/Doc/config/http_access/
- Squid `cache_mem`, `cache_dir`, `maximum_object_size`, and `maximum_object_size_in_memory` directives: https://www.squid-cache.org/Doc/config/cache_mem/, https://www.squid-cache.org/Doc/config/cache_dir/, https://www.squid-cache.org/Doc/config/maximum_object_size/, and https://www.squid-cache.org/Doc/config/maximum_object_size_in_memory/
- Squid cache manager documentation: https://wiki.squid-cache.org/Features/CacheManager/Index
- Squid cache manager menu documentation: https://wiki.squid-cache.org/Features/CacheManager/Menu
- Squid `squidclient` tool documentation: https://wiki.squid-cache.org/Features/CacheManager/SquidClientTool
- Squid access log result and hierarchy code documentation: https://wiki.squid-cache.org/SquidFaq/SquidLogs
- curl official man page for `-x, --proxy`: https://curl.se/docs/manpage.html#-x
- Squid release schedule and Squid 7 announcement: https://wiki.squid-cache.org/ReleaseSchedule and https://lists.squid-cache.org/pipermail/squid-announce/2025-July/000171.html
- Local `curl --help proxy` output for proxy option syntax.

## Issues Found
- The edge tier was described as having a small local cache, but the snippet did not define a `cache_dir`. Squid's default is no disk cache, and `maximum_object_size` applies to cache directory storage rather than the separate memory-object limit. Added a small `ufs` `cache_dir` to the edge tier.
- The upstream tier was described as the largest cache but still relied on Squid's default `maximum_object_size` of 4 MB. Added `maximum_object_size 100 MB` so the largest tier can store larger cacheable objects.
- The test command used `http://example.com/largefile.iso`, which is not a guaranteed existing/cacheable object and could exceed the configured object-size limits. Replaced it with a `TEST_URL` example, noted that it should be cacheable and below the smallest configured object-size limit, and made the log grep literal with `grep -F`.
- The cache manager examples used `squidclient`, but Squid documentation notes that `squidclient` was removed from Squid 7. Replaced those examples with the HTTP cache manager endpoints accessed with `curl`.
- The `mgr:5min | grep -i peer` example was presented as peer byte statistics, but the documented `server_list` report is the cache-manager peer statistics report and `5min` is a general counter report. Updated the monitoring commands accordingly.
- The shown access rules did not safely preserve cache-manager access for monitoring. Added `http_access allow localhost manager` and `http_access deny manager` before the client/peer allow rules on each tier.
- The access-log note described `TCP_MISS` as "forwarded upstream." Squid documents `MISS` as a network response object, with hierarchy codes identifying the exact source. Clarified the wording to "fetched from parent/origin."

## Review Notes
The corrected hierarchy configuration matches current stable Squid 7 documentation. Squid's public docs show Squid 8 as a future/development branch, and the directive pages mark several hierarchy directives as unavailable there. Disk cache directories must exist, be writable by Squid, and are commonly initialized with `squid -z` during first setup. A local `squid -k parse` check was not run because Squid is not installed in this workspace.
