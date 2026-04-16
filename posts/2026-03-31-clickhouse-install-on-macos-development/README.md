# How to Install ClickHouse on macOS for Development

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, macOS, Development, Homebrew, Docker

Description: Install ClickHouse on macOS for local development using Homebrew or Docker, with tips for connecting clients and running test queries.

---

Running ClickHouse locally on macOS accelerates development by letting you test queries and schema changes before deploying to production. Two approaches work well: Homebrew for a native install and Docker for an isolated environment.

## Option 1: Install via Homebrew (Recommended)

ClickHouse provides an official Homebrew formula:

```bash
brew install clickhouse
```

Start the server:

```bash
clickhouse server
```

Or run it as a background service:

```bash
brew services start clickhouse
```

Connect with the client:

```bash
clickhouse client
```

The default configuration listens on localhost with no password. When you run `clickhouse server` directly, data is stored under the current working directory (in a `data/` subdirectory) unless you pass a custom config with `--config-file`.

## Option 2: Install via Binary

Download the macOS binary directly:

```bash
curl https://clickhouse.com/ | sh
```

This downloads both `clickhouse-server` and `clickhouse-client` as a single binary:

```bash
./clickhouse server &
./clickhouse client
```

## Option 3: Docker (Any Architecture)

Docker works well for Apple Silicon Macs where the native binary may have architecture constraints:

```bash
docker run -d \
  --name clickhouse-dev \
  -p 8123:8123 \
  -p 9000:9000 \
  -v ~/clickhouse-data:/var/lib/clickhouse \
  clickhouse/clickhouse-server:latest
```

Connect with the client:

```bash
docker exec -it clickhouse-dev clickhouse-client
```

Or connect via HTTP:

```bash
curl 'http://localhost:8123/?query=SELECT+version()'
```

## Testing the Installation

Run a quick test to verify everything works:

```sql
SELECT
    number,
    number * number AS squared
FROM numbers(10);
```

Create a test database and table:

```sql
CREATE DATABASE IF NOT EXISTS dev;

CREATE TABLE dev.events
(
    ts DateTime DEFAULT now(),
    user_id UInt64,
    action String
)
ENGINE = MergeTree()
ORDER BY ts;

INSERT INTO dev.events (user_id, action) VALUES
    (1, 'login'), (2, 'click'), (1, 'logout');

SELECT * FROM dev.events;
```

## Connecting from Python

```bash
pip install clickhouse-connect
```

```python
import clickhouse_connect

client = clickhouse_connect.get_client(
    host='localhost',
    port=8123,
    username='default',
    password=''
)

result = client.query('SELECT version()')
print(result.first_row)
```

## Resetting the Development Instance

To start fresh with the Docker setup, stop and remove the container along with its data volume:

```bash
docker rm -f clickhouse-dev
rm -rf ~/clickhouse-data
```

Then re-run the `docker run` command from Option 3 to start a clean instance.

## Summary

Installing ClickHouse on macOS for development is easiest with Homebrew (`brew install clickhouse`) or the official binary installer. Use Docker for Apple Silicon compatibility or when you need full isolation. The local setup is lightweight and allows you to develop and test ClickHouse queries before deploying to production clusters.
