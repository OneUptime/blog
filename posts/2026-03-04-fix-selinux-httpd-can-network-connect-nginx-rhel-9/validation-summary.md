# Validation Summary: How to Fix SELinux httpd_can_network_connect Issues with Nginx on RHEL

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- SELinux
- NGINX
- `httpd_can_network_connect` and related SELinux booleans
- `getsebool`, `setsebool`, `ausearch`, `semanage`, and `sealert`

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Setting up and configuring NGINX": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/deploying_web_servers_and_reverse_proxies/setting-up-and-configuring-nginx_deploying-web-servers-and-reverse-proxies
- Red Hat Enterprise Linux 9 documentation, "Using SELinux": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux/using_selinux
- Red Hat Enterprise Linux 7 SELinux documentation, "Booleans": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/selinux_users_and_administrators_guide/sect-managing_confined_services-the_apache_http_server-booleans
- `httpd_selinux(8)` SELinux policy documentation: https://fedorapeople.org/~dwalsh/SELinux/httpd_selinux.html

## Issues Found
- The post listed `8080` as a standard `http_port_t` example. Red Hat's RHEL 9 SELinux documentation shows `8080` under `http_cache_port_t` in its example output, not `http_port_t`, so the example list was changed to ports documented as `http_port_t` examples.
- The post described adding a port to `http_port_t` as an alternative to `httpd_can_network_connect`. Red Hat's RHEL 9 NGINX reverse proxy documentation uses `httpd_can_network_connect` for forwarding traffic, while `semanage port` documentation covers assigning service port labels, especially for non-standard listening ports. The section and troubleshooting flow were updated to avoid presenting port labeling as a direct replacement for the outbound-connect boolean.

## Review Notes
The main fix command, `sudo setsebool -P httpd_can_network_connect on`, is technically valid; Red Hat documents the equivalent `setsebool -P httpd_can_network_connect 1` for NGINX reverse proxy forwarding. The `httpd_can_network_connect_db` and `httpd_can_network_relay` booleans are real SELinux booleans, but the least-privilege choice depends on the exact target port type and application behavior.
