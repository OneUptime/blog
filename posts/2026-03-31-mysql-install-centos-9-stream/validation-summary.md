# Validation Summary: How to Install MySQL on CentOS 9 Stream

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL 8.4 LTS / 8.0 Community Server (MySQL Yum repository, EL9)
- CentOS 9 Stream, dnf, systemd, firewalld, SELinux

## Sources Consulted
- MySQL 8.4 Reference Manual — https://dev.mysql.com/doc/refman/8.4/en/linux-installation-yum-repo.html (verified the `mysql84-community-release-el9-1.noarch.rpm` repo RPM, the `mysql-8.4-lts-community` / `mysql80-community` subrepo names for selecting the release series, that first server start auto-initializes the data directory and writes a temporary root password to the error log, and that `validate_password` enforces upper/lower/digit/special and length >= 8)

## Issues Found
- Fixed the Mermaid overview diagram: it listed `mysqld --initialize` as an explicit step followed by `systemctl start mysqld`. For the RPM/systemd install path the data directory is initialized automatically on the first `systemctl start mysqld` — you do not run `mysqld --initialize` manually. Reordered the nodes to `systemctl start mysqld -> First start auto-initializes data dir -> Retrieve temp password` to match the documented behavior (and the post's own Step 3).

## Review Notes
- The repo RPM name, the `dnf config-manager --disable mysql-8.4-lts-community` / `--enable mysql80-community` switch, `dnf install mysql-community-server`, `systemctl enable --now mysqld`, and the `grep 'temporary password' /var/log/mysqld.log` retrieval are all correct.
- The illustrative `dnf repolist` output line `mysql-tools-community  MySQL Tools Community` is a minor cosmetic simplification — newer repo RPMs label it `mysql-tools-8.4-lts-community` — but since the command pipes through `grep mysql` it is illustrative only and was left as-is.
- `mysql_secure_installation`, the firewalld rich-rule for port 3306, and the SELinux `semanage fcontext`/`restorecon`/`semanage port` commands (contexts `mysqld_db_t`, `mysqld_port_t`) are valid.
- Key file locations (`/etc/my.cnf`, `/etc/my.cnf.d/`, `/var/lib/mysql/`, `/var/log/mysqld.log`, `/run/mysqld/mysqld.pid`) match the MySQL Yum RPM layout.
