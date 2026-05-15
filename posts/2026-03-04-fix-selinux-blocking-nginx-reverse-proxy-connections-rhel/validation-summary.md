# Validation Summary: How to Fix SELinux Blocking Nginx Reverse Proxy Connections on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- SELinux
- NGINX
- Linux audit tooling
- Reverse proxy configuration

## Sources Consulted
- Red Hat Enterprise Linux 10 documentation, "Configuring NGINX as a reverse proxy for the HTTP traffic": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/deploying_web_servers_and_reverse_proxies/setting-up-and-configuring-nginx
- Red Hat Enterprise Linux 7 SELinux User's and Administrator's Guide, "Booleans": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/selinux_users_and_administrators_guide/sect-managing_confined_services-the_apache_http_server-booleans
- Red Hat Enterprise Linux 10 documentation, "Configuring SELinux for applications and services with non-standard configurations": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/using_selinux/configuring-selinux-for-applications-and-services-with-non-standard-configurations
- Linux audit-userspace ausearch(8) manual page: https://man7.org/linux/man-pages/man8/ausearch.8.html
- NGINX ngx_http_proxy_module documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html

## Issues Found
- The original "If Using a Non-Standard Backend Port" section implied that adding the backend port to `http_port_t` is generally required when proxying to a non-standard backend port. Red Hat documents `httpd_can_network_connect` as the normal SELinux setting for NGINX reverse proxy forwarding, while `semanage port -a -t http_port_t` is documented for port-label cases such as allowing a web service to use a non-standard HTTP port. I changed the heading and comments so the `semanage port` commands are presented as a follow-up only when audit logs still show a port-label denial and the backend should be treated as HTTP.

## Review Notes
The main diagnosis and fix are correct for RHEL: NGINX runs in the `httpd_t` SELinux domain, and Red Hat's NGINX reverse proxy procedure explicitly enables `httpd_can_network_connect` persistently. The NGINX `proxy_pass` and `proxy_set_header` directives are syntactically valid, and `ausearch --start recent` is a valid way to inspect recent AVC denials.
