# Validation Summary: How to Troubleshoot Nginx 502 Bad Gateway Errors on RHEL

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- NGINX reverse proxying and load balancing
- SELinux
- firewalld
- systemd/journalctl
- Linux socket and network troubleshooting tools

## Sources Consulted
- RFC 9110, HTTP Semantics: 502 Bad Gateway definition: https://www.rfc-editor.org/rfc/rfc9110.html
- NGINX ngx_http_proxy_module documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- NGINX ngx_http_upstream_module documentation: https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- Red Hat Enterprise Linux 9 documentation, configuring NGINX as a reverse proxy and load balancer: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/deploying_web_servers_and_reverse_proxies/setting-up-and-configuring-nginx_deploying-web-servers-and-reverse-proxies
- Red Hat Enterprise Linux 9 documentation, Using SELinux: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux/using_selinux
- firewalld firewall-cmd manual: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- Linux ausearch manual: https://man7.org/linux/man-pages/man8/ausearch.8.html
- Local `ss --help` output for socket inspection flags.

## Issues Found
- The error-log table mapped `connect() failed (13: Permission denied)` only to SELinux. That error can also be caused by Unix socket permissions, so the cause was broadened to "SELinux or socket permissions are blocking the connection."
- The `ss -tlnp` command may not show process details for sockets owned by other users unless run with sufficient privileges. Updated it to `sudo ss -tlnp | grep 3000`.
- The firewall check was ambiguous for remote backends. Updated the comment to make clear that `firewall-cmd --list-all` should be run on the backend server when checking whether the backend port is open.
- The Unix socket section said the NGINX user needs read/write access. For connecting to a Unix stream socket on Linux, write permission on the socket is the key file permission, along with directory traversal permissions, so the text now says the NGINX user needs permission to write to the socket.

## Review Notes
The guide is technically sound after these corrections. The `curl -I` examples test with HTTP HEAD, so a backend that does not support HEAD could return an application-level error even when connectivity is working; a future revision could mention using a normal GET request as a fallback. The SELinux boolean `httpd_can_network_connect` is correct for RHEL's NGINX reverse proxy use case, as documented by Red Hat.
