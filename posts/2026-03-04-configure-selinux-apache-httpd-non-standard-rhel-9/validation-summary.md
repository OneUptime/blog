# Validation Summary: How to Configure SELinux for Apache HTTPD Non-Standard Configs on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- SELinux
- Apache HTTP Server / httpd
- PHP-FPM
- NFS and CIFS file systems
- TLS certificate file labeling

## Sources Consulted
- Red Hat Enterprise Linux 9 Using SELinux: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux/using_selinux
- Red Hat Enterprise Linux 9 Deploying web servers and reverse proxies: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/deploying_web_servers_and_reverse_proxies/Red_Hat_Enterprise_Linux-9-Deploying_web_servers_and_reverse_proxies-en-US.pdf
- Red Hat Enterprise Linux 9 Installing and using dynamic programming languages: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/installing_and_using_dynamic_programming_languages/Red_Hat_Enterprise_Linux-9-Installing_and_using_dynamic_programming_languages-en-US.pdf
- httpd_selinux(8) SELinux policy manual page: https://www.unix.com/man_page/centos/8/httpd_selinux/
- sealert(8) manual page: https://www.mankier.com/8/sealert

## Issues Found
- The `httpd_sys_ra_content_t` table entry described the type as being for log directories. Updated it to describe read/append files used by scripts, matching SELinux httpd content type semantics.
- The reverse proxy section said `httpd_can_network_relay` allowed Apache to connect to any network port. Updated the wording to say it allows Apache to act as a network relay.
- The PHP-FPM section implied `httpd_can_network_connect` applies to all PHP-FPM sockets. Updated it to specify TCP connections; the existing Unix socket context check remains separate.
- The troubleshooting section piped `ausearch` output into `sealert -a -`, but `sealert -a` expects a log file path. Updated the command to `sudo sealert -a /var/log/audit/audit.log`.

## Review Notes
The remaining commands and SELinux booleans align with the referenced RHEL SELinux guidance and httpd SELinux policy documentation. Some booleans, such as `httpd_execmem`, should still be enabled only when a specific denial or application requirement justifies the broader permission.
