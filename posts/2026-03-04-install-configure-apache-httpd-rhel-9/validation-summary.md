# Validation Summary: How to Install and Configure Apache httpd on RHEL

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
- Apache configuration directives

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Deploying web servers and reverse proxies": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/deploying_web_servers_and_reverse_proxies/deploying_web_servers_and_reverse_proxies
- Red Hat Enterprise Linux 9 documentation, "Using SELinux": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux/using_selinux
- Apache HTTP Server 2.4 documentation, core directives: https://httpd.apache.org/docs/current/en/mod/core.html
- Apache HTTP Server 2.4 documentation, binding to addresses and ports: https://httpd.apache.org/docs/current/bind.html
- Apache HTTP Server 2.4 documentation, MPM common directives including `Listen`: https://httpd.apache.org/docs/current/en/mod/mpm_common.html
- Red Hat Enterprise Linux 9 documentation, IdM Apache server log file reference: https://docs.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/html-single/accessing_identity_management_services/index

## Issues Found
- The installation text said the command installed "supporting tools," but the command only installs the `httpd` package. Changed the sentence to say it installs the `httpd` package.
- The firewall step opened HTTPS alongside HTTP even though the guide does not configure TLS. Kept the command but clarified that HTTPS is optional and intended for later TLS configuration.
- The SELinux custom-directory example used `semanage` without ensuring the required SELinux management package is installed. Added `sudo dnf install -y policycoreutils-python-utils` before the `semanage fcontext` command.

## Review Notes
The remaining commands, paths, service names, Apache directives, default document root, log paths, and SELinux label guidance match the official Red Hat Enterprise Linux 9 and Apache HTTP Server 2.4 documentation. The post does not configure TLS certificates or virtual hosts; those are correctly presented as future next steps rather than completed setup.
