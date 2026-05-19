# Validation Summary: How to Configure Squid Cache Size and Policies on Ubuntu

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Ubuntu
- Squid proxy/cache
- Squid cache_dir storage backends
- Squid refresh_pattern caching policy
- Squid ACLs and cache manager
- ICP cache peering

## Sources Consulted
- Squid cache_dir directive: https://www.squid-cache.org/Doc/config/cache_dir/
- Squid cache directive: https://www.squid-cache.org/Doc/config/cache/
- Squid refresh_pattern directive: https://www.squid-cache.org/Doc/config/refresh_pattern/
- Squid cache_replacement_policy directive: https://www.squid-cache.org/Doc/config/cache_replacement_policy/
- Squid memory_replacement_policy directive: https://www.squid-cache.org/Doc/config/memory_replacement_policy/
- Squid cache_mem directive: https://www.squid-cache.org/Doc/config/cache_mem/
- Squid maximum_object_size directive: https://www.squid-cache.org/Doc/config/maximum_object_size/
- Squid minimum_object_size directive: https://www.squid-cache.org/Doc/config/minimum_object_size/
- Squid cachemgr_passwd directive: https://www.squid-cache.org/Doc/config/cachemgr_passwd/
- Squid max_stale directive: https://www.squid-cache.org/Doc/config/max_stale/
- Squid logfile_rotate directive: https://www.squid-cache.org/Doc/config/logfile_rotate/
- Squid Cache Manager wiki: https://wiki.squid-cache.org/Features/CacheManager/Index
- Squid Operating FAQ for PURGE: https://wiki.squid-cache.org/SquidFaq/OperatingSquid
- Squid Clearing the Cache FAQ: https://wiki.squid-cache.org/SquidFaq/ClearingTheCache

## Issues Found
- The post implied that `aufs` and `rock` are generally available storage choices. Squid's documentation says only `ufs` is built by default and other store types depend on build/package options, so the recommendation was updated to make `ufs` the safest default.
- The `refresh_pattern .` catch-all rule appeared before the static asset and large-file rules. Squid uses the first matching `refresh_pattern`, so the specific rules would never apply. The default rule was moved after the specific rules.
- The Gopher refresh-pattern comment said "cache indefinitely" even though the configured maximum was 1440 minutes. The comment now says one day.
- The `override-expire` explanation described serving stale content. Squid documents `override-expire` as enforcing the minimum freshness age and warns that it violates HTTP caching semantics, so the comment was corrected.
- The post used the replaced `no_cache` directive. Squid's current configuration reference lists `cache` as replacing `no_cache`, so the examples now use `cache deny`.
- The cache hierarchy snippet had an active `cache_peer_access` line for a commented-out peer, which could fail if copied directly. The line is now commented to match the rest of the optional peer example.
- The PURGE example omitted the required access-control configuration. A minimal localhost-only PURGE ACL example was added as comments.
- The post described `squid -k rotate` as reloading or clearing the cache. Squid documents that command as log rotation, so it was replaced with `squid -k reconfigure` in the cache-size reduction context.
- The `stale_if_error` directive is not a Squid configuration directive in the current official reference. It was replaced with `max_stale 1 day`, which Squid documents as limiting how stale content may be served when validation fails.

## Review Notes
The examples target the Squid versions commonly packaged with current Ubuntu releases. Squid 7 removes `squidclient`, so future updates may need alternate cache-manager examples if Ubuntu moves to Squid 7 by default.
