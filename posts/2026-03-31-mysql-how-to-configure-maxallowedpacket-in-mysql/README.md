# How to Configure max_allowed_packet in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Configuration, Max_allowed_packet, Performance Tuning

Description: Learn how to configure max_allowed_packet in MySQL to handle large queries, BLOB data, and replication events without packet size errors.

---

## What Is max_allowed_packet

`max_allowed_packet` sets the maximum size of a single packet or row that MySQL can send or receive. When a query, row, or replication event exceeds this limit, MySQL returns an error:

```text
ERROR 1153 (08S01): Got a packet bigger than 'max_allowed_packet' bytes
```

Common causes:
- Inserting large BLOB or TEXT data
- Long SQL strings
- Large replication events
- Large result sets from stored procedures

## View the Current Setting

```sql
SHOW VARIABLES LIKE 'max_allowed_packet';
```

```text
+--------------------+----------+
| Variable_name      | Value    |
+--------------------+----------+
| max_allowed_packet | 67108864 |
+--------------------+----------+
```

The default is 64 MB in MySQL 8.0 (was 4 MB in older versions). The value is in bytes.

## Set max_allowed_packet Dynamically

```sql
SET GLOBAL max_allowed_packet = 128 * 1024 * 1024;  -- 128 MB
```

Note: This affects new connections. Existing connections use the previous value.

## Make the Change Persistent in my.cnf

```ini
[mysqld]
max_allowed_packet = 128M
```

Also set it for the MySQL client to allow large queries from the CLI:

```ini
[mysqld]
max_allowed_packet = 128M

[mysql]
max_allowed_packet = 128M

[mysqldump]
max_allowed_packet = 128M
```

Restart MySQL to apply:

```bash
sudo systemctl restart mysql
```

## Recommended Values by Use Case

| Use Case | Recommended Value |
|---|---|
| Default OLTP workloads | 64M (default) |
| BLOB/TEXT storage | 128M - 256M |
| Replication with large transactions | 256M - 512M |
| mysqldump with large tables | 512M - 1G |

The maximum allowed value is 1 GB (1073741824 bytes).

## Diagnosing Packet Size Issues

Check if errors are occurring:

```sql
SHOW STATUS LIKE 'Aborted_connects';
SHOW STATUS LIKE 'Aborted_clients';
```

Review the MySQL error log:

```bash
sudo tail -100 /var/log/mysql/error.log | grep -i packet
```

## max_allowed_packet and Replication

Large transactions on the primary can be blocked from replication if the replica's `max_allowed_packet` is smaller. Set the same value on all servers:

```sql
-- Check on primary
SHOW VARIABLES LIKE 'max_allowed_packet';

-- Set on replica to match
SET GLOBAL max_allowed_packet = 134217728;  -- 128M
```

## Working with BLOB Data

When inserting BLOB data, ensure `max_allowed_packet` is set on the server. Since this is a server-side setting, you cannot pass it as a connection parameter. Instead, set it via SQL after connecting:

```python
# Python mysql-connector example
import mysql.connector

conn = mysql.connector.connect(
    host='localhost',
    user='root',
    password='secret',
    database='mydb'
)

cursor = conn.cursor()
cursor.execute("SET GLOBAL max_allowed_packet = 134217728")  # 128 MB
cursor.close()
```

## Summary

`max_allowed_packet` controls the maximum size of data packets in MySQL. Increase it when inserting large BLOBs, running mysqldump on large tables, or experiencing replication errors on large events. Set it consistently in `[mysqld]`, `[mysql]`, and `[mysqldump]` sections of `my.cnf`, and ensure replicas match the primary's value.
