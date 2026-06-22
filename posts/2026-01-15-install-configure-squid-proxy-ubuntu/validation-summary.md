# Validation Summary: How to Install and Configure Squid Proxy Server on Ubuntu

## Status
validated

## Post Type
Tutorial / installation and configuration guide

## Technologies Covered
- Squid proxy server (Ubuntu 20.04 / 22.04 / 24.04 — Squid 4.x / 5.x / 6.x)
- `squid.conf` configuration directives (http_port, acl, http_access, cache_dir, cache_mem, refresh_pattern, delay pools)
- ACLs (src, dstdomain, time, url_regex, urlpath_regex, proxy_auth)
- Authentication helpers (`basic_ncsa_auth` / htpasswd, `basic_ldap_auth`)
- SSL Bump / HTTPS interception (`sslcrtd_program`, `security_file_certgen`, OpenSSL)
- Transparent/intercept proxy with iptables NAT
- Delay pools (traffic shaping)
- squidclient cache manager
- PAC (proxy auto-config) files, client/browser proxy configuration
- ufw firewall

## Sources Consulted
- Squid `sslcrtd_program` configuration directive: https://www.squid-cache.org/Doc/config/sslcrtd_program/
- `security_file_certgen(8)` man page: https://www.mankier.com/8/security_file_certgen
- Squid Dynamic SSL Certificate Generation wiki: https://wiki.squid-cache.org/Features/DynamicSslCert
- Squid Cache Manager wiki: https://wiki.squid-cache.org/Features/CacheManager/Index
- Squid `cache_object://` URI Scheme wiki (deprecation/removal): https://wiki.squid-cache.org/Features/CacheManager/CacheObjectScheme
- Squid ChangeLog (cache_object removal/reinstatement history): https://github.com/squid-cache/squid/blob/master/ChangeLog
- Ubuntu package versions for Squid (Launchpad / packages.ubuntu.com): https://launchpad.net/ubuntu/+source/squid

## Issues Found
- The cache-manager and troubleshooting sections used the legacy `cache_object://localhost/...` URI scheme with `squidclient` (e.g. `cache_object://localhost/info`, `/counters`, `/mem`, `/active_requests`). This scheme is deprecated and was removed in Squid 6.3 (reinstated in 6.4, slated for final removal in Squid 7). Since the post explicitly targets Ubuntu 24.04, which ships Squid 6.13, I updated all five occurrences to the current `mgr:` scheme (`squidclient -h localhost mgr:info`, `mgr:counters`, `mgr:mem`, `mgr:active_requests`). The `mgr:` shorthand has been supported by `squidclient` since Squid 3.2, so the change is correct across all three targeted Ubuntu releases.

## Review Notes
- Helper binary paths are correct for Ubuntu's packaging: `/usr/lib/squid/basic_ncsa_auth`, `/usr/lib/squid/basic_ldap_auth`, and `/usr/lib/squid/security_file_certgen`.
- Built-in ACLs (`localhost`, `manager`) are used without explicit definition, which is correct — they are predefined in Squid 3.2+. `localnet` is correctly defined by the author.
- Delay pool syntax is correct: class 1 takes a single `restore/max` pair (`-1/-1` = unlimited); class 2 takes aggregate + per-host pairs. `262144` bytes/s correctly equals 256 KB/s.
- The SSL Bump example generates `dhparam.pem` but does not reference it in the `http_port` line — harmless, just unused; not a technical error.
- The SSL certificate DB is placed at `/var/lib/squid/ssl_db`; some official examples use `/var/spool/squid/ssl_db`. Both are valid choices and the path is used consistently between the directive and the init command, so no change was made. On AppArmor-enabled systems users may still need to confirm the chosen path is permitted by the squid profile.
- `squidclient` itself is removed in Squid 7; on a future Squid 7-based Ubuntu, the cache-manager examples would need to move to `curl http://localhost:3128/squid-internal-mgr/...`. Not applicable to the currently targeted releases.
