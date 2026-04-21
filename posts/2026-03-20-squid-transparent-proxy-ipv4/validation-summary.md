# Validation Summary: How to Set Up Squid as a Transparent HTTP Proxy on IPv4

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Squid
- Transparent HTTP proxying
- IPv4 forwarding
- iptables NAT REDIRECT rules
- SSL bump / HTTPS interception
- X-Forwarded-For

## Sources Consulted
- Squid `http_port` configuration directive: https://www.squid-cache.org/Doc/config/http_port/
- Squid `https_port` configuration directive: https://www.squid-cache.org/Doc/config/https_port/
- Squid `ssl_bump` configuration directive: https://www.squid-cache.org/Doc/config/ssl_bump/
- Squid `forwarded_for` configuration directive: https://www.squid-cache.org/Doc/config/forwarded_for/
- Squid `access_log` configuration directive: https://www.squid-cache.org/Doc/config/access_log/
- Squid `cache_mem` configuration directive: https://www.squid-cache.org/Doc/config/cache_mem/
- Squid `cache_dir` configuration directive: https://www.squid-cache.org/Doc/config/cache_dir/
- Squid Linux REDIRECT interception example: https://wiki.squid-cache.org/ConfigExamples/Intercept/LinuxRedirect
- Squid SSL-Bump interception example: https://wiki.squid-cache.org/ConfigExamples/Intercept/SslBumpExplicit
- iptables extensions manual: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- Local iptables 1.8.10 help output for `owner` match and `REDIRECT` target options.

## Issues Found
- The first iptables REDIRECT command had an inline comment after a line-continuation backslash, which would break shell parsing. Moved the LAN interface note into a separate comment.
- The post used `--to-port` for REDIRECT. Updated examples to the documented `--to-ports` option.
- The proxy bypass rule used `-m owner --uid-owner proxy` in the NAT `PREROUTING` chain. The owner match is only valid for locally generated packets in `OUTPUT` and `POSTROUTING`, so it cannot work for forwarded LAN traffic. Replaced it with a source-IP bypass rule for the proxy's own LAN IP and placed it before the REDIRECT rule.
- The Squid ACL allowed `192.168.0.0/16` while the firewall example used `192.168.0.0/24`. Updated the ACL to match the example LAN subnet.
- The Squid `access_log` example used the older path-only form. Updated it to the current module-based form with `daemon:` and `logformat=squid`.
- The HTTPS interception example used `http_port` without `intercept` and did not include SSL bump rules. Updated it to `https_port 3130 intercept ssl-bump`, switched to the current `tls-cert=` option, added minimal `ssl_bump` rules, and noted that clients must trust the CA certificate.
- The verification comment claimed `ss` checks intercept mode. Adjusted the wording because `ss` verifies the listener, not Squid's configured mode.

## Review Notes
- The HTTP transparent proxy workflow is technically valid for Squid versions that support `http_port ... intercept` and Linux iptables REDIRECT.
- `iptables-save > /etc/iptables/rules.v4` is common on Debian/Ubuntu systems using iptables-persistent, but persistence paths vary by distribution.
- Binding Squid to `0.0.0.0` can expose the listener on non-LAN interfaces; production deployments should bind to the internal interface or firewall the port appropriately.
