# Validation Summary: How to Configure Nginx Server Blocks (Virtual Hosts) on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Nginx server blocks / virtual hosts
- SELinux file contexts
- systemd service reloads
- TLS configuration for Nginx

## Sources Consulted
- Nginx documentation: How nginx processes a request - https://nginx.org/en/docs/http/request_processing.html
- Nginx documentation: Server names - https://nginx.org/en/docs/http/server_names.html
- Nginx documentation: ngx_http_core_module directives - https://nginx.org/en/docs/http/ngx_http_core_module.html
- Nginx documentation: ngx_http_log_module access_log directive - https://nginx.org/r/access_log
- Nginx documentation: Core functionality error_log directive - https://nginx.org/en/docs/ngx_core_module.html
- Red Hat Enterprise Linux 9 documentation: Setting up and configuring NGINX - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/deploying_web_servers_and_reverse_proxies/setting-up-and-configuring-nginx_deploying-web-servers-and-reverse-proxies
- Red Hat Enterprise Linux 9 documentation: Using SELinux - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux/using_selinux

## Issues Found
- Added `policycoreutils-python-utils` to the prerequisites because the tutorial uses `semanage`, and Red Hat documents that this package is required for SELinux management commands.
- Clarified that `server_name _` is only an invalid-name placeholder. Nginx's catch-all behavior for unmatched hosts comes from the `default_server` parameter on the `listen` directive, not from `server_name`.
- Corrected the guidance for the default RHEL Nginx server block. Leaving another `listen 80 default_server;` block in `/etc/nginx/nginx.conf` while adding `00-default.conf` with `default_server` can create a duplicate default server for the same address and port. The post now tells readers to ensure only one server block uses `default_server` for port 80.

## Review Notes
The server block syntax, `try_files` usage, log directives, SELinux context commands, `nginx -t`, `systemctl reload nginx`, `/etc/hosts` testing approach, and TLS certificate directives are technically valid for the tutorial's scope. In a production follow-up, the post could also mention opening firewall ports and adding an HTTP-to-HTTPS redirect, but those are omissions rather than correctness issues in this article.
