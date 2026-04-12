# Validation Summary: How to Install MySQL on Fedora

## Status
validated

## Post Type
Tutorial / Installation Guide

## Technologies Covered
- MySQL 8.0 and 8.4 (Community Edition)
- Fedora Linux (38, 39, 40)
- DNF package manager
- systemd (systemctl)
- firewalld
- SELinux
- mysql_secure_installation

## Sources Consulted
- MySQL Official Yum Repository documentation: https://dev.mysql.com/doc/mysql-yum-repo-quick-guide/en/
- MySQL 8.4 Release Notes: https://dev.mysql.com/doc/relnotes/mysql/8.4/en/
- MySQL Yum Repository RPM downloads: https://dev.mysql.com/downloads/repo/yum/
- Fedora package database for `community-mysql-server` package naming
- MySQL `mysql_secure_installation` documentation: https://dev.mysql.com/doc/refman/8.4/en/mysql-secure-installation.html
- SELinux policy types for MySQL (`mysqld_db_t`)
- firewalld rich rule syntax documentation

## Issues Found
1. **Method 2 package name was incorrect**: The post used `sudo dnf install -y mysql-server`, but in Fedora's default repositories the MySQL community package is named `community-mysql-server`, not `mysql-server`. The `mysql-server` package name is only valid when the official MySQL Yum/DNF repository has been added (Method 1). Changed to `community-mysql-server`.

2. **Version output was inconsistent with installed version**: The "Verify the Installation" section showed `mysql  Ver 8.0.x  Distrib 8.0.x, for Linux (x86_64)`, but the default installation path (Method 1) installs MySQL 8.4, not 8.0. Updated to `mysql  Ver 8.4.x Distrib 8.4.x, for Linux on x86_64` to match the default 8.4 installation.

## Review Notes
- The `dnf config-manager --disable`/`--enable` syntax is correct for Fedora 38-40 (DNF4), but Fedora 41+ defaults to DNF5 which uses different syntax (`dnf config-manager setopt <repo>.enabled=0/1`). The post's stated scope (Fedora 38-40) makes this acceptable, but it may need updating as newer Fedora versions are released.
- `FLUSH PRIVILEGES` after `GRANT` is technically unnecessary in MySQL 8.0+ (GRANT automatically updates the in-memory privilege tables), but including it is not harmful and is a common convention.
- The temporary root password behavior (grep from `/var/log/mysqld.log`) applies to the official MySQL repository packages. Users installing via Method 2 (Fedora default repos) may encounter different initialization behavior depending on the Fedora version and package configuration.
- The RPM URL revision number (`-1`) in the repository setup command may change over time as Oracle publishes updates. Users should verify the current URL at https://dev.mysql.com/downloads/repo/yum/.
