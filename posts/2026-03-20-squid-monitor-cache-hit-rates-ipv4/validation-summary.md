# Validation Summary: How to Monitor Squid Cache Hit Rates for IPv4 Traffic

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Squid proxy cache
- Squid Cache Manager HTTP API
- squidclient
- cachemgr.cgi
- Squid access.log and logformat configuration
- Bash, curl, awk, grep, tail, watch

## Sources Consulted
- Squid Cache Manager documentation: https://wiki.squid-cache.org/Features/CacheManager/Index
- Squid squidclient tool documentation: https://wiki.squid-cache.org/Features/CacheManager/SquidClientTool
- Squid cache manager info report documentation: https://wiki.squid-cache.org/Features/CacheManager/Info
- Squid cachemgr.cgi documentation: https://wiki.squid-cache.org/Features/CacheManager/CacheManagerCgi
- Squid log files and result codes documentation: https://wiki.squid-cache.org/SquidFaq/SquidLogs#squid-result-codes
- Squid logformat directive reference: https://www.squid-cache.org/Doc/config/logformat/
- Squid access_log directive reference: https://www.squid-cache.org/Doc/config/access_log/
- Squid 7.1 release announcement: https://ml-archives.squid-cache.org/squid-announce/2025-July/000171.html

## Issues Found
- The post relied on `squidclient` as the primary cache-manager tool. Squid 7 removed `squidclient`, so I added current HTTP/curl cache-manager commands and kept `squidclient` as a Squid 6-and-older option.
- The sample `mgr:info` output labeled memory and disk hits as percentages of all requests. Squid's `info` report labels them as percentages of hit requests, so I corrected those labels.
- The access-log examples claimed IPv4 traffic but counted all client addresses. I added an IPv4 client-address filter and changed `tail -1000` to the current `tail -n 1000` form.
- The result-code table described `TCP_HIT` as disk-only. Squid defines `HIT` as a local cache object and uses `MEM` for memory-cache hits, so I changed the description to local cache.
- The result-code table used the obsolete `TCP_REFRESH_HIT` code. I replaced it with current `TCP_REFRESH_UNMODIFIED` terminology.
- The `cachemgr.cgi` section did not mention that Squid 7 removed `cachemgr.cgi`. I added the version caveat and changed the live polling example to use curl against `/squid-internal-mgr/info`.
- The logging snippet redefined the built-in `combined` logformat name and used the older `access_log` style. I changed it to a custom `squid_hits` format and the current `access_log ... logformat=` syntax.
- The shell dashboard extracted both the 5-minute and 60-minute percentages from the first matching line. I narrowed the grep expression so it extracts only the 5-minute hit-rate value.

## Review Notes
The cache manager `info` report provides overall Squid hit rates, not IPv4-only metrics. The post now distinguishes those overall real-time metrics from IPv4-filtered access-log analysis.
