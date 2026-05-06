# Validation Summary: How to Configure Apache Dual-Stack (IPv4 and IPv6)

## Status
validated

## Post Type
Guide

## Technologies Covered
- Apache HTTP Server
- IPv4
- IPv6
- Apache VirtualHost configuration
- `curl`
- `ss`

## Sources Consulted
- Apache HTTP Server 2.4: Binding to Addresses and Ports - https://httpd.apache.org/docs/current/bind.html
- Apache HTTP Server 2.4: Name-based Virtual Host Support - https://httpd.apache.org/docs/current/vhosts/name-based.html
- Apache HTTP Server 2.4: VirtualHost Examples - https://httpd.apache.org/docs/current/en/vhosts/examples.html
- Apache HTTP Server 2.4: mod_setenvif - https://httpd.apache.org/docs/current/en/mod/mod_setenvif.html
- Apache HTTP Server 2.4: Expressions in Apache HTTP Server - https://httpd.apache.org/docs/current/expr.html
- Apache HTTP Server 2.4: mod_log_config - https://httpd.apache.org/docs/current/en/mod/mod_log_config.html
- curl man page - https://curl.se/docs/manpage.html
- `ss(8)` Linux manual page - https://man7.org/linux/man-pages/man8/ss.8.html

## Issues Found
- The original `ports.conf` example used both `Listen 0.0.0.0:80` and `Listen [::]:80` as a generic dual-stack recipe. Apache documents that IPv4-mapped IPv6 behavior varies by platform/build, and overlapping `Listen` directives can fail. I changed this to `Listen 80` and `Listen 443`, which is the portable Apache 2.4 pattern for listening on all interfaces.
- The original IPv6 detection example used `SetEnvIf Remote_Addr ":" IS_IPV6`. That can incorrectly match IPv4-mapped IPv6 addresses such as `::ffff:192.0.2.1`. I replaced it with `SetEnvIfExpr "%{IPV6} == 'on' && ! -R '::ffff:0:0/96'" IS_IPV6` so native IPv6 clients are matched without catching mapped IPv4 addresses.
- The `ss` verification note said Apache should show separate IPv4 and IPv6 listeners. Apache documents that some builds use a single IPv6 listener that also accepts IPv4. I corrected the explanation to reflect both valid outcomes.
- The log format example used `%{REMOTE_ADDR}e`, which logs an environment variable, not the client IP, and it used `%O`, which requires `mod_logio`. I changed the example to use `%a` for the client IP and `%b` for the response size so the snippet works with the base logging module.
- The log format comment referred to `$h`, which is not an Apache log format token. I corrected it to `%a`.
- The `server-status` test assumed `mod_status` was available. I added a note that it only applies if `mod_status` is enabled.
- The summary repeated the incorrect `Listen [::]:80` and `SetEnvIf Remote_Addr ":"` guidance. I updated the summary to match the corrected Apache 2.4 behavior.

## Review Notes
- The post is now technically accurate for current Apache HTTP Server 2.4 documentation.
- The examples use Debian/Ubuntu-style paths such as `/etc/apache2/ports.conf` and `${APACHE_LOG_DIR}`. Those are correct for that family of distributions but are not the default paths on all Apache installations.
