# Validation Summary: How to Install Cacti Network Monitoring on RHEL

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Red Hat Enterprise Linux
- EPEL
- Cacti
- Apache HTTP Server
- MySQL
- PHP
- Net-SNMP
- RRDtool
- cron
- firewalld
- SELinux

## Sources Consulted
- Cacti official general installation instructions: https://docs.cacti.net/General-Installing-Instructions.md
- Cacti official CentOS/RHEL LAMP installation instructions: https://docs.cacti.net/Install-Under-CentOS_LAMP.md
- Cacti upstream `config.php.dist`: https://github.com/Cacti/cacti/blob/develop/include/config.php.dist
- Fedora Packages entry for the EPEL Cacti RPM: https://packages.fedoraproject.org/pkgs/cacti/cacti/epel-8.html
- Red Hat Customer Portal guidance for EPEL on RHEL: https://access.redhat.com/solutions/3358
- Red Hat EPEL setup guidance with CodeReady Builder: https://www.redhat.com/en/blog/whats-epel-and-how-do-i-use-it
- MySQL 8.0 removed/deprecated variable reference: https://dev.mysql.com/doc/refman/8.0/en/added-deprecated-removed.html
- MariaDB InnoDB file format documentation: https://mariadb.com/kb/en/innodb-file-format/

## Issues Found
- The EPEL installation command used `sudo dnf install -y epel-release`, which is not reliable on RHEL because the package is not generally provided by the default RHEL repositories. Updated it to enable CodeReady Builder and install the matching EPEL release RPM from Fedora.
- The package list included `php-posix`, which is not the standard RHEL/Fedora package name for the POSIX PHP extension. Replaced it with `php-process` and added common PHP CLI/PDO packages used by Cacti.
- The Cacti schema import path used `/usr/share/cacti/cacti.sql`, but the EPEL RPM ships the schema under `/usr/share/doc/cacti/cacti.sql`. Updated the import command.
- The database configuration path used `/usr/share/cacti/include/config.php`, while the EPEL RPM uses `/etc/cacti/db.php` for the packaged configuration. Updated the command to write `/etc/cacti/db.php`.
- The MySQL tuning snippet included `innodb_file_format` and `innodb_large_prefix`, which are removed in MySQL 8.0 and obsolete on newer MariaDB releases. Removed those directives so the configuration does not prevent modern MySQL/MariaDB from starting.
- The poller section overwrote `/etc/cron.d/cacti` even though RPM installations commonly ship that file. Changed the instruction to edit/verify the existing cron file and ensure only one poller entry is enabled.

## Review Notes
The guide is still intentionally generic across RHEL releases. Actual package names and MySQL/MariaDB service names can vary if a system uses MariaDB instead of Oracle MySQL or a third-party PHP stream, but the corrected commands now match the common EPEL Cacti RPM layout and avoid known modern database startup failures.
