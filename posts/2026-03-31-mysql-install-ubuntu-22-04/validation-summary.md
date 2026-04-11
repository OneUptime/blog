# Validation Summary: How to Install MySQL on Ubuntu 22.04

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0
- Ubuntu 22.04 LTS (Jammy Jellyfish)
- APT package manager
- systemd
- UFW (Uncomplicated Firewall)
- mysql_secure_installation

## Sources Consulted
- MySQL 8.0 Reference Manual: https://dev.mysql.com/doc/refman/8.0/en/
- MySQL 8.0 `mysql_secure_installation` documentation: https://dev.mysql.com/doc/refman/8.0/en/mysql-secure-installation.html
- Ubuntu 22.04 MySQL packages (Jammy): https://packages.ubuntu.com/jammy/mysql-server
- MySQL 8.0 `auth_socket` plugin documentation: https://dev.mysql.com/doc/refman/8.0/en/socket-pluggable-authentication.html
- MySQL 8.0 server system variables (`version_comment`): https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html

## Issues Found
- **Incorrect `version_comment` value in example output**: The `SHOW VARIABLES LIKE 'version%'` example showed `version_comment` as `MySQL Community`. When MySQL is installed from Ubuntu 22.04's default APT repository, the `version_comment` is `(Ubuntu)`, not `MySQL Community`. The value `MySQL Community Server - GPL` would only appear if MySQL were installed from Oracle's official MySQL APT repository. Since the post instructs readers to install from the default Ubuntu repository, the example was corrected to show `(Ubuntu)`.

## Review Notes
- All CLI commands (`apt update`, `apt install`, `systemctl`, `mysql_secure_installation`, `sudo mysql`, `ufw`) are correct and current for Ubuntu 22.04.
- SQL syntax for `CREATE USER`, `GRANT ALL PRIVILEGES`, and `FLUSH PRIVILEGES` is correct for MySQL 8.0.
- The explanation of `auth_socket` authentication for the root user is accurate for Ubuntu 22.04's default MySQL package.
- File paths (`/etc/mysql/mysql.conf.d/mysqld.cnf`, `/var/lib/mysql/`, `/var/log/mysql/error.log`, `/run/mysqld/mysqld.sock`) are all correct.
- The `SHOW VARIABLES` example only shows 3 of the ~5 variables returned by that query, which is acceptable for a tutorial but readers may see additional rows like `version_compile_machine` and `version_compile_zlib`.
- Ubuntu 22.04 reaches end of standard support in April 2027. The post remains accurate for the lifetime of the distribution.
