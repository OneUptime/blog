# Validation Summary: How to Restrict Apache Access by IPv4 Address Using Require ip

## Status
validated

## Post Type
Guide

## Technologies Covered
- Apache HTTP Server 2.4
- Apache authorization and access control (`mod_authz_host`, `mod_authz_core`)
- Basic authentication
- `curl`

## Sources Consulted
- Apache HTTP Server 2.4 `mod_authz_host`: https://httpd.apache.org/docs/current/mod/mod_authz_host.html
- Apache HTTP Server 2.4 `mod_authz_core`: https://httpd.apache.org/docs/2.4/mod/mod_authz_core.html
- Apache HTTP Server 2.4 Access Control Howto: https://httpd.apache.org/docs/2.4/howto/access.html
- Apache HTTP Server 2.4 Configuration Files: https://httpd.apache.org/docs/current/configuring.html
- Apache HTTP Server 2.4 Custom Error Responses: https://httpd.apache.org/docs/current/custom-error.html
- Apache HTTP Server 2.4 Upgrading to 2.4 from 2.2: https://httpd.apache.org/docs/current/upgrading.html
- curl man page: https://curl.se/docs/manpage.html

## Issues Found
- Several Apache config examples used inline comments after directives. Apache configuration syntax does not allow comments on the same line as a directive, so those comments were moved onto their own lines.
- The post used `RequireNot`, which is not a valid Apache directive. It was corrected to `Require not` inside `<RequireAll>`, which is the supported negation syntax for access control rules.
- The `curl --interface` example was phrased as if it could test from any arbitrary blocked IP. It was clarified so the source IP must already be assigned locally on the client running `curl`.
- The verification command used `apache2ctl configtest`, which is Debian-family specific. It was changed to `apachectl configtest`, matching Apache's official documentation.
- The introduction omitted the reverse-proxy caveat for `Require ip`. A short note was added explaining that, behind a reverse proxy or load balancer, Apache sees the proxy address unless `mod_remoteip` is configured.
- The conclusion referred to an `AuthConfig` system, which is not the correct concept here. It was corrected to Apache's authorization framework.

## Review Notes
- The post is now technically correct for Apache HTTP Server 2.4.
- The filesystem paths and log paths shown in the examples use a Debian/Ubuntu-style Apache layout (`/etc/apache2`, `/var/log/apache2`), which is valid but distro-specific.
- `Require ip` also supports IPv6 and non-CIDR address formats, but the IPv4-only scope of this post is consistent with the title and examples.
