# How to Fix MySQL Server Crashing on Startup

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Startup, Crash, Error, InnoDB

Description: Fix MySQL server crashes on startup by reading the error log, resolving InnoDB recovery issues, fixing permissions, and correcting configuration errors.

---

A MySQL server that crashes immediately on startup leaves no running process to connect to. The error log is your primary diagnostic tool. This guide covers the most common causes and their fixes.

## Start With the Error Log

The error log always records what went wrong before the crash:

```bash
sudo tail -200 /var/log/mysql/error.log
# On RHEL/CentOS
sudo tail -200 /var/log/mysqld.log
# Find the log path from my.cnf
grep -i "log_error" /etc/mysql/my.cnf /etc/my.cnf 2>/dev/null
```

Also check the system journal:

```bash
sudo journalctl -u mysql -n 100 --no-pager
```

## Cause 1: InnoDB Redo Log Corruption

A crash during InnoDB recovery will produce log lines like `InnoDB: Upgrade after a crash is not supported`.

Remove old redo log files and let InnoDB recreate them:

```bash
sudo systemctl stop mysql
sudo mv /var/lib/mysql/ib_logfile0 /tmp/ib_logfile0.bak
sudo mv /var/lib/mysql/ib_logfile1 /tmp/ib_logfile1.bak
sudo systemctl start mysql
```

## Cause 2: Configuration File Errors

A typo in `my.cnf` will prevent startup:

```bash
# Validate the configuration file
mysqld --validate-config

# Check for syntax errors
mysqld --help --verbose 2>&1 | head -20
```

Common mistakes:

```text
[mysqld]
# Wrong - missing equals sign
innodb_buffer_pool_size 2G

# Correct
innodb_buffer_pool_size = 2G
```

## Cause 3: Port Already in Use

If another process is using port 3306:

```bash
sudo ss -tlnp | grep 3306
sudo lsof -i :3306
```

Kill the conflicting process or change MySQL to a different port in `my.cnf`:

```text
[mysqld]
port = 3307
```

## Cause 4: Permission Issues on Data Directory

MySQL must own its data directory:

```bash
# Check ownership
ls -la /var/lib/mysql/

# Fix ownership
sudo chown -R mysql:mysql /var/lib/mysql
sudo chmod 750 /var/lib/mysql
```

## Cause 5: Insufficient Memory

If `innodb_buffer_pool_size` is set too high:

```bash
free -h
```

```text
[mysqld]
# Reduce if system memory is limited
innodb_buffer_pool_size = 512M
```

## Cause 6: Corrupted System Tables

If system tables are corrupted, use `--skip-grant-tables` to start:

```bash
sudo mysqld_safe --skip-grant-tables &

# Run mysql_upgrade to repair system tables
mysql_upgrade -u root
```

Then restart normally:

```bash
sudo systemctl restart mysql
```

## Check AppArmor or SELinux

Security policies can block MySQL from accessing files:

```bash
# Check AppArmor denials
sudo aa-status
sudo dmesg | grep -i apparmor

# Check SELinux denials
sudo ausearch -m avc -ts recent | grep mysql
sudo sealert -a /var/log/audit/audit.log
```

## Summary

MySQL startup crashes are diagnosed through the error log. The most common causes are InnoDB redo log corruption (remove `ib_logfile*`), configuration syntax errors (use `mysqld --validate-config`), port conflicts, permission issues on the data directory, and insufficient memory for the configured buffer pool size. Always review the full error log, not just the last line.
