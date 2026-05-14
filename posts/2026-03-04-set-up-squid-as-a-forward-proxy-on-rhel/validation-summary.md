# Validation Summary: How to Set Up Squid as a Forward Proxy on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Squid caching proxy
- firewalld
- systemd
- curl proxy configuration

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Deploying web servers and reverse proxies, Chapter 3 Configuring the Squid caching proxy server: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/deploying_web_servers_and_reverse_proxies/deploying_web_servers_and_reverse_proxies
- Squid configuration reference for `cache_dir`: https://www.squid-cache.org/Doc/config/cache_dir/
- Squid configuration reference for `maximum_object_size`: https://www.squid-cache.org/Doc/config/maximum_object_size/
- Squid configuration reference for `http_access`: https://www.squid-cache.org/Doc/config/http_access/
- Squid configuration reference for `http_port`: https://www.squid-cache.org/Doc/config/http_port/
- Squid configuration reference for `access_log`: https://www.squid-cache.org/Doc/config/access_log/
- Squid cache manager `squidclient` tool documentation: https://wiki.squid-cache.org/Features/CacheManager/SquidClientTool
- Squid cache manager `mgr:info` report documentation: https://wiki.squid-cache.org/Features/CacheManager/Info

## Issues Found
- The `access_log /var/log/squid/access.log squid` directive used the older accepted format. Updated it to `access_log daemon:/var/log/squid/access.log squid`, which matches Squid's current recommended module-prefixed syntax.
- The blocked-sites example said only to add the ACL and deny rule to `squid.conf`. Because Squid evaluates `http_access` rules in order, adding the deny rule after `http_access allow localnet` would not block local clients. Updated the comment to place the rule before `http_access allow localnet`.
- The cache-hit monitoring command grepped for `Hit Ratios`, which does not match the current `mgr:info` example output. Updated it to grep for `Hits as %`.

## Review Notes
- The tutorial is technically valid for the standard RHEL Squid package flow. For a future expansion, it could mention that HTTPS requests through a forward proxy are normally tunneled with CONNECT and are not cached as decrypted objects unless explicit TLS inspection is configured.
