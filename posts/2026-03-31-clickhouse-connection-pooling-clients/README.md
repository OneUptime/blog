# How to Configure Connection Pooling for ClickHouse Clients

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Connection Pooling, Performance, Client, HTTP, Python, Node.js

Description: Configure connection pooling for ClickHouse clients in Python, Node.js, and Go to reduce connection overhead and improve query throughput.

---

ClickHouse accepts connections over its native TCP protocol (port 9000) and HTTP interface (port 8123). For applications issuing many short queries, connection reuse is essential - establishing a new TCP connection for each query adds measurable latency and puts unnecessary load on the server. Most official and community clients support connection pooling out of the box or via configuration.

## ClickHouse Server Connection Limits

Before tuning clients, review server-side limits in `config.xml` or `users.xml`:

```xml
<!-- config.xml -->
<max_connections>4096</max_connections>

<!-- users.xml per-user profile -->
<profiles>
  <default>
    <max_concurrent_queries_for_user>100</max_concurrent_queries_for_user>
  </default>
</profiles>
```

## Python: clickhouse-connect with Connection Pool

`clickhouse-connect` (the official Python client) uses `urllib3` connection pools under the hood via its HTTP interface.

```python
import clickhouse_connect
from clickhouse_connect.driver import httputil

# Build a urllib3 PoolManager with the desired pool size
pool_mgr = httputil.get_pool_manager(
    maxsize=20,       # max connections per host
    num_pools=12,     # number of host pools to keep around
    block=False,      # don't block when pool exhausted
)

client = clickhouse_connect.get_client(
    host='clickhouse.example.com',
    port=8443,
    username='default',
    password='secret',
    secure=True,
    pool_mgr=pool_mgr,
    query_retries=3,  # retries on failed queries
)

result = client.query('SELECT count() FROM system.parts')
print(result.first_row)
```

## Python: clickhouse-driver (Native Protocol)

`clickhouse-driver` uses the native TCP protocol. Wrap it with a `queue.Queue` for a simple pool:

```python
import queue
import clickhouse_driver

POOL_SIZE = 10

def make_pool(host, user, password, database, size=POOL_SIZE):
    pool = queue.Queue(maxsize=size)
    for _ in range(size):
        conn = clickhouse_driver.Client(
            host=host,
            user=user,
            password=password,
            database=database,
            connect_timeout=5,
            send_receive_timeout=30,
            settings={'max_execution_time': 60},
        )
        pool.put(conn)
    return pool

pool = make_pool('clickhouse.example.com', 'default', 'secret', 'analytics')

def query(sql, pool):
    conn = pool.get()
    try:
        return conn.execute(sql)
    finally:
        pool.put(conn)

rows = query('SELECT count() FROM events', pool)
```

## Node.js: @clickhouse/client with Keep-Alive

The official Node.js client uses Node's `http.Agent` with keep-alive enabled by default.

```javascript
const http = require('http');
const { createClient } = require('@clickhouse/client');

const agent = new http.Agent({
  keepAlive: true,
  maxSockets: 20,       // max connections per host
  maxFreeSockets: 10,   // idle connections to keep open
  timeout: 60000,
});

const client = createClient({
  url: 'http://clickhouse.example.com:8123',
  username: 'default',
  password: 'secret',
  http_agent: agent,
  request_timeout: 30000,
});

async function run() {
  const result = await client.query({
    query: 'SELECT count() FROM events',
    format: 'JSONEachRow',
  });
  console.log(await result.json());
}

run();
```

## Go: clickhouse-go with Connection Pool

```go
package main

import (
    "context"
    "database/sql"
    "fmt"
    "time"

    _ "github.com/ClickHouse/clickhouse-go/v2"
)

func main() {
    db, err := sql.Open("clickhouse", "clickhouse://default:secret@clickhouse.example.com:9000/analytics?dial_timeout=5s&max_execution_time=60")
    if err != nil {
        panic(err)
    }

    db.SetMaxOpenConns(20)          // max total connections
    db.SetMaxIdleConns(10)          // max idle connections kept open
    db.SetConnMaxLifetime(10 * time.Minute) // recycle connections periodically

    var count uint64
    if err := db.QueryRowContext(context.Background(),
        "SELECT count() FROM events").Scan(&count); err != nil {
        panic(err)
    }
    fmt.Println("count:", count)
}
```

## Monitoring Connection Usage

```sql
-- Active connections
SELECT user, client_hostname, client_name, elapsed, query
FROM system.processes
ORDER BY elapsed DESC;

-- Current connection count (native and HTTP)
SELECT metric, value
FROM system.metrics
WHERE metric IN ('TCPConnection', 'HTTPConnection');
```

## Summary

ClickHouse is designed for high-concurrency analytical queries. Proper connection pooling - 10-20 connections per application pod - eliminates handshake overhead while avoiding connection exhaustion on the server. Match pool size to your query concurrency needs and monitor `system.processes` to confirm connections are being reused.
