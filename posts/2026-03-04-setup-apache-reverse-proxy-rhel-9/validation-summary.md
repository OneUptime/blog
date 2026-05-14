# Validation Summary: How to Set Up Apache as a Reverse Proxy on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Apache HTTP Server 2.4 / httpd
- Apache reverse proxy configuration with mod_proxy and mod_proxy_http
- Apache mod_ssl for HTTPS upstream proxying
- Apache mod_headers for forwarded request headers
- SELinux booleans for httpd network connections
- systemd service management

## Sources Consulted
- Apache HTTP Server 2.4 Reverse Proxy Guide: https://httpd.apache.org/docs/current/en/howto/reverse_proxy.html
- Apache HTTP Server 2.4 mod_proxy documentation: https://httpd.apache.org/docs/current/mod/mod_proxy.html
- Apache HTTP Server 2.4 mod_ssl documentation: https://httpd.apache.org/docs/2.4/mod/mod_ssl.html
- Apache HTTP Server 2.4 mod_headers documentation: https://httpd.apache.org/docs/2.4/mod/mod_headers.html
- Apache HTTP Server 2.4 expression parser documentation: https://httpd.apache.org/docs/current/expr.html
- Red Hat Enterprise Linux 9 Deploying web servers and reverse proxies: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/deploying_web_servers_and_reverse_proxies/index
- Red Hat Enterprise Linux 9 Using SELinux: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux/using_selinux

## Issues Found
- The client IP/header section incorrectly implied that Apache does not provide forwarded client information by default and used `RequestHeader` values with `%{REMOTE_ADDR}s` and `%{REQUEST_SCHEME}s`. In Apache mod_headers, `%{VARNAME}s` expands SSL environment variables, not normal Apache expression variables. Apache mod_proxy_http also already adds `X-Forwarded-For`, `X-Forwarded-Host`, and `X-Forwarded-Server` for reverse proxy requests. I changed the section to state the default headers accurately and kept only an explicit `X-Forwarded-Proto` example using `RequestHeader set X-Forwarded-Proto "expr=%{REQUEST_SCHEME}"`, which matches Apache 2.4 expression syntax.

## Review Notes
- The proxy, HTTPS upstream, load-balancer, SELinux, `apachectl configtest`, and `systemctl reload httpd` examples are technically valid for RHEL 9 / Apache HTTP Server 2.4.
- `SSLProxyVerify none` and peer-check disabling are valid for trusted internal backends, but they intentionally weaken certificate validation and should remain limited to controlled internal use.
