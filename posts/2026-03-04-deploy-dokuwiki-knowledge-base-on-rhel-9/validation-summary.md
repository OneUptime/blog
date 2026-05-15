# Validation Summary: How to Deploy DokuWiki Knowledge Base on RHEL

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Red Hat Enterprise Linux 9 / CentOS Stream 9
- DokuWiki
- Apache HTTP Server (`httpd`)
- PHP and PHP-FPM
- SELinux file contexts
- `systemd`, `dnf`, `firewalld`, and `journalctl`

## Sources Consulted
- DokuWiki project repository and installation reference: https://github.com/dokuwiki/dokuwiki and https://www.dokuwiki.org/install
- DokuWiki stable download endpoint: https://download.dokuwiki.org/
- Red Hat Enterprise Linux 9 Apache HTTP Server documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/deploying_web_servers_and_reverse_proxies/setting-apache-http-server_deploying-web-servers-and-reverse-proxies
- Red Hat Enterprise Linux 9 PHP-FPM with Apache documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/installing_and_using_dynamic_programming_languages/red_hat_enterprise_linux-9-installing_and_using_dynamic_programming_languages-en-us.pdf
- PHP manual for DNF-based package installation: https://www.php.net/manual/en/install.unix.dnf.php
- Local `systemctl --help` and `journalctl --help` output for command and flag validation.

## Issues Found
- The original post used placeholder paths and service names such as `/etc/<service>/config.conf` and `<service-name>`, which are not valid for DokuWiki. Replaced them with RHEL 9 commands for installing and managing `httpd` and `php-fpm`.
- The post did not include an actual DokuWiki installation method. Added commands to download the current stable DokuWiki tarball and extract it under `/var/www/html/dokuwiki`.
- The original configuration guidance referred to generic listening addresses, authentication settings, and logging options. Replaced it with an Apache alias and directory configuration appropriate for serving DokuWiki.
- The post omitted PHP-FPM, which is the default way RHEL 9 runs PHP with Apache. Added `php-fpm` installation, enablement, status checks, and logs.
- The post omitted SELinux handling for DokuWiki writable directories. Added `httpd_sys_rw_content_t` contexts for `conf` and `data` so the installer and wiki can write required files.
- The package verification command used a placeholder package name. Replaced it with concrete package checks for Apache, PHP-FPM, and required PHP extensions.

## Review Notes
The corrected guide uses plain HTTP for brevity. A production deployment should also add TLS, backups, and stricter access controls according to the site's requirements.
