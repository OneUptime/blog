# Validation Summary: How to Set Up Nginx Reverse Proxy on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Nginx
- Nginx reverse proxy configuration
- Nginx upstream/load balancing configuration
- WebSocket proxying
- firewalld
- SELinux
- systemd

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Setting up and configuring NGINX: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/deploying_web_servers_and_reverse_proxies/setting-up-and-configuring-nginx_deploying-web-servers-and-reverse-proxies
- Red Hat Enterprise Linux 9 documentation: Using SELinux: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux/using_selinux
- NGINX documentation: NGINX Reverse Proxy: https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy
- NGINX documentation: WebSocket proxying: https://nginx.org/en/docs/http/websocket.html

## Issues Found
- The post description said the guide covered caching, but the article only covers proxy buffering and does not include Nginx proxy cache directives such as `proxy_cache`. Changed the description to mention timeouts and buffering instead.
- The prerequisites said Nginx must already be installed even though Step 1 installs it. Changed the prerequisite to a RHEL system.
- The SELinux note said to add an SELinux port label when "connecting to a non-standard port." Red Hat documents `semanage port -a -t http_port_t` as labeling ports HTTP services listen on, while outbound reverse proxy connections are controlled by `httpd_can_network_connect`. Changed the wording to say this applies when Nginx listens on a non-standard HTTP port.

## Review Notes
- The Nginx `proxy_pass`, `proxy_set_header`, upstream, buffering, timeout, and WebSocket examples are consistent with official Nginx documentation.
- The RHEL package installation, systemd service management, firewall commands, and `httpd_can_network_connect` SELinux boolean are consistent with Red Hat Enterprise Linux 9 documentation.
- The WebSocket example uses `proxy_set_header Connection "upgrade";`, which is valid for a WebSocket-only location. For mixed HTTP and WebSocket traffic, Nginx's documented `map $http_upgrade $connection_upgrade` pattern is more precise.
