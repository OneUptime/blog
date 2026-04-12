# How to Configure the MySQL Data Directory

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Data Directory, Configuration, Storage, Administration

Description: Learn how to configure the MySQL data directory location and understand what it contains, including databases, InnoDB files, and system files.

---

The MySQL data directory is where MySQL stores all its data: database files, InnoDB tablespace files, binary logs, redo logs, and configuration that persists across restarts. Knowing its location and structure is fundamental to database administration.

## Checking the Current Data Directory

```sql
SHOW VARIABLES LIKE 'datadir';
```

On most Linux systems, the default is `/var/lib/mysql`. On macOS with Homebrew it is typically `/usr/local/var/mysql` or `/opt/homebrew/var/mysql`.

## Data Directory Structure

```text
/var/lib/mysql/
  ├── mysql/              -- System schema (user accounts, privileges)
  ├── performance_schema/ -- Performance Schema tables
  ├── sys/                -- sys schema views
  ├── your_database/      -- One directory per database
  ├── ib_buffer_pool      -- InnoDB buffer pool state
  ├── ibdata1             -- System tablespace
  ├── ib_logfile0         -- InnoDB redo log (before 8.0.30)
  ├── binlog.000001       -- Binary log files
  ├── binlog.index        -- Binary log index
  ├── mysql.ibd           -- MySQL 8.0 data dictionary
  └── auto.cnf            -- Server UUID
```

## Configuring the Data Directory in my.cnf

Set the `datadir` parameter in the `[mysqld]` section:

```ini
[mysqld]
datadir = /data/mysql
```

The directory must:
- Exist before MySQL starts
- Be owned by the `mysql` user
- Be initialized with `mysqld --initialize` if starting fresh

## Initializing a New Data Directory

If you create a new data directory, initialize it before starting MySQL:

```bash
sudo mkdir -p /data/mysql
sudo chown -R mysql:mysql /data/mysql
sudo mysqld --initialize --user=mysql --datadir=/data/mysql
```

This generates the system tables and a temporary root password, which MySQL prints to the error log:

```bash
sudo grep 'temporary password' /var/log/mysql/error.log
```

## SELinux and AppArmor Considerations

On RHEL/CentOS systems with SELinux, you must label the new directory correctly:

```bash
sudo semanage fcontext -a -t mysqld_db_t "/data/mysql(/.*)?"
sudo restorecon -Rv /data/mysql
```

On Ubuntu with AppArmor, add the new path to the MySQL AppArmor profile in `/etc/apparmor.d/usr.sbin.mysqld` and reload:

```bash
sudo systemctl reload apparmor
```

## Setting Permissions

```bash
sudo chown -R mysql:mysql /data/mysql
sudo chmod 750 /data/mysql
```

The MySQL process needs read and write access, but other users should not be able to read database files directly.

## Verifying the Configuration

After starting MySQL with the new data directory:

```sql
SHOW VARIABLES LIKE 'datadir';
SHOW DATABASES;
```

Confirm that your databases appear and that MySQL is reading from the correct location.

## Summary

The MySQL data directory is the heart of a MySQL installation - it holds all databases, InnoDB files, and server state. Configure it with the `datadir` parameter in `my.cnf`, initialize new directories with `mysqld --initialize`, and ensure correct file system permissions and security module labels before starting the server. Understanding this directory structure is essential for backup strategies and server migrations.
