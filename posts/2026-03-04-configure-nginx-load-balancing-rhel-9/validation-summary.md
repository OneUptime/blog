# Validation Summary: How to Configure Nginx Load Balancing on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Nginx HTTP reverse proxy and load balancing
- Nginx upstream configuration
- SELinux booleans
- TLS termination

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Setting up and configuring NGINX": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/deploying_web_servers_and_reverse_proxies/setting-up-and-configuring-nginx_deploying-web-servers-and-reverse-proxies
- Nginx official documentation, "Using nginx as HTTP load balancer": https://nginx.org/en/docs/http/load_balancing.html
- Nginx official reference, "Module ngx_http_upstream_module": https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- NGINX documentation, "HTTP Health Checks": https://docs.nginx.com/nginx/admin-guide/load-balancer/http-health-check/

## Issues Found
- The weighted round-robin example comment said the most powerful server gets twice the traffic, but the configured weights were 3, 2, and 1. Changed the comment to say higher weights receive proportionally more traffic.
- The IP hash explanation said the same client IP always goes to the same backend. Official Nginx documentation notes that requests can go to another server when the selected server is unavailable. Updated the wording to include that exception.

## Review Notes
The configuration snippets use valid Nginx upstream syntax for round-robin, weighted round-robin, least connections, IP hash, passive health checks, backup servers, down servers, proxying, and TLS termination. The RHEL SELinux boolean requirement matches Red Hat documentation for allowing Nginx to forward traffic.
