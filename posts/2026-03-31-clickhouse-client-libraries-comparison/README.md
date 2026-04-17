# ClickHouse Client Libraries Feature Comparison

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Client Library, Python, Go, Node.js, Java, Driver

Description: A comparison of official and popular ClickHouse client libraries for Python, Go, Node.js, Java, and Rust, covering features, protocol support, and connection pooling.

---

## Overview of Client Libraries

ClickHouse exposes two protocols: the HTTP interface (port 8123) and the native TCP interface (port 9000). Client libraries use one or both. Native TCP offers lower latency and binary data transfer; HTTP is more firewall-friendly and easier to use with standard HTTP tooling.

## Feature Comparison Table

```text
Library              | Language | Protocol      | Connection Pool | Async | Streaming
---------------------|----------|---------------|-----------------|-------|----------
clickhouse-connect   | Python   | HTTP          | Yes             | No    | Yes
asynch               | Python   | Native TCP    | Yes             | Yes   | Yes
clickhouse-go        | Go       | Native + HTTP | Yes             | No    | Yes
clickhouse-java      | Java     | Native + HTTP | Yes             | No    | Yes
@clickhouse/client   | Node.js  | HTTP          | Yes (keep-alive)| Yes   | Yes
clickhouse-rs        | Rust     | Native TCP    | Yes             | Yes   | Yes
```

## Python: clickhouse-connect

```python
import clickhouse_connect

client = clickhouse_connect.get_client(
    host='localhost',
    port=8123,
    username='default',
    password='',
    database='analytics'
)

# Query returns list of rows
rows = client.query('SELECT user_id, count() FROM events GROUP BY user_id LIMIT 10')
for row in rows.result_rows:
    print(row)

# Insert from list of tuples
client.insert('events', [(1, 'click', 101), (2, 'view', 102)],
              column_names=['event_id', 'event_type', 'user_id'])
```

## Go: clickhouse-go

```go
conn, err := clickhouse.Open(&clickhouse.Options{
    Addr: []string{"localhost:9000"},
    Auth: clickhouse.Auth{
        Database: "analytics",
        Username: "default",
        Password: "",
    },
    MaxOpenConns:  10,
    MaxIdleConns:  5,
})

rows, err := conn.Query(ctx, "SELECT user_id, count() FROM events GROUP BY user_id")
defer rows.Close()
for rows.Next() {
    var userID uint64
    var cnt uint64
    rows.Scan(&userID, &cnt)
    fmt.Printf("%d: %d\n", userID, cnt)
}
```

## Node.js: @clickhouse/client

```javascript
import { createClient } from '@clickhouse/client';

const client = createClient({
  url: 'http://localhost:8123',
  database: 'analytics',
  username: 'default',
  password: '',
});

const rows = await client.query({
  query: 'SELECT user_id, count() FROM events GROUP BY user_id',
  format: 'JSONEachRow',
});

const data = await rows.json();
console.log(data);
```

## Java: clickhouse-java (ClickHouse JDBC)

```java
String url = "jdbc:ch://localhost:8123/analytics";
Properties props = new Properties();
props.setProperty("user", "default");

try (Connection conn = DriverManager.getConnection(url, props);
     Statement stmt = conn.createStatement()) {
    ResultSet rs = stmt.executeQuery(
        "SELECT user_id, count() FROM events GROUP BY user_id"
    );
    while (rs.next()) {
        System.out.printf("%d: %d%n", rs.getLong(1), rs.getLong(2));
    }
}
```

## Summary

For Python workloads, `clickhouse-connect` is the official HTTP-based library and the easiest to start with. For Go, `clickhouse-go` uses native TCP for best performance. Node.js developers should use the official `@clickhouse/client`. Java applications can use the JDBC driver for compatibility with existing connection pool infrastructure. For async Python with native TCP support, `asynch` is the best option.
