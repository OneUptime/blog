# Validation Summary: How to Install LibreNMS Network Monitoring on RHEL

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- RHEL
- LibreNMS
- Nginx
- PHP-FPM / PHP 8.2
- MariaDB
- SNMP / Net-SNMP
- systemd timers
- cron
- firewalld
- SELinux

## Sources Consulted
- LibreNMS official installation documentation: https://docs.librenms.org/Installation/Install-LibreNMS/
- LibreNMS official updating documentation for Composer dependency handling: https://docs.librenms.org/General/Updating/
- Red Hat Enterprise Linux 9 dynamic languages documentation for PHP 8.2 module availability: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/installing_and_using_dynamic_programming_languages/installing_and_using_dynamic_programming_languages
- Red Hat Enterprise Linux 9 SELinux documentation for semanage fcontext and restorecon usage: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux/using_selinux
- Red Hat Enterprise Linux 9 firewalld documentation for firewall-cmd service rules: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/using-and-configuring-firewalld_firewall-packet-filters
- PHP manual for date.timezone configuration: https://www.php.net/manual/en/datetime.configuration.php

## Issues Found
- The prerequisite package list was incomplete for a current LibreNMS install. Added missing packages such as `acl`, `curl`, `mtr`, `nmap`, `php-gmp`, Python helper packages, and `bash-completion`, and changed the PyMySQL package name to the RHEL-family package form used by LibreNMS documentation.
- The post did not ensure a supported PHP version. LibreNMS currently requires PHP 8.2 or newer, so the prerequisite commands now enable the `php:8.2` module before PHP packages are installed.
- MariaDB settings were applied after the database had already been created. Moved the LibreNMS MariaDB settings before starting and configuring MariaDB so the server starts with the intended settings.
- The PHP-FPM socket path did not match current LibreNMS Nginx examples. Updated the pool and Nginx `fastcgi_pass` to use `/run/php-fpm-librenms.sock`.
- The Nginx PHP location block was less precise than the LibreNMS reference configuration. Updated it to use the LibreNMS-compatible PHP regex, `fastcgi_split_path_info`, `fastcgi.conf`, and the broader hidden-file deny rule.
- PHP-FPM was restarted but not enabled for boot. Added `systemctl enable php-fpm`.
- The SNMP setup omitted the LibreNMS `distro` helper script. Added the documented download and executable permission commands.
- The scheduler setup omitted log rotation. Added the provided LibreNMS logrotate configuration copy step.
- The SELinux commands used a broad, non-persistent `chcon` over all of `/opt/librenms`. Replaced it with the LibreNMS-documented persistent `semanage fcontext` rules, `restorecon`, and required SELinux booleans.

## Review Notes
The guide still uses plain HTTP for the initial web installer, matching the scope of the original post. For production use, HTTPS and additional web hardening should be added after installation.
