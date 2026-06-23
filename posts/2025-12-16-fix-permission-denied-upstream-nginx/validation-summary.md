# Validation Summary: How to Fix '(13: Permission denied)' Upstream Connection Errors in Nginx

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Nginx reverse proxy configuration
- SELinux booleans and file contexts
- Linux Unix socket permissions
- iptables, firewalld, and nftables
- systemd service sandboxing
- Gunicorn and uWSGI Unix socket settings

## Sources Consulted
- Nginx ngx_http_upstream_module documentation: https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- Nginx ngx_http_proxy_module documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Red Hat SELinux User's and Administrator's Guide, httpd booleans: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/selinux_users_and_administrators_guide/sect-managing_confined_services-the_apache_http_server-booleans
- firewalld documentation, opening ports and services: https://firewalld.org/documentation/howto/open-a-port-or-service.html
- systemd.exec manual, PrivateNetwork and RestrictAddressFamilies: https://man.archlinux.org/man/systemd.exec.5.en
- Gunicorn settings documentation for user, group, and umask: https://gunicorn.org/reference/settings/

## Issues Found
- The firewalld example used `firewall-cmd --permanent --add-port=3000/tcp` as a fix for a local upstream connection. That command opens an inbound port in a firewalld zone and is not the correct fix for Nginx being denied an outbound or loopback connection to an upstream. Replaced it with checks for firewalld policies and rich rules that could restrict egress or loopback traffic.
- The diagnostic script called `getenforce`, `getsebool`, and `id $NGINX_USER` without handling systems where SELinux tools are absent or no Nginx worker process is running. Added fallback output for missing SELinux tools and guarded the `id` call so it does not accidentally inspect the current user when `$NGINX_USER` is empty.

## Review Notes
The SELinux guidance is broadly correct for RHEL-family systems: Red Hat documents `httpd_can_network_connect` for HTTP scripts/modules initiating network connections, `httpd_can_network_relay` for forward or reverse proxy use, and `httpd_execmem` as executable-memory related rather than socket-access related. The Nginx upstream and `proxy_pass` snippets are consistent with official Nginx syntax, including `server unix:/path` in an upstream block.
