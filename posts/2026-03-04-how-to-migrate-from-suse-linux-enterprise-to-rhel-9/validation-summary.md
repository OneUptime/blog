# Validation Summary: How to Migrate from SUSE Linux Enterprise to RHEL 9

## Status
validated

## Post Type
Tutorial / Migration guide

## Technologies Covered
- SUSE Linux Enterprise Server
- Red Hat Enterprise Linux 9
- zypper
- systemd / systemctl
- dnf
- Red Hat Subscription Manager
- Apache HTTP Server
- MariaDB
- SELinux
- AppArmor
- rsync

## Sources Consulted
- Red Hat Convert2RHEL FAQ: https://access.redhat.com/articles/5941531
- Red Hat Enterprise Linux 9 - Registering RHEL by using Subscription Manager: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/automatically_installing_rhel/registering-rhel-by-using-subscription-manager_rhel-installer
- Red Hat Enterprise Linux 9 - Deploying web servers and reverse proxies: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/deploying_web_servers_and_reverse_proxies/deploying_web_servers_and_reverse_proxies
- Red Hat Enterprise Linux 9 - Installing and using dynamic programming languages: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/installing_and_using_dynamic_programming_languages/index
- Red Hat Enterprise Linux 9 - Configuring and using database servers: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/configuring_and_using_database_servers/index
- Red Hat Enterprise Linux 9 - Using SELinux: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux/using_selinux
- openSUSE zypper man page: https://manpages.opensuse.org/Leap-15.6/zypper/zypper.8.en.html
- systemd systemctl man page: https://www.freedesktop.org/software/systemd/man/systemctl.html
- MariaDB mariadb-dump documentation: https://mariadb.com/kb/en/mariadb-dump/

## Issues Found
- The SELinux example used `semanage`, but the package installation command did not install the RHEL package that provides it. Added `policycoreutils-python-utils` to the RHEL package installation command because Red Hat documents it as a prerequisite for `semanage`-based SELinux file-context work.
- The database migration example used `rsync` to copy `/var/lib/mysql/` directly. That is not a reliable logical migration method, especially across distributions or MariaDB versions, and it can be inconsistent if the database is running. Replaced it with a `mariadb-dump` export/import flow using `--routines`, `--events`, `--triggers`, `--single-transaction`, and `--all-databases`, which matches Red Hat and MariaDB guidance for logical backups and transfers.

## Review Notes
- The statement that SLES to RHEL should use a migration strategy rather than direct conversion is consistent with Red Hat's Convert2RHEL FAQ, which excludes SUSE from supported direct conversions.
- The `zypper se --installed-only`, `systemctl list-unit-files --state=enabled`, `dnf install`, `semanage fcontext`, `restorecon`, and web content `rsync` examples are syntactically valid for their intended tools.
- The package mapping table is intentionally high level. Real migrations still require application-specific package, service, firewall, SELinux boolean, database version, and configuration review.
