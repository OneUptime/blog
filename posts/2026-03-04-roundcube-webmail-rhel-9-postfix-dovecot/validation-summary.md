# Validation Summary: How to Set Up Roundcube Webmail on RHEL with Postfix and Dovecot

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Roundcube Webmail
- Apache HTTP Server
- PHP / PHP-FPM
- MariaDB
- Postfix
- Dovecot
- Pigeonhole ManageSieve
- SELinux
- firewalld

## Sources Consulted
- Roundcube installation documentation: https://github.com/roundcube/roundcubemail/wiki/Installation
- Roundcube configuration documentation: https://github.com/roundcube/roundcubemail/wiki/Configuration
- Roundcube 1.6.15 INSTALL file: https://raw.githubusercontent.com/roundcube/roundcubemail/1.6.15/INSTALL
- Roundcube 1.6.15 defaults.inc.php: https://raw.githubusercontent.com/roundcube/roundcubemail/1.6.15/config/defaults.inc.php
- Roundcube GitHub releases: https://github.com/roundcube/roundcubemail/releases
- Red Hat Enterprise Linux 9 PHP documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/installing_and_using_dynamic_programming_languages/index
- Red Hat Enterprise Linux 9 SELinux documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux/using_selinux
- Red Hat Enterprise Linux 9 TLS / mod_ssl documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/securing_networks/planning-and-implementing-tls_securing-networks
- Apache HTTP Server mod_ssl documentation: https://httpd.apache.org/docs/2.4/mod/mod_ssl.html
- MariaDB secure installation documentation: https://mariadb.com/docs/server/clients-and-utilities/deployment-tools/mariadb-secure-installation
- Dovecot Pigeonhole ManageSieve documentation: https://doc.dovecot.org/2.3/admin_manual/pigeonhole_managesieve_server/

## Issues Found
- The dependency list omitted `mod_ssl`, which is required for Apache `SSLEngine` and TLS virtual host directives. Added `mod_ssl`.
- The dependency list omitted `php-fpm`, and RHEL 9 runs PHP through PHP-FPM by default with Apache. Added `php-fpm` and a command to enable and start it.
- The SELinux section uses `semanage`, but the required RHEL package was not installed. Added `policycoreutils-python-utils`.
- The MariaDB hardening command used the legacy `mysql_secure_installation` name. Updated it to `mariadb-secure-installation`, which is the current MariaDB command name.
- The Roundcube download used 1.6.9, which has been superseded by security releases in the maintained 1.6.x branch. Updated the download and extraction commands to 1.6.15.

## Review Notes
Roundcube 1.7.0 is the latest stable release as of this review, but the post remains on the 1.6.x LTS branch because the tutorial's package choices target broad RHEL 9 PHP compatibility. A future update could move the guide to Roundcube 1.7.x, but that should also explicitly require PHP 8.1 or newer and adjust installer notes for the new entry point.
