# How to Configure Database Flags for Cloud SQL MySQL Instances

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud SQL, MySQL, Database Flags, Performance Tuning

Description: A practical guide to configuring MySQL database flags in Cloud SQL to tune performance, enable logging, and customize behavior for your workload.

---

Database flags in Cloud SQL are how you configure MySQL server variables. Instead of editing a `my.cnf` file like you would on a self-hosted MySQL server, you set flags through the Cloud SQL API. These flags control everything from buffer pool sizing to query logging to connection limits. This post covers the most important flags, how to set them, and what values to use.

## How Database Flags Work in Cloud SQL

Database flags in Cloud SQL map directly to MySQL system variables. When you set a flag, Cloud SQL updates the configuration and, depending on the flag, either applies it immediately (dynamic flags) or restarts the instance (static flags).

Key points:

- Not all MySQL variables are available as Cloud SQL flags. Google restricts flags that could compromise the managed service.
- Some flags require an instance restart. Cloud SQL will tell you which ones.
- Flags persist across restarts and are stored as part of the instance configuration.

## Setting Database Flags

### Using gcloud CLI

Set one or more flags:

```bash
# Set multiple database flags at once
# This replaces ALL existing flags, so include flags you want to keep
gcloud sql instances patch my-mysql-instance \
    --database-flags=max_connections=500,slow_query_log=on,long_query_time=2
```

Important: The `--database-flags` option replaces all existing flags. If you want to add a new flag without removing existing ones, include all current flags in the command.

To see current flags:

```bash
# List current database flags for an instance
gcloud sql instances describe my-mysql-instance \
    --format="json(settings.databaseFlags)"
```

### Using Terraform

```hcl
# Terraform configuration with database flags
resource "google_sql_database_instance" "mysql" {
  name             = "my-mysql-instance"
  database_version = "MYSQL_8_0"
  region           = "us-central1"

  settings {
    tier = "db-custom-4-16384"

    database_flags {
      name  = "max_connections"
      value = "500"
    }

    database_flags {
      name  = "slow_query_log"
      value = "on"
    }

    database_flags {
      name  = "long_query_time"
      value = "2"
    }

    database_flags {
      name  = "innodb_buffer_pool_size"
      value = "10737418240"  # 10 GB in bytes
    }
  }
}
```

### Clearing All Flags

To reset all flags to their defaults:

```bash
# Clear all database flags (reset to defaults)
gcloud sql instances patch my-mysql-instance \
    --clear-database-flags
```

## Essential Performance Flags

### innodb_buffer_pool_size

This is the single most impactful MySQL performance setting. It determines how much memory InnoDB uses for caching data and indexes.

```bash
# Set InnoDB buffer pool to 10 GB
# Rule of thumb: 60-80% of your instance's available memory
gcloud sql instances patch my-mysql-instance \
    --database-flags=innodb_buffer_pool_size=10737418240
```

Cloud SQL sets a reasonable default based on your machine type, but for data-heavy workloads, you may want to increase it. The value is in bytes.

For a `db-custom-4-16384` instance (16 GB RAM), a good starting point is 10-12 GB for the buffer pool.

### max_connections

Controls how many simultaneous connections the server accepts:

```bash
# Set max connections
# Default varies by machine type, from 150 to several thousand
gcloud sql instances patch my-mysql-instance \
    --database-flags=max_connections=500
```

Do not set this higher than you need. Each connection consumes memory (roughly 1-2 MB per connection for thread stack, buffers, etc.). If you need many connections, use connection pooling instead of raising this number.

### thread_cache_size

Caches threads for reuse instead of creating new ones for each connection:

```bash
# Cache up to 50 threads for reuse
gcloud sql instances patch my-mysql-instance \
    --database-flags=thread_cache_size=50
```

## Query Logging Flags

### slow_query_log and long_query_time

Enable slow query logging to identify poorly performing queries:

```bash
# Enable slow query logging for queries taking longer than 1 second
gcloud sql instances patch my-mysql-instance \
    --database-flags=slow_query_log=on,long_query_time=1
```

View slow queries in Cloud Logging:

```bash
# View slow queries from Cloud Logging
gcloud logging read \
    'resource.type="cloudsql_database" AND resource.labels.database_id="my-project:my-mysql-instance" AND textPayload:"slow query"' \
    --limit=20 \
    --format="table(timestamp, textPayload)"
```

### log_output

Control where MySQL writes slow query logs:

```bash
# Write slow query logs to the mysql.slow_log table
gcloud sql instances patch my-mysql-instance \
    --database-flags=log_output=TABLE
```

Setting this to `TABLE` lets you query slow logs with SQL:

