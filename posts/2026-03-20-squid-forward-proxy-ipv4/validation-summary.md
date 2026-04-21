# Validation Summary: How to Set Up Squid as a Forward Proxy for IPv4 Traffic

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Squid forward proxy
- Squid ACLs and `http_access` rules
- Squid disk cache and cache manager
- Linux systemd service management
- curl proxy usage and environment variables
- apt proxy configuration
- Linux socket inspection with `ss`

## Sources Consulted
- Squid `http_port` directive: https://www.squid-cache.org/Doc/config/http_port/
- Squid `acl` directive and predefined ACLs: https://www.squid-cache.org/Doc/config/acl/
- Squid `http_access` directive and recommended access ordering: https://www.squid-cache.org/Doc/config/http_access/
- Squid `cache_dir` directive: https://www.squid-cache.org/Doc/config/cache_dir/
- Squid installation/cache directory initialization FAQ: https://wiki.squid-cache.org/SquidFaq/InstallingSquid
- Squid Cache Manager documentation: https://wiki.squid-cache.org/Features/CacheManager/Index
- Squid `squidclient` tool documentation: https://wiki.squid-cache.org/Features/CacheManager/SquidClientTool
- Squid `access_log` directive: https://www.squid-cache.org/Doc/config/access_log/
- Squid `cache_log` directive: https://www.squid-cache.org/Doc/config/cache_log/
- curl man page: https://curl.se/docs/manpage.html
- curl proxy environment variable documentation: https://everything.curl.dev/usingcurl/proxies/env.html
- curl HTTP proxy and CONNECT documentation: https://everything.curl.dev/usingcurl/proxies/http.html
- Debian apt proxy configuration reference: https://wiki.debian.org/AptConfiguration
- systemd `systemctl` manual: https://www.freedesktop.org/software/systemd/man/systemctl.html
- Debian `ss(8)` manual page: https://manpages.debian.org/bookworm/iproute2/ss.8.en.html

## Issues Found
- The shown ACLs denied the cache manager request from `127.0.0.1` because `localhost` was not allowed before `http_access deny all`. Added `http_access allow localhost manager` and `http_access deny manager`, matching Squid's recommended cache-manager access pattern.
- The cache statistics command used `squidclient mgr:info`. Squid documentation notes that `squidclient` is no longer distributed with Squid 7 and later, and current cache-manager access is available via `/squid-internal-mgr/`. Replaced it with a `curl` request to `http://127.0.0.1:3128/squid-internal-mgr/info`.
- The guide enabled a `cache_dir` but started Squid without initializing the cache directory structure. Squid documentation says to run `squid -z` when installing for the first time or adding/modifying `cache_dir`. Added configuration parsing, a stop step, and `sudo squid -z` before starting the service.
- The `access_log /var/log/squid/access.log squid` example used the older bare-file form. Updated it to the current module-based form with `logformat=squid`: `access_log daemon:/var/log/squid/access.log logformat=squid`.

## Review Notes
- The `no_proxy` CIDR example is valid for current curl versions because curl has supported CIDR entries in `NO_PROXY`/`no_proxy` since 7.86.0, but some other tools may not interpret CIDR in proxy bypass lists.
- The `cache_dir ufs` directive is valid for a single-worker Squid setup. For multi-worker/SMP deployments, Squid documentation warns that non-`rock` cache directory types are not SMP-aware.
