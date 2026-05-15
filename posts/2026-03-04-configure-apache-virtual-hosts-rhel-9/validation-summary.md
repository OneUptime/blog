# Validation Summary: How to Configure Apache Virtual Hosts on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Apache HTTP Server 2.4
- Apache name-based virtual hosts
- Apache IP-based virtual hosts
- SELinux file contexts
- systemd service management
- curl and local hosts-file testing

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Setting up the Apache HTTP web server": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/deploying_web_servers_and_reverse_proxies/setting-apache-http-server_deploying-web-servers-and-reverse-proxies
- Apache HTTP Server 2.4 documentation, "Name-based Virtual Host Support": https://httpd.apache.org/docs/2.4/vhosts/name-based.html
- Apache HTTP Server 2.4 documentation, "An In-Depth Discussion of Virtual Host Matching": https://httpd.apache.org/docs/2.4/en/vhosts/details.html
- Apache HTTP Server 2.4 documentation, "Core Features and Directives": https://httpd.apache.org/docs/current/en/mod/core.html

## Issues Found
- The prerequisites did not mention the package needed for the `semanage` command used in the SELinux step. Added `policycoreutils-python-utils` as a prerequisite because RHEL systems may not have `semanage` available unless that package is installed.

## Review Notes
- The virtual host examples use valid Apache 2.4 directives and match Apache's documented name-based virtual host behavior.
- Red Hat's RHEL 9 documentation shows virtual host configuration in `/etc/httpd/conf/httpd.conf`, but it also documents `/etc/httpd/conf.d/` as an auxiliary directory for included configuration files, so the post's drop-in file approach is valid for the default RHEL Apache layout.
- The custom log directory under `/var/www` needs an appropriate SELinux log context for Apache to write there; the post's `httpd_log_t` context commands address that.
