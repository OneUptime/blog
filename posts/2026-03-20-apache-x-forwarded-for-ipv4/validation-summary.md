# Validation Summary: How to Configure Apache to Handle X-Forwarded-For Headers with IPv4

## Status
validated

## Post Type
Guide

## Technologies Covered
- Apache HTTP Server
- `mod_remoteip`
- `mod_log_config`
- `mod_authz_host`
- `mod_authz_core`
- `mod_status`
- Debian `a2enmod` / `a2enconf`
- Red Hat Enterprise Linux `httpd`
- Cloudflare IP ranges
- PHP

## Sources Consulted
- Apache `mod_remoteip` docs: https://httpd.apache.org/docs/current/en/mod/mod_remoteip.html
- Apache `mod_log_config` docs: https://httpd.apache.org/docs/current/en/mod/mod_log_config.html
- Apache `mod_authz_host` docs: https://httpd.apache.org/docs/current/mod/mod_authz_host.html
- Apache `mod_authz_core` docs: https://httpd.apache.org/docs/current/mod/mod_authz_core.html
- Apache `mod_status` docs: https://httpd.apache.org/docs/current/mod/mod_status.html
- Debian `a2enmod(8)` man page: https://manpages.debian.org/bookworm/apache2/a2enmod.8.en.html
- Debian `a2enconf(8)` man page: https://manpages.debian.org/unstable/apache2/a2enconf.8.en.html
- Red Hat Enterprise Linux web server docs: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html-single/deploying_web_servers_and_reverse_proxies/index
- Cloudflare IPv4 ranges: https://www.cloudflare.com/ips-v4

## Issues Found
- The introduction described `X-Forwarded-For` as a single client IP, but Apache documents it as a header that can contain a comma-delimited address chain. I corrected the explanation to reflect that behavior.
- The private RFC1918 proxy examples used `RemoteIPTrustedProxy`, but Apache documents that private client addresses are only evaluated when `RemoteIPInternalProxy` is used for internal proxies. I changed the private-network and private-ALB examples to `RemoteIPInternalProxy` and left the Cloudflare example on `RemoteIPTrustedProxy`.
- The RHEL/CentOS module-loading note pointed readers to edit `/etc/httpd/conf.modules.d/00-base.conf`. Red Hat documents loading DSOs from files under `/etc/httpd/conf.modules.d/`, so I updated the guidance to use that directory generically instead of a specific packaged file.
- The logging section incorrectly implied `%h` was "before remoteip processing" and suggested logging `%{X-Forwarded-For}i` after `mod_remoteip`. Apache documents that `mod_remoteip` rewrites the client address for logging and may update or remove the header, so I changed the examples to use `%a` for the rewritten client IP and `%{remoteip-proxy-ip-list}n` for the trusted proxy chain.
- The sample combined log format used `%O`, which is provided by `mod_logio`, while the surrounding text presented it as a standard replacement for the default combined format. I changed it to `%b` to match the standard combined format and avoid an undeclared module dependency.
- The access-control example used two separate `Require ip` directives inside `<RequireAll>`, which would require a client to match both IP ranges. I combined the ranges into a single `Require ip` directive so the example works as intended alongside `Require method`.
- The PROXY protocol section omitted that `RemoteIPProxyProtocol` is only available in Apache HTTP Server 2.4.31 and newer. I added that version caveat.
- The `mod_status` verification example was framed as a direct test endpoint for `REMOTE_ADDR`, which it is not. I adjusted the wording so the PHP example is the direct verification method for `REMOTE_ADDR`.

## Review Notes
- The post now correctly distinguishes `RemoteIPInternalProxy` for private/internal proxy networks from `RemoteIPTrustedProxy` for public proxy networks such as Cloudflare. In production, the trust list should still be narrowed to the exact proxy addresses or subnets you operate.
- Apache documents that enabling `RemoteIPProxyProtocol` is connection-based and effectively applies by IP address and port, even if configured inside a single name-based virtual host. The post’s example remains valid, but that deployment detail matters on shared listeners.
