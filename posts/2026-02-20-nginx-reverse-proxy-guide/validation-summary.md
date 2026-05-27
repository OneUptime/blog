# Validation Summary: How to Configure Nginx as a Reverse Proxy for Microservices

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Nginx / NGINX Open Source
- Nginx reverse proxy configuration
- HTTP upstream load balancing
- Passive upstream failover
- Proxy buffering and timeout directives
- Nginx command-line validation and reload commands

## Sources Consulted
- Nginx ngx_http_proxy_module official documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Nginx ngx_http_upstream_module official documentation: https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- NGINX HTTP Load Balancing official documentation: https://docs.nginx.com/nginx/admin-guide/load-balancer/http-load-balancer/
- NGINX HTTP Health Checks official documentation: https://docs.nginx.com/nginx/admin-guide/load-balancer/http-health-check/
- Nginx command-line parameters official documentation: https://nginx.org/en/docs/switches.html

## Issues Found
- The load-balancing example described the default method as each request going to the next server in order. Nginx uses weighted round-robin by default, and the example includes weights, so I updated the comment to say requests are distributed according to server weight.
- The health-check section used general "health checks" wording for a configuration that implements passive failure detection with `max_fails`, `fail_timeout`, and `proxy_next_upstream`. I renamed the section to "Passive Health Checks and Failover" and clarified that active probe-based health checks require NGINX Plus.

## Review Notes
The configuration snippets use valid Nginx directives and contexts when included from the normal `http` configuration context, such as via `/etc/nginx/conf.d/*.conf` in a standard Nginx setup. The path-routing examples intentionally preserve the matched URI prefix because `proxy_pass` is specified without a URI.
