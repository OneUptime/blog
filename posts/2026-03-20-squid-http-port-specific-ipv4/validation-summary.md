# Validation Summary: How to Configure Squid http_port to Listen on a Specific IPv4 Address

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Squid proxy server
- Squid `http_port` listener configuration
- Squid ACLs and `http_access`
- Squid SSL Bump listener options
- Linux socket inspection with `ss`
- Proxy testing with `curl`

## Sources Consulted
- Squid official `http_port` directive documentation: https://www.squid-cache.org/Doc/config/http_port/
- Squid official `ssl_bump` directive documentation: https://www.squid-cache.org/Doc/config/ssl_bump/
- Squid official `acl` directive documentation: https://www.squid-cache.org/Doc/config/acl/
- Squid official `http_access` directive documentation: https://www.squid-cache.org/Doc/config/http_access/
- Squid official `cache_mem` directive documentation: https://www.squid-cache.org/Doc/config/cache_mem/
- Squid official `maximum_object_size` directive documentation: https://www.squid-cache.org/Doc/config/maximum_object_size/
- Squid official `cache_dir` directive documentation: https://www.squid-cache.org/Doc/config/cache_dir/
- Squid official `access_log` directive documentation: https://www.squid-cache.org/Doc/config/access_log/
- Squid official `cache_log` directive documentation: https://www.squid-cache.org/Doc/config/cache_log/
- Squid wiki installation and command-line guidance: https://wiki.squid-cache.org/SquidFaq/InstallingSquid
- Red Hat documentation for configuring Squid to listen on a specific port or IP address: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/networking_guide/configuring-the-squid-service-to-listen-on-a-specific-port-or-ip-address
- curl official man page for `-x, --proxy`: https://curl.se/docs/manpage.html
- Linux `ss(8)` man page: https://man7.org/linux/man-pages/man8/ss.8.html
- httpbin `/ip` endpoint used by the post's test command: https://httpbin.org/ip

## Issues Found
- The first configuration block had `http_port 10.0.0.1:3128` active twice if copied as one snippet. Commented the single-address example so the active "multiple listen addresses" example does not attempt to bind the same address and port twice.
- The SSL bump listener example used the older `cert=` TLS option. Updated it to the current `tls-cert=` option documented for modern Squid `http_port` TLS/SSL options.
- The SSL bump comment implied that the `http_port ... ssl-bump` line alone performs HTTPS decryption. Clarified that the port is SSL bump-capable and still requires `ssl_bump` rules to decrypt traffic; Squid's default `ssl_bump` action is to splice/tunnel without decryption.
- The logging example used the older plain access log file syntax. Updated it to the current module-based `access_log daemon:/var/log/squid/access.log logformat=squid` form.

## Review Notes
- The core claim is correct for current documented Squid releases that support `http_port`: `http_port <IPv4>:<port>` binds Squid to that specific socket address, and multiple `http_port` lines define multiple listener addresses.
- Squid's current directive pages list `http_port` and related directives through Squid v7 and state that they are not available in v8. The post remains accurate for the documented supported `http_port` configuration model, but it should be revisited if targeting Squid v8 specifically.
- The `cache_dir` example is syntactically valid, but a real deployment must ensure the cache directory exists, is writable by Squid, and is initialized as needed before first startup.
