# Validation Summary: How to Set Up Nginx Load Balancing on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- RHEL
- Nginx
- HTTP and HTTPS reverse proxying
- Nginx upstream load balancing
- SELinux
- systemd
- curl

## Sources Consulted
- Nginx official documentation: Using nginx as HTTP load balancer - https://nginx.org/en/docs/http/load_balancing.html
- Nginx official documentation: ngx_http_upstream_module - https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- Nginx official documentation: ngx_http_proxy_module - https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- NGINX official documentation: Configure SELinux - https://docs.nginx.com/nginx-one-console/agent/configure-instances/configure-selinux/
- Red Hat Enterprise Linux 9 official documentation: Using SELinux - https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/html/using_selinux/

## Issues Found
- The post described the open source Nginx `max_fails` and `fail_timeout` configuration as "health checks." This is passive failure handling, while periodic active health checks using `health_check` are documented as part of the commercial NGINX Plus feature set. Updated the description, section title, and summary to use passive failure handling terminology.
- The explanation for `max_fails=3` said the server is marked down after 3 consecutive failures. Nginx documents `max_fails` as the number of unsuccessful attempts within the `fail_timeout` period. Updated the explanation to match the official behavior.
- The explanation for `fail_timeout=30s` only said Nginx waits 30 seconds before trying the failed server again. Nginx documents `fail_timeout` as both the failure-counting window and the time during which the server is considered unavailable. Updated the explanation accordingly.
- The upstream `keepalive 32` comment said it maintained up to 32 idle connections to each backend. Nginx documents this as a per-worker idle upstream connection cache and notes it does not limit total upstream connections. Updated the comment to avoid implying a per-backend limit.

## Review Notes
The Nginx upstream, round-robin, least connections, IP hash, weighting, backup server, proxy headers, HTTPS termination, SELinux boolean, `nginx -t`, reload, and troubleshooting commands are technically plausible for RHEL and current Nginx usage. Future improvements could mention that active periodic health checks require NGINX Plus or a separate mechanism, and that the sample `curl | grep "Server:"` verification depends on backend responses including that text.
