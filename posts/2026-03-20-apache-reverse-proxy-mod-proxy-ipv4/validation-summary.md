# Validation Summary: How to Set Up Apache as a Reverse Proxy Using mod_proxy with IPv4 Backends

## Status
validated

## Post Type
Guide

## Technologies Covered
- Apache HTTP Server
- Apache `mod_proxy`
- Apache `mod_proxy_http`
- Apache `mod_headers`
- Apache `mod_ssl`
- Reverse proxy configuration
- HTTP and HTTPS backends
- IPv4 backend routing

## Sources Consulted
- Apache `mod_proxy` documentation: https://httpd.apache.org/docs/current/mod/mod_proxy.html
- Apache `mod_proxy_http` documentation: https://httpd.apache.org/docs/current/mod/mod_proxy_http.html
- Apache `mod_proxy_connect` documentation: https://httpd.apache.org/docs/current/en/mod/mod_proxy_connect.html
- Apache `mod_headers` documentation: https://httpd.apache.org/docs/2.4/mod/mod_headers.html
- Apache expression syntax documentation: https://httpd.apache.org/docs/current/expr.html
- Apache `mod_ssl` documentation: https://httpd.apache.org/docs/2.4/en/mod/mod_ssl.html
- Apache core directive documentation (`TimeOut`): https://httpd.apache.org/docs/current/en/mod/core.html
- Apache configuration syntax documentation: https://httpd.apache.org/docs/trunk/configuring.html
- Debian `a2enmod(8)` man page: https://manpages.debian.org/bookworm/apache2/a2enmod.8.en.html
- Debian `apache2ctl(8)` man page: https://manpages.debian.org/testing/apache2/apache2ctl.8.en.html

## Issues Found
- The module list included `proxy_balancer` and `rewrite` even though they were not required by the examples, and it omitted `ssl`, which is required for the HTTPS sections. I removed the unused module enables and added `a2enmod ssl`.
- The verification command only checked proxy modules after `headers` and `ssl` were enabled as part of the examples. I updated it to check `proxy`, `headers`, and `ssl` modules together.
- The basic reverse proxy example manually set `X-Forwarded-For` incorrectly. Apache `mod_proxy_http` already adds `X-Forwarded-For`, `X-Forwarded-Host`, and `X-Forwarded-Server` by default, so I removed the incorrect header line and noted the built-in behavior.
- The `X-Real-IP` example used `%{REMOTE_ADDR}s`, which is not the correct way to read the client address there. I changed it to `RequestHeader set X-Real-IP "expr=%{REMOTE_ADDR}"`, which matches Apache's documented expression support for header values.
- Two Apache configuration snippets used inline `#` comments on directive lines. Apache configuration syntax does not allow comments on the same line as a directive, so I moved those comments onto their own lines.
- The timeout section claimed a default proxy timeout of 300 seconds. Apache documents `ProxyTimeout` as defaulting to the value of `TimeOut`, which is 60 seconds in Apache 2.4 by default, so I corrected that explanation.
- The HTTPS-backend section instructed readers to enable `proxy_connect`, which is for handling the `CONNECT` method and is not required for reverse proxying to HTTPS origins. I changed the guidance to use `proxy`, `proxy_http`, and `ssl`.
- The HTTPS-backend snippet called the configuration "SSL passthrough", which was inaccurate because Apache is still acting as an HTTP reverse proxy and making its own TLS connection to the backend. I corrected the wording to "Proxy to an HTTPS backend".
- The testing command attempted to inspect `X-Forwarded-*` and `X-Real-IP` headers with `curl` against the frontend response, which does not show the internal proxy request headers sent to the backend. I replaced it with an accurate instruction to generate a request and verify those headers in backend application logs.
- The conclusion recommended `ProxyPreserveHost On` as a general rule. Apache documents that `ProxyPreserveHost` should only be enabled when the backend needs the original `Host` header, so I narrowed that recommendation.

## Review Notes
- The post uses Debian/Ubuntu-specific paths and helper commands such as `a2enmod`, `apache2ctl`, and `/etc/apache2/...`; that is technically fine, but the examples are distro-specific rather than generic upstream Apache layouts.
- The corrected examples align with Apache HTTP Server 2.4 documentation and defaults.
