# How to Fix ERROR 1153 Packet Bigger Than max_allowed_packet in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Error, Troubleshooting, Configuration, Database

Description: Learn how to fix MySQL ERROR 1153 Got a packet bigger than max_allowed_packet by increasing the limit in config or per session.

---

## What Is ERROR 1153?

```text
ERROR 1153 (08S01): Got a packet bigger than 'max_allowed_packet' bytes
```

This error occurs when MySQL receives or sends a packet larger than the configured `max_allowed_packet` limit. Common triggers include:

- Importing a large SQL dump
- Inserting a large BLOB or TEXT field
- Running a stored procedure with large intermediate data
- Replication with large binary log events

## Check the Current Setting

```sql
SHOW VARIABLES LIKE 'max_allowed_packet';
```

The default is 4 MB in older MySQL versions and 64 MB in MySQL 8.0. If you are inserting large payloads, you may need to increase this.

## Fix 1: Increase max_allowed_packet in the Config File

Edit `/etc/mysql/mysql.conf.d/mysqld.cnf` or `/etc/my.cnf`:

```ini
[mysqld]
max_allowed_packet = 256M

[mysql]
max_allowed_packet = 256M
```

The `[mysqld]` section controls what the server accepts. The `[mysql]` section controls the client. Set both if you use the CLI client.

Restart MySQL to apply:

```bash
sudo systemctl restart mysql
```

## Fix 2: Set max_allowed_packet at Runtime (Server)

You can change it without restarting, but it only affects new connections:

```sql
SET GLOBAL max_allowed_packet = 268435456;  -- 256 MB
```

Verify:

```sql
SHOW GLOBAL VARIABLES LIKE 'max_allowed_packet';
```

Note: This does not persist across restarts. Always update the config file for a permanent fix.

## Fix 3: Set max_allowed_packet for the Current Connection

Note: In MySQL, `max_allowed_packet` is a session-readable but only globally settable variable. To change it for new connections without a restart, use `SET GLOBAL`:

```sql
SET GLOBAL max_allowed_packet = 268435456;
```

Then reconnect for the new value to take effect on your session.

## Fix 4: Increase When Using mysqldump or mysql CLI

When importing a dump, pass the flag on the command line:

```bash
mysql --max_allowed_packet=256M -u root -p mydb < dump.sql
```

When creating a dump:

```bash
mysqldump --max-allowed-packet=256M -u root -p mydb > dump.sql
```

## Checking the Actual Packet Size

If you are not sure what is triggering the error, check the size of the data being inserted:

```sql
SELECT LENGTH(large_column) FROM my_table WHERE id = 123;
```

Compare that value (in bytes) against `max_allowed_packet`.

## Replication and Binary Log Considerations

If the error appears in replication, the `max_allowed_packet` on the replica must be at least as large as on the source. Set it identically on all servers in the replication chain.

Also check `slave_max_allowed_packet` (MySQL 5.7) or `replica_max_allowed_packet` (MySQL 8.0):

```sql
SHOW VARIABLES LIKE 'slave_max_allowed_packet';
SHOW VARIABLES LIKE 'replica_max_allowed_packet';
```

## Recommended Values

| Scenario | Suggested Value |
|---|---|
| Standard OLTP | 64M (default in 8.0) |
| Bulk inserts / BLOB data | 256M |
| Large dump imports | 512M |
| Maximum allowed | 1G |

## Summary

ERROR 1153 is resolved by increasing `max_allowed_packet` in `my.cnf` under both `[mysqld]` and `[mysql]` sections, then restarting MySQL. For one-time imports, pass `--max_allowed_packet=256M` directly to the `mysql` or `mysqldump` command. Set consistent values across all servers in a replication topology to prevent replica errors.
