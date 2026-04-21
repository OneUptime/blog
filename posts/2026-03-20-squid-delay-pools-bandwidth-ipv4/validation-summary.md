# Validation Summary: How to Set Up Squid Delay Pools for Bandwidth Limiting by IPv4 Address

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Squid Web Proxy Cache
- Squid delay pools
- Squid ACLs and `http_access`
- Squid cache manager
- `curl`

## Sources Consulted
- Squid `delay_pools` directive: https://www.squid-cache.org/Doc/config/delay_pools/
- Squid `delay_class` directive: https://www.squid-cache.org/Doc/config/delay_class/
- Squid `delay_parameters` directive: https://www.squid-cache.org/Doc/config/delay_parameters/
- Squid `delay_access` directive: https://www.squid-cache.org/Doc/config/delay_access/
- Squid `http_port` directive: https://www.squid-cache.org/Doc/config/http_port/
- Squid ACL directive reference: https://www.squid-cache.org/Doc/config/acl/
- Squid cache manager documentation: https://wiki.squid-cache.org/Features/CacheManager/Index
- Squid `squidclient` tool note: https://wiki.squid-cache.org/Features/CacheManager/SquidClientTool
- Squid delay pools feature notes: https://wiki.squid-cache.org/Features/DelayPools
- Squid component overview for delay-pool behavior: https://wiki.squid-cache.org/ProgrammingGuide/SquidComponents
- Squid client-side bandwidth limit feature notes: https://wiki.squid-cache.org/Features/ClientBandwidthLimit
- Verified the replacement public test file with `curl -I`: http://ipv4.download.thinkbroadband.com/100MB.zip

## Issues Found
- The post did not mention that the classic `delay_*` directives require Squid built with `--enable-delay-pools` and are not available in Squid 8. Added that version/build caveat.
- Class 2 was described as aggregate plus per-subnet, but Squid documents it as aggregate plus an individual bucket chosen from IPv4 bits 25-32. Corrected the table and the second example comment.
- Class 3 was described only as per-subnet/per-host. Updated the wording to match Squid's documented network bucket from bits 17-24 and individual bucket from bits 17-32.
- The first `delay_parameters` example used multi-line backslash continuation with inline comments, which is unsafe for `squid.conf`. Replaced it with a single directive line and separate comments.
- The examples used `-1/-1` for unlimited tiers, while current Squid documentation uses `none`. Replaced the unlimited example and conclusion with `none`.
- The `fast_users` pool was ineffective because `delay_access` checks pools by pool number, so those users matched pool 1 before pool 2. Added a `delay_access 1 deny fast_users` rule before allowing `slow_users`.
- The `/24` explanation was inaccurate with a `10.0.0.0/8` ACL because class 3 buckets are based on fixed IPv4 address bits. Changed the example network to `10.0.0.0/16`, where the third-octet network bucket corresponds to `/24` subnets.
- The cache-manager test used `squidclient`, but Squid documents that `squidclient` is no longer distributed with Squid 7 and later. Replaced it with the HTTP cache-manager `curl` endpoint and added local cache-manager access rules plus a loopback listener.
- The "content type" example actually matched filename extensions, not MIME/content types. Renamed the section and changed the ACL to `urlpath_regex`.
- The test download URL used `speedtest.example.com`, which is not a real test object. Replaced it with a verified public 100 MB HTTP test file.
- The download test claimed to measure speed while using only a progress bar. Added `curl -w` output for average download speed.

## Review Notes
Classic Squid delay pools regulate cache-miss/server-to-Squid transfer behavior and may not shape cached hits the same way. Squid also has `client_delay_*` directives for Squid-to-client bandwidth shaping, but changing the article to that feature would be a separate scope. A local Squid binary was not available in this environment, so validation was based on upstream Squid documentation and command-level checks rather than `squid -k parse`.
