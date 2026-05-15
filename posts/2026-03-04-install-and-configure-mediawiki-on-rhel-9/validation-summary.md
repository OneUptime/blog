# Validation Summary: How to Install and Configure MediaWiki on RHEL

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- MediaWiki
- Apache HTTP Server
- PHP 8.2 and PHP-FPM
- MariaDB
- firewalld
- SELinux file contexts

## Sources Consulted
- MediaWiki Manual: Installation requirements: https://www.mediawiki.org/wiki/Manual:Installation_requirements
- MediaWiki Manual: Running MediaWiki on Red Hat Linux: https://www.mediawiki.org/wiki/Manual:Running_MediaWiki_on_Red_Hat_Linux
- Red Hat Enterprise Linux 9 documentation, Using the PHP scripting language: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/installing_and_using_dynamic_programming_languages/index
- Red Hat Enterprise Linux 9 documentation, Using MariaDB: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_using_database_servers/using-mariadb_configuring-and-using-database-servers

## Issues Found
- The original installation command used a placeholder package name instead of the packages needed for MediaWiki. I replaced it with RHEL 9 commands for PHP 8.2, Apache, MariaDB, required PHP extensions, and MediaWiki 1.45.3 extraction.
- The original configuration file path and service name were placeholders and did not apply to MediaWiki. I replaced them with MariaDB database/user creation and the MediaWiki web installer flow.
- The original service commands used `<service-name>`, which would not work. I replaced them with `httpd`, `php-fpm`, and `mariadb` service commands.
- The original verification and troubleshooting commands used placeholders. I replaced them with service-specific `systemctl`, `journalctl`, and package verification commands.
- The original post omitted required RHEL 9 details for PHP-FPM, SELinux contexts, and firewall access. I added minimal commands in the existing sections to make the guide executable on a default RHEL-style host.

## Review Notes
The guide now targets the current MediaWiki 1.45 release family and uses PHP 8.2 because MediaWiki's current stable requirements call for PHP 8.2 or newer. Future reviews should update the MediaWiki tarball version if a newer stable release becomes current.
