# Validation Summary: How to Install MySQL on Rocky Linux 9

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0 / 8.4 LTS
- Rocky Linux 9 (RHEL 9 rebuild)
- DNF package manager and AppStream modules
- firewalld
- SELinux
- systemd

## Sources Consulted
- MySQL 8.0 Reference Manual — Installation on Linux using RPM packages: https://dev.mysql.com/doc/refman/8.0/en/linux-installation-rpm.html
- MySQL 8.4 Reference Manual — MySQL Yum Repository: https://dev.mysql.com/doc/refman/8.4/en/linux-installation-yum-repo.html
- Rocky Linux 9 documentation and RHEL 9 AppStream module documentation: https://docs.rockylinux.org/
- Red Hat Enterprise Linux 9 documentation — Managing MySQL: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9
- firewalld documentation — Rich Rules: https://firewalld.org/documentation/man-pages/firewalld.richlanguage.html
- SELinux reference for MySQL contexts (mysqld_db_t)

## Issues Found
No technical issues found.

## Review Notes
- The `dnf module enable mysql:8.0` step is valid but may be unnecessary on Rocky Linux 9, where MySQL 8.0 is often the default AppStream module stream. Including it is not harmful and provides explicitness for readers.
- The `FLUSH PRIVILEGES` command after `GRANT` is technically redundant in MySQL 8.0 (the server automatically reloads grant tables after `GRANT` statements), but it is a widely used convention and not incorrect.
- The MySQL community repository RPM filename (`mysql84-community-release-el9-1.noarch.rpm`) may change as new minor releases are published. Readers should check https://dev.mysql.com/downloads/repo/yum/ for the latest RPM name.
- The collation `utf8mb4_unicode_ci` is a valid choice; readers should be aware that the default collation in MySQL 8.0+ is `utf8mb4_0900_ai_ci`, which provides better Unicode support based on UCA 9.0.