```sql
-- Query the slow log table for the slowest queries
SELECT
    start_time,
    query_time,
    lock_time,
    rows_examined,
    CONVERT(sql_text USING utf8) AS sql_text
FROM mysql.slow_log
ORDER BY query_time DESC
LIMIT 20;
```

### general_log

The general log records every query. Use this only for debugging, never in production:

```bash
# Enable general log temporarily for debugging
# WARNING: This generates a LOT of log data
gcloud sql instances patch my-mysql-instance \
    --database-flags=general_log=on,log_output=TABLE
```

Remember to turn it off when you are done:

```bash
# Disable general log after debugging
gcloud sql instances patch my-mysql-instance \
    --database-flags=general_log=off
```

## InnoDB Flags

### innodb_log_file_size

Controls the size of redo log files. Larger values improve write performance but increase crash recovery time:

```bash
# Set redo log file size to 1 GB
gcloud sql instances patch my-mysql-instance \
    --database-flags=innodb_log_file_size=1073741824
```

### innodb_flush_log_at_trx_commit

Controls how strictly InnoDB flushes the redo log:

- `1` (default): Flush and sync on every commit. Safest, slowest.
- `2`: Flush on every commit but sync every second. Good trade-off.
- `0`: Flush and sync every second. Fastest but risk of losing 1 second of data.

```bash
# Set to 2 for better performance with slightly less durability
# Only consider this if you have HA enabled for redundancy
gcloud sql instances patch my-mysql-instance \
    --database-flags=innodb_flush_log_at_trx_commit=2
```

For Cloud SQL with HA enabled, using `2` is a reasonable choice since the synchronous replication to the standby provides an additional safety net.

### innodb_io_capacity and innodb_io_capacity_max

Tell InnoDB how much I/O bandwidth is available:

```bash
# Set I/O capacity for SSD storage
# Increase these for high-throughput workloads on SSD
gcloud sql instances patch my-mysql-instance \
    --database-flags=innodb_io_capacity=2000,innodb_io_capacity_max=4000
```

## Connection and Timeout Flags

### wait_timeout and interactive_timeout

Control how long idle connections stay open:

```bash
# Set idle timeout to 5 minutes (300 seconds)
# Helps clean up abandoned connections
gcloud sql instances patch my-mysql-instance \
    --database-flags=wait_timeout=300,interactive_timeout=300
```

Default is 28800 seconds (8 hours), which is too long for most applications. Shorter timeouts free up connection slots faster.

### net_read_timeout and net_write_timeout

```bash
# Increase network timeouts for slow clients or large transfers
gcloud sql instances patch my-mysql-instance \
    --database-flags=net_read_timeout=60,net_write_timeout=120
```

## Character Set and Collation

### character_set_server and collation_server

```bash
# Set the default character set to UTF-8 with full Unicode support
gcloud sql instances patch my-mysql-instance \
    --database-flags=character_set_server=utf8mb4,collation_server=utf8mb4_unicode_ci
```

Always use `utf8mb4` instead of `utf8` in MySQL. The `utf8` character set in MySQL only supports 3-byte characters and does not handle emojis or certain CJK characters.

## Flags That Require Restart

Some flags require an instance restart to take effect. Cloud SQL tells you after setting the flag. Common restart-required flags include:

- `innodb_buffer_pool_size`
- `innodb_log_file_size`
- `lower_case_table_names`
- `performance_schema`

The restart happens automatically when you set the flag if it requires one.

## Verifying Flags Are Applied

After setting flags, verify they took effect:

```sql
-- Check current MySQL variable values
SHOW VARIABLES LIKE 'max_connections';
SHOW VARIABLES LIKE 'innodb_buffer_pool_size';
SHOW VARIABLES LIKE 'slow_query_log';

-- Or check all at once with a pattern
SHOW VARIABLES LIKE 'innodb%';
```

## Recommended Flag Configuration for Production

Here is a well-rounded production configuration for a `db-custom-4-16384` instance:

```bash
# Production-ready flag configuration
gcloud sql instances patch my-mysql-instance \
    --database-flags=\
max_connections=300,\
innodb_buffer_pool_size=10737418240,\
slow_query_log=on,\
long_query_time=1,\
log_output=TABLE,\
wait_timeout=600,\
interactive_timeout=600,\
innodb_flush_log_at_trx_commit=1,\
innodb_io_capacity=2000,\
character_set_server=utf8mb4,\
collation_server=utf8mb4_unicode_ci
```

## Summary

Database flags give you control over MySQL's behavior within the managed Cloud SQL environment. Start with the essentials - buffer pool sizing, connection limits, and slow query logging - and tune from there based on your monitoring data. Remember that setting flags replaces all existing flags, so always include your full flag list in each update command. And always test flag changes in a non-production environment first - some combinations can cause unexpected behavior.
