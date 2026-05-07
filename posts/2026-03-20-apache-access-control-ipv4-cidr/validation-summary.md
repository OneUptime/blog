# Validation Summary: How to Configure Apache Access Control with IPv4 CIDR Notation

## Status
validated

## Post Type
Guide

## Technologies Covered
- Apache HTTP Server 2.4 authorization and access control
- `mod_authz_host`
- `mod_authz_core`
- IPv4 CIDR notation and partial-IP matching
- `.htaccess`
- `curl`
- `ipcalc`

## Sources Consulted
- Apache HTTP Server `mod_authz_host`: https://httpd.apache.org/docs/current/mod/mod_authz_host.html
- Apache HTTP Server `mod_authz_core`: https://httpd.apache.org/docs/2.4/mod/mod_authz_core.html
- Apache HTTP Server Access Control how-to: https://httpd.apache.org/docs/2.4/howto/access.html
- Apache HTTP Server `.htaccess` tutorial: https://httpd.apache.org/docs/2.4/howto/htaccess.html
- Apache HTTP Server override index for `.htaccess`: https://httpd.apache.org/docs/2.4/en/mod/overrides.html
- curl man page: https://curl.se/docs/manpage.html
- RFC 6598, Shared Address Space: https://www.rfc-editor.org/rfc/rfc6598
- Debian `apache2ctl(8)` man page: https://manpages.debian.org/testing/apache2/apache2ctl.8.en.html
- Debian `ipcalc(1)` man page: https://manpages.debian.org/bullseye/ipcalc/ipcalc.1.en.html
- Local CLI help: `curl --help all`

## Issues Found
- The post used `RequireNot`, which is not a valid Apache directive. Apache 2.4 uses `Require not ip ...` via the `Require [not] entity-name` syntax. I replaced all `RequireNot` examples and updated the conclusion accordingly.
- The text described Apache as accepting multiple "CIDR formats" and said Apache "expands automatically" from short forms like `Require ip 192.168.1`. Apache does support partial IPv4 prefixes, but that syntax is not CIDR notation. I corrected the wording to describe these as IP-based matching formats and partial-IP shorthand.
- The `/22` example said "`/22 = 1024 hosts`". A `/22` contains 1024 addresses, not 1024 usable host addresses. I corrected that comment.
- The comment calling `100.64.0.0/10` a "cloud scraper" range was inaccurate. RFC 6598 defines it as shared address space for carrier-grade NAT and service-provider use. I corrected the comment.
- The `curl --interface` test examples implied you could validate Apache IP rules by binding to arbitrary source IPs. In practice, `curl --interface` only works with an interface or source address actually present on the client system. I replaced those examples with status-check requests that are accurate when run from clients in the relevant subnets.

## Review Notes
- Apache 2.4 treats multiple `Require` directives in the same section as an implicit `<RequireAny>`, so the allow-list examples are technically correct as written.
- `AllowOverride AuthConfig` is sufficient for `Require` in `.htaccess`, but Apache's own documentation recommends using main server config instead of `.htaccess` when you have that access.
- `Require ip` and `Require not ip` evaluate the client source address seen by Apache. If the server is behind a reverse proxy or load balancer, correct client-IP handling depends on separate proxy/IP restoration configuration.
