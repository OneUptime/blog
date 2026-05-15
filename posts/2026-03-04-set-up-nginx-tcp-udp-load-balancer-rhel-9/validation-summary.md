# Validation Summary: How to Set Up Nginx as a TCP/UDP Load Balancer on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Nginx stream module
- TCP and UDP load balancing
- TLS passthrough and SNI preread routing
- SELinux
- firewalld
- Linux networking tools

## Sources Consulted
- Nginx `ngx_stream_core_module` documentation: https://nginx.org/en/docs/stream/ngx_stream_core_module.html
- Nginx `ngx_stream_proxy_module` documentation: https://nginx.org/en/docs/stream/ngx_stream_proxy_module.html
- Nginx `ngx_stream_upstream_module` documentation: https://nginx.org/en/docs/stream/ngx_stream_upstream_module.html
- Nginx `ngx_stream_ssl_preread_module` documentation: https://nginx.org/en/docs/stream/ngx_stream_ssl_preread_module.html
- Nginx `ngx_stream_log_module` documentation: https://nginx.org/en/docs/stream/ngx_stream_log_module.html
- Red Hat Enterprise Linux 9 NGINX documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/deploying_web_servers_and_reverse_proxies/setting-up-and-configuring-nginx_deploying-web-servers-and-reverse-proxies
- Red Hat Enterprise Linux 9 SELinux documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/using_selinux/configuring-selinux-for-applications-and-services-with-non-standard-configurations_using-selinux
- firewalld `firewall-cmd` documentation: https://firewalld.org/documentation/man-pages/firewall-cmd.html

## Issues Found
- The stream include example placed `include /etc/nginx/stream.d/*.conf;` at the Nginx main context while the later included files contain bare stream `upstream` and `server` directives. Nginx documents those directives for the `stream` context, so the include now sits inside a top-level `stream {}` block.
- The SELinux example attempted to label UDP port 53 as `http_port_t`. Red Hat documents `http_port_t` as the HTTP TCP listener port type, and standard DNS port 53 is already handled by DNS port labeling. The command was removed and replaced with guidance to inspect AVC denials and add a custom policy if SELinux blocks a UDP listener.
- The summary said health checks automatically remove failing backends. The shown configuration uses Nginx OSS passive failure handling through `max_fails` and `fail_timeout`, not active health checks. The wording now describes passive failure handling accurately.

## Review Notes
The remaining Nginx stream examples use documented directives and contexts, including `listen ... udp`, `proxy_pass`, `proxy_connect_timeout`, `proxy_timeout`, `proxy_responses`, `least_conn`, `backup`, `log_format`, `access_log`, and `ssl_preread`. Active stream health checks are available in NGINX Plus, so future expansions should distinguish active checks from passive upstream failure accounting.
