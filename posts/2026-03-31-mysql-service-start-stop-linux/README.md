# How to Start and Stop the MySQL Service on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Service, Linux, Systemd, Administration

Description: Start, stop, restart, and check the status of MySQL on Linux using systemctl, and configure the service to start automatically on boot.

---

## How It Works

On modern Linux distributions, MySQL runs as a systemd service unit. The unit file name is `mysql` on Debian/Ubuntu and `mysqld` on RHEL-based distributions. `systemctl` is the standard command to manage service state.

```mermaid
flowchart LR
    A[systemctl start mysql/mysqld] --> B[mysqld process starts]
    B --> C[Binds to port 3306]
    C --> D[Accepts connections]
    D --> E[systemctl stop mysql/mysqld]
    E --> F[Graceful shutdown]
    F --> G[Port 3306 closed]
```

## Service Name Reference

```text
Distribution                    Service name
-------------------------------------------------
Ubuntu / Debian                 mysql
CentOS / Rocky / AlmaLinux      mysqld
Fedora                          mysqld
Arch Linux                      mysqld
```

The examples below use `mysql`. Replace with `mysqld` for RHEL-based systems.

## Starting MySQL

```bash
sudo systemctl start mysql
```

## Stopping MySQL

```bash
sudo systemctl stop mysql
```

Stopping sends `SIGTERM` to mysqld, which signals active threads to terminate. Each thread finishes its current statement and then disconnects. InnoDB flushes its buffers based on the `innodb_fast_shutdown` setting before the process exits.

## Restarting MySQL

```bash
sudo systemctl restart mysql
```

A restart stops and immediately starts the service. Active connections are dropped.

## Reloading Without Restart

```bash
sudo systemctl reload mysql
```

This sends `SIGHUP` to mysqld, which flushes tables, rotates logs, and flushes the host cache. It does **not** re-read `my.cnf` or apply configuration changes. To change dynamic variables at runtime (e.g., `max_connections`), use `SET GLOBAL` from the MySQL client instead:

```sql
SET GLOBAL max_connections = 200;
```

Static variables still require a full restart after editing `my.cnf`.

## Checking the Service Status

```bash
sudo systemctl status mysql
```

```text
● mysql.service - MySQL Community Server
     Loaded: loaded (/lib/systemd/system/mysql.service; enabled; vendor preset: enabled)
     Active: active (running) since Tue 2026-03-31 10:00:00 UTC; 2h ago
    Process: 1234 ExecStartPre=/usr/share/mysql/mysql-systemd-start pre (code=exited, status=0/SUCCESS)
   Main PID: 1256 (mysqld)
     Status: "Server is operational"
      Tasks: 38 (limit: 4915)
     Memory: 370.2M
        CPU: 2.301s
     CGroup: /system.slice/mysql.service
             └─1256 /usr/sbin/mysqld

Mar 31 10:00:00 server mysqld[1256]: /usr/sbin/mysqld: ready for connections.
```

## Enabling MySQL to Start on Boot

```bash
sudo systemctl enable mysql
```

## Disabling MySQL on Boot

```bash
sudo systemctl disable mysql
```

## Enabling and Starting in One Command

```bash
sudo systemctl enable --now mysql
```

## Checking If MySQL Is Enabled on Boot

```bash
sudo systemctl is-enabled mysql
```

```text
enabled
```

## Viewing Recent MySQL Logs

```bash
sudo journalctl -u mysql -n 50
sudo journalctl -u mysql --since "1 hour ago"
sudo journalctl -u mysql -f   # follow in real time
```

## Checking the Process Directly

```bash
sudo mysqladmin -u root -p status
```

```text
Uptime: 7320  Threads: 2  Questions: 148  Slow queries: 0  Opens: 118  Flush tables: 3  Open tables: 37  Queries per second avg: 0.020
```

Or using the system process list:

```bash
ps aux | grep mysqld
```

## Checking the Listening Port

```bash
sudo ss -tlnp | grep 3306
```

```text
LISTEN   0   151   127.0.0.1:3306   0.0.0.0:*   users:(("mysqld",pid=1256,fd=23))
```

## Graceful Shutdown vs. Kill

Always use `systemctl stop` instead of `kill`. The systemd unit sends `SIGTERM` to mysqld, which flushes InnoDB buffers and writes all dirty pages cleanly before exit.

Forcibly killing (`kill -9`) can leave the database in an inconsistent state requiring crash recovery on next start.

## Summary

Managing the MySQL service on Linux uses `systemctl start`, `stop`, `restart`, and `status`. The service name is `mysql` on Debian/Ubuntu and `mysqld` on RHEL-based distributions. Use `systemctl enable` to start MySQL automatically at boot. Always stop MySQL gracefully via systemctl to ensure InnoDB flushes its buffer pool cleanly to disk.
