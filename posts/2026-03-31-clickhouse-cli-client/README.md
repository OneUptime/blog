# How to Use ClickHouse CLI (clickhouse-client)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, CLI, Administration, Query, Shell

Description: Learn how to use clickhouse-client for interactive queries, non-interactive scripting, file imports, format selection, and query profiling from the command line.

---

`clickhouse-client` is the official command-line interface for ClickHouse. It uses the native binary protocol for fast query execution and supports interactive mode, non-interactive scripting, file-based input, multiple output formats, and query profiling. It is installed alongside every ClickHouse server and is available as a standalone binary.

## Installation

```bash
# On systems with ClickHouse server installed, clickhouse-client is already available
clickhouse-client --version

# Install standalone on Debian/Ubuntu
sudo apt-get install clickhouse-client

# Install on macOS via Homebrew
brew install clickhouse
```

## Connect to a Server

```bash
# Local connection (defaults: host=localhost, port=9000, user=default)
clickhouse-client

# Remote server
clickhouse-client --host clickhouse.example.com --port 9000 \
  --user default --password secret --database analytics
```

## Interactive Mode

After connecting, you get a SQL prompt:

```text
ClickHouse client version 24.3.1.
Connecting to localhost:9000 as user default.
Connected to ClickHouse server version 24.3.1.

:) SELECT version();

SELECT version()

Query id: a1b2c3d4-...

   ┌─version()─────┐
1. │ 24.3.1.2672   │
   └───────────────┘

1 row in set. Elapsed: 0.001 sec.

:)
```

## Non-Interactive (Scripting) Mode

```bash
# Pass a query with --query
clickhouse-client --query "SELECT count() FROM events"

# Use -q as shorthand
clickhouse-client -q "SELECT user_id, count() FROM events GROUP BY user_id LIMIT 5"

# Pass a query via stdin
echo "SELECT 1" | clickhouse-client
```

## Output Formats

```bash
# Default: Pretty printed table
clickhouse-client -q "SELECT 1 AS one, 2 AS two"

# TSV (tab-separated)
clickhouse-client --format TSV -q "SELECT user_id, count() FROM events GROUP BY user_id LIMIT 10"

# CSV with header
clickhouse-client --format CSVWithNames -q "SELECT user_id, count() AS cnt FROM events GROUP BY user_id"

# JSON
clickhouse-client --format JSON -q "SELECT user_id, count() AS cnt FROM events GROUP BY user_id LIMIT 3"

# JSONEachRow (NDJSON)
clickhouse-client --format JSONEachRow -q "SELECT user_id, count() AS cnt FROM events GROUP BY user_id LIMIT 3"

# Vertical (one column per line)
clickhouse-client --format Vertical -q "SELECT * FROM events LIMIT 1"
```

## Execute a SQL File

```bash
clickhouse-client --queries-file /path/to/migration.sql
```

Or pipe it:

```bash
clickhouse-client < /path/to/migration.sql
```

## Import Data from a File

```bash
# Import CSV
clickhouse-client --query "INSERT INTO events FORMAT CSV" < data.csv

# Import CSV with headers (skip header row)
clickhouse-client --query "INSERT INTO events FORMAT CSVWithNames" < data_with_headers.csv

# Import NDJSON
clickhouse-client --query "INSERT INTO events FORMAT JSONEachRow" < data.jsonl

# Import TSV
clickhouse-client --query "INSERT INTO events FORMAT TabSeparated" < data.tsv
```

## Import a Large File Efficiently

```bash
# Stream a gzip-compressed CSV file
gunzip -c large_data.csv.gz | \
  clickhouse-client --query "INSERT INTO events FORMAT CSV"

# Parallel import using pv to monitor throughput
pv large_data.csv | \
  clickhouse-client --query "INSERT INTO events FORMAT CSV"
```

## Export Data to a File

```bash
# Export as CSV
clickhouse-client -q "SELECT * FROM events WHERE toDate(created_at) = today()" \
  --format CSVWithNames > events_today.csv

# Export as Parquet
clickhouse-client -q "SELECT * FROM events LIMIT 100000" \
  --format Parquet > events.parquet

# Export compressed
clickhouse-client -q "SELECT * FROM events" \
  --format JSONEachRow | gzip > events.jsonl.gz
```

## Multiline Queries

In interactive mode, press Enter at the end of a line and `;` to execute:

