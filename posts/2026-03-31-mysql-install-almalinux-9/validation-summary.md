# Validation Summary: How to Install MySQL on AlmaLinux 9

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0 (AppStream module)
- MySQL 8.4 LTS (official community repository)
- AlmaLinux 9 / RHEL 9
- DNF package manager and module system
- systemctl / systemd service management
- firewalld
- SELinux (semanage, restorecon)
- mysql_secure_installation

## Sources Consulted
- MySQL 8.0 Reference Manual — Installation on Linux using RPM packages: https://dev.mysql.com/doc/refman/8.0/en/linux-installation-rpm.html
- MySQL 8.4 Reference Manual — Installation on Linux using RPM packages: https://dev.mysql.com/doc/refman/8.4/en/linux-installation-rpm.html
- MySQL community repository download page: https://dev.mysql.com/downloads/repo/yum/
- AlmaLinux 9 AppStream documentation and package listings
- Red Hat Enterprise Linux 9 documentation on DNF module streams
- firewalld official documentation: https://firewalld.org/documentation/
- Red Hat SELinux documentation for MySQL contexts

## Issues Found
1. **Missing `dnf module disable mysql` step in Method 2**: When installing MySQL from the official MySQL community repository on AlmaLinux 9, the default AppStream MySQL module must be disabled first. Without this step, DNF prioritizes the AppStream module packages, causing conflicts or installing the wrong version. Added `sudo dnf module disable mysql -y` between the repository RPM install and the `mysql-community-server` install.

## Review Notes
- The `mysql84-community-release-el9-1.noarch.rpm` package enables the MySQL 8.4 repository by default, so Method 2 installs MySQL 8.4 LTS rather than 8.0. The post correctly mentions both versions in the "How It Works" section, but readers should be aware the two methods install different MySQL versions.
- The `FLUSH PRIVILEGES` after `ALTER USER` is not strictly necessary (ALTER USER automatically updates the privilege tables), but it is harmless and follows a common convention.
- The `SHOW PROCESSLIST` command shown in the "Verify the Installation" section would need to be run inside a MySQL session (e.g., `mysql -u root -p`), which is not explicitly shown but is implied by the SQL code block.
- All firewalld and SELinux commands are correct. The `mysqld_db_t` SELinux context type is the proper label for custom MySQL data directories.
- All MySQL tuning parameters in the production tips section are valid and use sensible defaults for a production environment.
