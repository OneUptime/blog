# Validation Summary: How to Set Up Squid as a Caching Proxy on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Squid caching proxy
- firewalld
- SELinux
- DNF/YUM proxy configuration
- systemd service management

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Deploying web servers and reverse proxies, Chapter 3 "Configuring the Squid caching proxy server": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/deploying_web_servers_and_reverse_proxies/index
- Squid configuration reference for ACLs: https://www.squid-cache.org/Doc/config/acl/
- Squid configuration reference for http_reply_access: https://www.squid-cache.org/Doc/config/http_reply_access/
- Squid configuration reference for refresh_pattern: https://www.squid-cache.org/Doc/config/refresh_pattern/
- Squid configuration reference for cache_mem: https://www.squid-cache.org/Doc/config/cache_mem/
- Squid configuration reference for max_filedescriptors: https://www.squid-cache.org/Doc/config/max_filedescriptors/
- Squid configuration reference for dns_children: https://www.squid-cache.org/Doc/config/dns_children/
- Squid HTTPS feature documentation: https://wiki.squid-cache.org/Features/HTTPS
- Squid Cache Manager squidclient documentation: https://wiki.squid-cache.org/Features/CacheManager/SquidClientTool
- Squid Cache Manager utilization report documentation: https://wiki.squid-cache.org/Features/CacheManager/Utilization

## Issues Found
- The post implied Squid caching applies uniformly to HTTP, HTTPS, and FTP traffic. I added a caveat that HTTPS is normally handled through CONNECT tunneling and encrypted HTTPS content is not cached unless TLS interception is configured separately.
- The firewalld example used `--add-service=squid`. Red Hat's RHEL 9 Squid documentation opens the default proxy listener with `--add-port=3128/tcp`, so I changed the example to that documented command.
- The local network ACL instructions did not clearly state Squid access-rule ordering. I clarified that `acl localnet` must be defined before the matching `http_access allow localnet` rule and that the allow rule must remain before the final deny rule.
- The domain deny-list example did not note that deny rules must be evaluated before a broader `localnet` allow. I updated the comment to make the ordering requirement explicit.
- The time-based access example could be bypassed if users kept the broader `http_access allow localnet` rule. I added a note that the time-based rule should replace the broader allow when the restriction is intended.
- The MIME-type blocking example used `rep_mime_type` with `http_access`, but Squid documents that `rep_mime_type` has no effect in `http_access` rules. I changed it to `http_reply_access deny large_downloads` and added `http_reply_access allow all`.
- The tuning section used `dns_children`, which is not available in Squid 5.x and newer unless using older external-DNS builds. RHEL 9 ships Squid 5.x packages, so I removed that outdated tuning directive.

## Review Notes
The remaining commands and configuration snippets are consistent with the RHEL 9 Squid documentation and Squid's upstream configuration reference. The guide remains a basic forward-proxy setup and does not cover TLS interception, authentication, or cache-manager password hardening.
