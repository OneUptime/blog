# Validation Summary: How to Set Up Apache HTTP Server on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Apache HTTP Server (`httpd`)
- `dnf`
- `systemd`
- `firewalld`
- SELinux
- `logrotate`

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Deploying web servers and reverse proxies: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/deploying_web_servers_and_reverse_proxies/deploying_web_servers_and_reverse_proxies
- Red Hat Enterprise Linux 9 documentation: Using SELinux: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux/using_selinux
- Apache HTTP Server 2.4 directive documentation: https://httpd.apache.org/docs/2.4/en/mod/core.html
- Apache HTTP Server 2.4 log documentation: https://httpd.apache.org/docs/2.4/en/logs.html
- firewalld documentation: Open a Port or Service: https://firewalld.org/documentation/howto/open-a-port-or-service.html
- firewalld `firewall-cmd` manual: https://firewalld.org/documentation/man-pages/firewall-cmd.html

## Issues Found
- The example changed `/var/www/html/index.html` ownership to `apache:apache` and described it as correct ownership. Red Hat documentation states static web content only needs to be readable by the user running `httpd`, and root ownership is acceptable. Changed the example to `root:root` and described it as safe ownership for static content.
- The comment above `Require all granted` incorrectly described the directive as "Only allow access controls." Apache 2.4 uses `Require all granted` to grant access to all requests in that context. Updated the comment to accurately describe the directive.
- The comment for `ServerTokens Prod` and `ServerSignature Off` said they hide the Apache version in response headers. `ServerTokens Prod` still exposes the product name while limiting version details. Updated the comment to say it limits Apache version details in response headers and error pages.
- The SELinux `semanage` example omitted that `semanage` may require `policycoreutils-python-utils` on RHEL 9. Added a short note before the command.

## Review Notes
The main install, service management, firewalld, SELinux context, Apache configuration test, and logging commands are consistent with RHEL 9 and Apache HTTP Server 2.4 documentation. The `AllowOverride All` example is valid, but enabling `.htaccess` broadly can have performance and policy implications; a future post could recommend more limited override classes or central configuration when practical.
