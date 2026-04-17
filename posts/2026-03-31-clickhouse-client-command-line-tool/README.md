# How to Use clickhouse-client Command Line Tool

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, clickhouse-client, CLI, Command Line, Tool

Description: Learn how to use the clickhouse-client command line tool to connect to ClickHouse, run queries, import data, and automate database operations from the terminal.

---

`clickhouse-client` is the official command-line interface for ClickHouse. It provides an interactive SQL shell, non-interactive query execution, and data import/export capabilities. Understanding it well is essential for day-to-day ClickHouse operations.

## Installing clickhouse-client

On Ubuntu/Debian:

```bash
sudo apt-get install clickhouse-client
```

On macOS with Homebrew:

```bash
brew install --cask clickhouse
```

Or download directly and run:

```bash
curl https://clickhouse.com/ | sh
./clickhouse client
```

## Connecting to a Server

Basic connection to localhost:

```bash
clickhouse-client --host localhost --port 9000 --user default --password ''
```

Connect to a remote server with TLS:

```bash
clickhouse-client \
  --host my-clickhouse.example.com \
  --port 9440 \
  --secure \
  --user analyst \
  --password 'secret'
```

## Interactive Mode

Once connected, you get an interactive SQL prompt:

```text
ClickHouse client version 24.1.0.
Connecting to localhost:9000 as user default.
Connected to ClickHouse server version 24.1.0.

my-host :) SELECT now();
```

Use `\q` or `exit` to quit the shell.

## Running a Single Query Non-Interactively

```bash
clickhouse-client --query "SELECT count() FROM system.parts"
```

Output format can be changed with `--format`:

```bash
clickhouse-client \
  --query "SELECT name, engine FROM system.tables WHERE database = 'default'" \
  --format PrettyCompact
```

Common formats: `TabSeparated`, `CSV`, `JSON`, `JSONEachRow`, `PrettyCompact`, `Vertical`.

## Importing Data From a File

Load a CSV file into a table:

```bash
clickhouse-client \
  --query "INSERT INTO events FORMAT CSV" \
  < /data/events.csv
```

Load a JSON Lines file:

```bash
clickhouse-client \
  --query "INSERT INTO logs FORMAT JSONEachRow" \
  < /data/logs.jsonl
```

## Exporting Query Results to a File

```bash
clickhouse-client \
  --query "SELECT * FROM events WHERE date = today()" \
  --format CSV \
  > /tmp/events_today.csv
```

## Using a Config File

Instead of passing credentials every time, put them in `~/.clickhouse-client/config.xml`:

```xml
<config>
    <host>localhost</host>
    <port>9000</port>
    <user>default</user>
    <password></password>
    <database>production</database>
</config>
```

Then simply run:

```bash
clickhouse-client
```

## Useful Command-Line Flags

| Flag | Description |
|---|---|
| `--host` | Server hostname (default: localhost) |
| `--port` | TCP port (default: 9000) |
| `--user` | Username |
| `--password` | Password |
| `--database` | Default database |
| `--query` | Query to execute |
| `--format` | Output format |
| `--multiline` | Allow multi-line queries in interactive mode |
| `--time` | Print query execution time |
| `--progress` | Show progress bar during query |
| `--secure` | Use TLS |

## Running Multiple Queries From a File

```bash
clickhouse-client --queries-file /scripts/setup.sql
```

You can also pipe a script via stdin:

```bash
clickhouse-client < /scripts/setup.sql
```

## Checking Server Version

```bash
clickhouse-client --version
```

## Summary

`clickhouse-client` is a versatile and powerful CLI for interacting with ClickHouse. Whether you are running ad-hoc queries, importing bulk data, exporting results for downstream tools, or scripting automated operations, mastering clickhouse-client is a foundational skill for any ClickHouse user or administrator.
