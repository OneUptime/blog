# Validation Summary: How to Set Up Apache mod_proxy for Reverse Proxy on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Apache HTTP Server 2.4
- mod_proxy
- mod_proxy_http
- mod_proxy_wstunnel
- mod_proxy_balancer
- mod_headers
- mod_rewrite
- SELinux

## Sources Consulted
- Apache HTTP Server 2.4 mod_proxy documentation: https://httpd.apache.org/docs/current/mod/mod_proxy.html
- Apache HTTP Server 2.4 mod_proxy_wstunnel documentation: https://httpd.apache.org/docs/current/mod/mod_proxy_wstunnel.html
- Apache HTTP Server 2.4 mod_proxy_balancer documentation: https://httpd.apache.org/docs/2.4/en/mod/mod_proxy_balancer.html
- Apache HTTP Server 2.4 mod_headers documentation: https://httpd.apache.org/docs/2.4/mod/mod_headers.html
- Apache HTTP Server 2.4 expression parser documentation: https://httpd.apache.org/docs/current/expr.html
- Red Hat Enterprise Linux 9 Deploying web servers and reverse proxies: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/deploying_web_servers_and_reverse_proxies/Red_Hat_Enterprise_Linux-9-Deploying_web_servers_and_reverse_proxies-en-US.pdf
- Red Hat Enterprise Linux SELinux Apache booleans documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/selinux_users_and_administrators_guide/sect-managing_confined_services-the_apache_http_server-booleans

## Issues Found
- The `RequestHeader set X-Real-IP "%{REMOTE_ADDR}s"` example used the `%{VARNAME}s` format specifier, which Apache documents as an SSL environment variable lookup, not the request's remote address. Changed it to `RequestHeader set X-Real-IP "expr=%{REMOTE_ADDR}"`, using the documented ap_expr `REMOTE_ADDR` variable.
- The tuning section used `ProxyConnectTimeout 5`, which is not an Apache HTTP Server 2.4 directive. Changed the example to use the documented `connectiontimeout=5` worker parameter on `ProxyPass`.
- The tuning section showed multiple `ProxyPass /` directives for the same mapping to demonstrate individual parameters. Consolidated them into one `ProxyPass` directive with `connectiontimeout`, `timeout`, `retry`, and `keepalive` parameters to avoid duplicate-worker ambiguity.
- The SELinux note described `httpd_can_network_relay` as something needed for a specific port. Red Hat documents this boolean for using `httpd` as a forward or reverse proxy, so the wording was corrected.

## Review Notes
- The WebSocket rewrite example matches Apache's documented `mod_proxy_wstunnel` pattern. Apache 2.4.47 and later can also handle WebSocket protocol upgrades through `mod_proxy_http` with the `upgrade=websocket` `ProxyPass` parameter.
- RHEL 9 documentation lists `/etc/httpd/conf.modules.d/` as the packaged module loading directory and `apachectl configtest` as the syntax-check command, matching the post.
