# Validation Summary: How to Fix 'Job for httpd.service Failed' Systemd Service Crash on RHEL

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Red Hat Enterprise Linux
- Apache HTTP Server/httpd
- systemd/systemctl
- journalctl
- SELinux
- audit/ausearch
- OpenSSL

## Sources Consulted
- Apache HTTP Server 2.4 httpd program documentation: https://httpd.apache.org/docs/current/programs/httpd.html
- Apache HTTP Server 2.4 apachectl documentation: https://httpd.apache.org/docs/current/en/programs/apachectl.html
- Red Hat Enterprise Linux 7 System Administrator's Guide, Web Servers: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/system_administrators_guide/ch-web_servers
- Red Hat Enterprise Linux 7 System Administrator's Guide, Managing Services with systemd: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/system_administrators_guide/chap-managing_services_with_systemd
- Red Hat Enterprise Linux SELinux User's and Administrator's Guide, Apache HTTP Server SELinux port examples: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/selinux_users_and_administrators_guide/sect-managing_confined_services-the_apache_http_server-configuration_examples
- Red Hat Enterprise Linux SELinux User's and Administrator's Guide, searching AVC denials with ausearch: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/selinux_users_and_administrators_guide/sect-security-enhanced_linux-troubleshooting-fixing_problems
- Red Hat Enterprise Linux 10 Deploying web servers and reverse proxies, Apache content permissions: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/deploying_web_servers_and_reverse_proxies/setting-up-the-apache-http-web-server

## Issues Found
- The port-conflict command used `grep -E ":80|:443"`, which can also match ports such as 8080. Changed it to `grep -E ":(80|443)\b"` so it targets ports 80 and 443.
- The port-conflict remediation suggested killing a PID directly. Changed it to `systemctl stop <service-name>` to align with systemd service management on RHEL.
- The permissions fix changed ownership of `/var/www/html/` to `apache:apache`. Red Hat documents root ownership with readable content as valid/default behavior, so the fix now sets readable/searchable permissions with `chmod -R a+rX /var/www/html/`.

## Review Notes
The remaining commands are consistent with the cited Apache and Red Hat documentation. On newer RHEL releases, `dnf` is appropriate; older RHEL 7 systems commonly use `yum`, but the post is not version-pinned beyond RHEL generally.
