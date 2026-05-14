# Validation Summary: How to Set Up Apache Virtual Hosts on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Apache HTTP Server httpd
- Apache name-based virtual hosts
- SELinux file contexts
- systemd service management
- Linux shell commands

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Deploying web servers and reverse proxies": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/deploying_web_servers_and_reverse_proxies/deploying_web_servers_and_reverse_proxies
- Apache HTTP Server 2.4 documentation, "VirtualHost Examples": https://httpd.apache.org/docs/current/en/vhosts/examples.html
- Apache HTTP Server 2.4 documentation, "An In-Depth Discussion of Virtual Host Matching": https://httpd.apache.org/docs/current/vhosts/details.html
- Apache HTTP Server 2.4 documentation, core directives: https://httpd.apache.org/docs/current/en/mod/core.html

## Issues Found
- The SELinux section said document roots outside `/var/www/html` only needed `restorecon`. That is accurate for new directories under `/var/www`, because RHEL applies the `httpd_sys_content_t` context there by default, but paths outside `/var/www` require a persistent `semanage fcontext` rule before `restorecon`. Updated the wording to distinguish these cases.

## Review Notes
The Apache virtual host examples, `ServerName` and `ServerAlias` usage, `DocumentRoot`, `<Directory>`, `Require all granted`, per-site logs, `apachectl configtest`, `systemctl reload httpd`, and first-virtual-host default behavior are consistent with RHEL 9 and Apache HTTP Server 2.4 documentation.
