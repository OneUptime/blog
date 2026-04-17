# How to Connect Your First Application to ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Database, Connection, Python, Node.js

Description: Learn how to connect your first application to ClickHouse using official drivers for Python, Node.js, and Go with working code examples.

---

ClickHouse offers official client libraries for most popular languages, making it straightforward to integrate into existing applications. This guide walks through connecting a real application using the HTTP interface and native protocol drivers.

## Prerequisites

You need a running ClickHouse instance. For local development, Docker is the fastest option:

```bash
docker run -d --name clickhouse -p 8123:8123 -p 9000:9000 clickhouse/clickhouse-server
```

## Connecting with Python

Install the official ClickHouse Connect driver:

```bash
pip install clickhouse-connect
```

Then connect and run a query:

```python
import clickhouse_connect

client = clickhouse_connect.get_client(
    host='localhost',
    port=8123,
    username='default',
    password=''
)

result = client.query('SELECT version()')
print(result.result_rows)
```

For inserting data efficiently, use the `insert` method with a list of rows:

```python
data = [
    ['event_a', '2024-01-01 10:00:00', 42],
    ['event_b', '2024-01-01 10:01:00', 99],
]
client.insert('events', data, column_names=['name', 'ts', 'value'])
```

## Connecting with Node.js

Install the official client:

```bash
npm install @clickhouse/client
```

Basic connection and query:

```javascript
const { createClient } = require('@clickhouse/client');

const client = createClient({
  url: 'http://localhost:8123',
  username: 'default',
  password: '',
});

async function main() {
  const result = await client.query({
    query: 'SELECT version()',
    format: 'JSONEachRow',
  });
  console.log(await result.json());
  await client.close();
}

main();
```

## Connecting with Go

```bash
go get github.com/ClickHouse/clickhouse-go/v2
```

```go
package main

import (
    "context"
    "fmt"
    "github.com/ClickHouse/clickhouse-go/v2"
)

func main() {
    conn, err := clickhouse.Open(&clickhouse.Options{
        Addr: []string{"localhost:9000"},
        Auth: clickhouse.Auth{
            Database: "default",
            Username: "default",
            Password: "",
        },
    })
    if err != nil {
        panic(err)
    }
    var version string
    conn.QueryRow(context.Background(), "SELECT version()").Scan(&version)
    fmt.Println("ClickHouse version:", version)
}
```

## Connection Pooling and Best Practices

- Reuse a single client instance across your application - clients manage connection pools internally.
- Use environment variables for credentials, never hardcode them.
- Set read and write timeouts appropriate to your query complexity.
- For bulk inserts, batch rows together rather than sending one row at a time.

## Summary

Connecting to ClickHouse is straightforward with official drivers available for Python, Node.js, and Go. Each driver handles connection pooling internally, so you only need a single client instance. For production use, always configure credentials via environment variables and tune timeouts to match your workload.
