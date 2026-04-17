# How to Debug ClickHouse Server Startup Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Startup, Debug, Server, Troubleshooting

Description: Debug ClickHouse server startup failures by reading error logs, checking config syntax, validating ports, and resolving permission issues.

---

When ClickHouse fails to start, it exits immediately without accepting connections. Debugging requires reading the error log, validating configuration, and checking system resources.

## Check the Service Status

```bash
sudo systemctl status clickhouse-server
# Look for the last few lines explaining the failure
```

## Read the Error Log

```bash
sudo tail -100 /var/log/clickhouse-server/clickhouse-server.err.log
sudo tail -100 /var/log/clickhouse-server/clickhouse-server.log
```

Common startup failure messages:
- `Configuration file is not correct XML` - syntax error in config
- `Address already in use` - port conflict
- `Permission denied` - filesystem permission issue
- `Cannot allocate memory` - insufficient RAM
- `Checksum doesn't match` - corrupted data part

## Validate Configuration Files

ClickHouse does not ship a built-in config validator, so check XML syntax with `xmllint`:

```bash
xmllint --noout /etc/clickhouse-server/config.xml && echo "OK"
xmllint --noout /etc/clickhouse-server/users.xml && echo "OK"
```

To verify that applied values are correct, start the server and query `system.server_settings`.

## Check for Port Conflicts

```bash
sudo ss -tlnp | grep -E "9000|8123|9009|9440"
```

If ports are occupied by another process:

```bash
sudo lsof -i :9000
```

Change the port in `config.xml` or stop the conflicting process.

## Check Disk Space and Inodes

```bash
df -h /var/lib/clickhouse
df -i /var/lib/clickhouse  # Check inodes
```

## Check File Permissions

```bash
ls -la /var/lib/clickhouse/
ls -la /var/log/clickhouse-server/
ls -la /etc/clickhouse-server/
```

Expected owner is `clickhouse:clickhouse`:

```bash
sudo chown -R clickhouse:clickhouse /var/lib/clickhouse
sudo chown -R clickhouse:clickhouse /var/log/clickhouse-server
```

## Run in Foreground for Better Output

```bash
sudo -u clickhouse clickhouse-server --config=/etc/clickhouse-server/config.xml
```

This prints all startup output directly to the terminal.

## Check for Corrupted Metadata

If startup fails with "cannot read metadata":

```bash
ls /var/lib/clickhouse/metadata/
# Check for empty or corrupted .sql files
find /var/lib/clickhouse/metadata/ -size 0 -name "*.sql"
```

Remove empty metadata files (the tables will disappear but the server will start):

```bash
sudo rm /var/lib/clickhouse/metadata/my_database/broken_table.sql
```

## Summary

ClickHouse startup failures are diagnosed by reading `/var/log/clickhouse-server/clickhouse-server.err.log`, validating config XML syntax, checking port conflicts and filesystem permissions, and running the server in the foreground for immediate output. Corrupted metadata files and disk space exhaustion are the most common non-obvious causes.
