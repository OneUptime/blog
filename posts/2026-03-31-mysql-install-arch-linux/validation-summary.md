# Validation Summary: How to Install MySQL on Arch Linux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL / MariaDB
- Arch Linux (pacman package manager)
- systemd service management
- SQL (user and database creation)

## Sources Consulted
- Arch Wiki: MySQL — https://wiki.archlinux.org/title/MySQL
- Arch Wiki: MariaDB — https://wiki.archlinux.org/title/MariaDB
- AUR package listing for `mysql` — https://aur.archlinux.org/packages/mysql
- Arch Linux package database (`extra` repository)
- MariaDB Knowledge Base: mariadb-install-db — https://mariadb.com/kb/en/mariadb-install-db/
- MySQL 8.0 Reference Manual: Initializing the Data Directory — https://dev.mysql.com/doc/refman/8.0/en/data-directory-initialization.html

## Issues Found

1. **Oracle MySQL incorrectly described as being in `extra` repository**: The post claimed Oracle MySQL is available via `pacman -S mysql` from the `extra` repo. In reality, `pacman -S mysql` installs MariaDB (Arch's official MySQL implementation). Oracle MySQL is only available from the AUR. Fixed the intro, notes, and relevant sections to correctly identify MariaDB as the installed package.

2. **Wrong initialization command**: The post used `mysqld --initialize --user=mysql`, which is an Oracle MySQL command. MariaDB (what Arch actually installs) uses `mariadb-install-db --user=mysql --basedir=/usr --datadir=/var/lib/mysql`. Fixed the command and removed the temporary password retrieval step (MariaDB initializes with an empty root password, unlike Oracle MySQL which generates a temp password).

3. **Wrong service name**: The post used `mysqld.service` throughout. On Arch Linux with MariaDB, the correct service name is `mariadb.service`. Fixed all `systemctl` commands.

4. **Wrong configuration file path**: The post listed `/etc/mysql/my.cnf` as the primary config file. This is a Debian/Ubuntu convention. On Arch Linux, the config file is `/etc/my.cnf` with modular configs in `/etc/my.cnf.d/`. Fixed the Key File Locations section and the Custom Configuration section.

5. **Wrong error log path**: The post listed `/var/log/mysql/mysqld.log` as the error log. This path does not exist on Arch by default. MariaDB on Arch logs to the systemd journal (`journalctl -u mariadb`). Removed the incorrect path from Key File Locations.

6. **Incorrect temp password retrieval step**: The post included `sudo grep 'temporary password' /var/log/mysql/mysqld.log`. This is specific to Oracle MySQL and would fail on Arch since MariaDB doesn't generate a temp password and that log file doesn't exist. Removed this step and updated the secure installation instructions to note that root starts with an empty password.

7. **Misleading version output**: The `mysql --version` output showed Oracle MySQL 8.0.x format. Since MariaDB is installed, the output shows MariaDB's version string. Fixed the example output.

8. **Description said "community repository"**: The Arch `community` repository was merged into `extra` in 2023. Changed to "official repository."

## Review Notes
- The SQL commands in Step 6 (CREATE DATABASE, CREATE USER, GRANT) are standard SQL and work identically on both MariaDB and Oracle MySQL. No changes needed.
- The `mysql` and `mysql_secure_installation` command-line tools are provided by MariaDB as compatibility symlinks, so those command names remain correct.
- If a future version of this post wants to cover Oracle MySQL specifically, it would need to use AUR installation (e.g., `git clone https://aur.archlinux.org/mysql.git && cd mysql && makepkg -si`) and the Oracle MySQL-specific initialization flow.
- The custom configuration example uses `innodb_buffer_pool_size`, `max_connections`, `slow_query_log`, and `long_query_time`, all of which are supported by MariaDB.