```sql
SELECT
    user_id,
    count() AS events,
    min(created_at) AS first_seen
FROM events
GROUP BY user_id
ORDER BY events DESC
LIMIT 10;
```

Or use heredoc for scripting:

```bash
clickhouse-client --multiline --query "
SELECT
    user_id,
    count() AS events
FROM events
GROUP BY user_id
ORDER BY events DESC
LIMIT 10
"
```

## Query Profiling

```bash
# Show timing and query statistics
clickhouse-client --time -q "SELECT count() FROM events"
```

For more detailed diagnostics, use the `--send_logs_level` option:

```bash
clickhouse-client --send_logs_level=debug -q "SELECT count() FROM events"
```

Inside interactive mode, append `\G` instead of `;` at the end of a query to render the result in `Vertical` format (similar to MySQL):

```text
:) SELECT * FROM events LIMIT 1 \G
```

## Pass Settings via CLI

```bash
clickhouse-client \
  --max_execution_time=30 \
  --max_memory_usage=5000000000 \
  --max_threads=4 \
  -q "SELECT * FROM very_large_table WHERE complex_condition LIMIT 100"
```

## Set Format Inline

```bash
# FORMAT clause inside the query
clickhouse-client -q "SELECT user_id, count() AS cnt FROM events GROUP BY user_id FORMAT JSON"
```

## Use a Config File

Instead of repeating connection flags, store them in `~/.clickhouse-client/config.xml`:

```xml
<config>
    <host>clickhouse.example.com</host>
    <port>9000</port>
    <user>analytics_user</user>
    <password>secret</password>
    <database>analytics</database>
</config>
```

```bash
# Now connect without flags
clickhouse-client -q "SELECT 1"
```

## Interactive History and Autocompletion

In interactive mode:

```bash
# Navigate history
# Up/Down arrow: previous/next query

# Search history
# Ctrl+R: reverse history search

# Tab completion
# clickhouse-client supports table and column name completion
```

## Run Multiple Queries from a File

```sql
-- migration.sql
CREATE TABLE IF NOT EXISTS events_v2 AS events;

ALTER TABLE events_v2 ADD COLUMN session_id UUID DEFAULT generateUUIDv4();

INSERT INTO events_v2 SELECT *, generateUUIDv4() FROM events;
```

```bash
clickhouse-client --queries-file migration.sql
```

## Check for Errors in Scripts

```bash
#!/usr/bin/env bash
set -euo pipefail

result=$(clickhouse-client -q "SELECT count() FROM events" 2>&1)
exit_code=$?

if [ $exit_code -ne 0 ]; then
    echo "Query failed: ${result}"
    exit 1
fi

echo "Row count: ${result}"
```

## Enable Compression for Remote Connections

```bash
# Enable LZ4 compression on the wire
clickhouse-client \
  --host remote-server \
  --compression=1 \
  -q "SELECT count() FROM large_table"
```

## Common Useful Commands

```bash
# List databases
clickhouse-client -q "SHOW DATABASES"

# List tables in a database
clickhouse-client -q "SHOW TABLES FROM analytics"

# Describe a table
clickhouse-client -q "DESCRIBE TABLE events"

# Show CREATE TABLE statement
clickhouse-client -q "SHOW CREATE TABLE events"

# Show current server status
clickhouse-client -q "SELECT * FROM system.metrics WHERE metric = 'Query'"

# Flush logs immediately
clickhouse-client -q "SYSTEM FLUSH LOGS"

# Check replication status
clickhouse-client -q "SELECT database, table, is_leader, queue_size, absolute_delay FROM system.replicas"
```

## Common Pitfalls

- `clickhouse-client` reads from the native TCP port (9000), not the HTTP port (8123). Use `--port 8123` only when explicitly connecting via HTTP.
- When importing large files, avoid quoting the entire file content as a string argument. Always pipe via stdin or use `<` redirection.
- The `--format` flag and the `FORMAT` clause inside the SQL string both work, but they interact: the `FORMAT` clause in the query overrides `--format`.
- On macOS, the Homebrew-installed binary is named `clickhouse` and the client is invoked as `clickhouse client` (with a space), not `clickhouse-client`.

## Summary

`clickhouse-client` is the most direct way to interact with ClickHouse. Use it for ad-hoc analysis in interactive mode, for ETL scripts with stdin/stdout piping, for running migration files, and for monitoring queries against system tables. Its support for all ClickHouse output formats makes it the backbone of data export and import pipelines.
