# Validation Summary: How to Set Up MySQL on AWS EC2

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0
- AWS EC2
- Ubuntu 22.04
- Amazon Linux 2023
- AWS EBS (gp3)
- AWS Security Groups
- AppArmor

## Sources Consulted
- MySQL 8.0 Reference Manual: Installing MySQL on Linux Using the MySQL Yum Repository (https://dev.mysql.com/doc/refman/8.0/en/linux-installation-yum-repo.html)
- MySQL 8.0 Reference Manual: Server System Variables — socket (https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_socket)
- MySQL 8.0 Reference Manual: InnoDB Startup Configuration — innodb_log_file_size (https://dev.mysql.com/doc/refman/8.0/en/innodb-init-startup-configuration.html)
- MySQL 8.0 Reference Manual: innodb_redo_log_capacity (https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_redo_log_capacity)
- AWS Documentation: Amazon Linux 2023 package management (https://docs.aws.amazon.com/linux/al2023/ug/)
- Ubuntu 22.04 MySQL packages (https://packages.ubuntu.com/jammy/mysql-server)

## Issues Found

### 1. Missing MySQL Yum repository setup for Amazon Linux 2023
- **What was wrong:** The post showed `sudo dnf install -y mysql-community-server` directly, but the `mysql-community-server` package is not available in the default Amazon Linux 2023 repositories. The command would fail with "No match for argument."
- **What was changed:** Added the MySQL Yum repository installation step (`sudo dnf install -y https://dev.mysql.com/get/mysql80-community-release-el9-1.noarch.rpm`) before the `dnf install` command. AL2023 is RHEL 9-compatible, so the `el9` RPM is correct.
- **Why:** Without this step, MySQL cannot be installed on Amazon Linux 2023. The default repos only include MariaDB.

### 2. Missing [client] section for custom socket path
- **What was wrong:** The MySQL config update changed the socket path to `/data/mysql/mysql.sock` in the `[mysqld]` section but did not include a corresponding `[client]` section. This means the `mysql` command-line client (and other tools) would still look for the socket at the default path (`/var/run/mysqld/mysqld.sock`) and fail with `ERROR 2002 (HY000): Can't connect to local MySQL server through socket`.
- **What was changed:** Added a `[client]` section with `socket=/data/mysql/mysql.sock` to the config snippet so client tools use the same socket path as the server.
- **Why:** Without this, every `mysql` client invocation after the data directory move would require `--socket=/data/mysql/mysql.sock`, and the verify command shown later in the post would fail.

## Review Notes
- `innodb_log_file_size` is deprecated as of MySQL 8.0.30 in favor of `innodb_redo_log_capacity`. The variable still works in all MySQL 8.0.x versions, so this is not incorrect for the stated target (MySQL 8.0), but readers on newer minor versions will see a deprecation warning. A future update could mention `innodb_redo_log_capacity` as the replacement for MySQL 8.0.30+.
- `FLUSH PRIVILEGES` after `GRANT` is technically unnecessary in MySQL 8.0 (the privilege tables are updated automatically by `GRANT`), but it is not harmful and is a common convention. Not changed.
- The `/etc/fstab` entry uses a device name (`/dev/nvme1n1`) rather than a UUID. Using `UUID=<uuid>` (obtainable via `sudo blkid`) is more reliable since NVMe device names can change across reboots or instance stops. This is a best-practice improvement rather than an error.
- The r6i.xlarge instance spec (4 vCPU, 32 GB RAM) is correct.
- The AppArmor alias approach for allowing the new data directory is correct for Ubuntu.
