# How to Configure ClickHouse HTTP Keep-Alive Settings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, HTTP, Keep-Alive, Performance, Configuration

Description: Learn how to tune ClickHouse HTTP keep-alive settings to reduce connection overhead and improve query throughput for high-frequency HTTP clients.

---

## What Is HTTP Keep-Alive?

HTTP keep-alive (also called HTTP persistent connections) allows multiple requests to reuse the same TCP connection instead of opening a new one for each request. For ClickHouse HTTP clients that send frequent queries, this significantly reduces connection establishment overhead.

## ClickHouse Default Keep-Alive Settings

ClickHouse enables HTTP keep-alive by default. The key settings are:

```xml
<keep_alive_timeout>10</keep_alive_timeout>
```

This configures how long ClickHouse keeps an idle HTTP connection open (in seconds) before closing it.

## Configuring Keep-Alive Timeout

In `config.xml`:

```xml
<http_server_default_response><![CDATA[]]></http_server_default_response>
<keep_alive_timeout>60</keep_alive_timeout>
```

Increasing the timeout reduces connection churn for clients that send queries every few seconds. For dashboards or monitoring systems that poll frequently, 30-60 seconds is a good range.

## Setting Maximum Requests Per Connection

Limit how many requests can be served over a single keep-alive connection:

```xml
<max_keep_alive_requests>10000</max_keep_alive_requests>
```

ClickHouse exposes `max_keep_alive_requests` as a server-level setting that caps the number of requests served over a single keep-alive connection before the server closes it. After the limit is reached, the client must open a new TCP connection.

## Client-Side Configuration (Python)

```python
import requests

# requests uses a Session to reuse connections automatically
session = requests.Session()
session.headers.update({'Connection': 'keep-alive'})

def query(sql):
    response = session.get(
        'http://clickhouse-host:8123/',
        params={'query': sql},
        auth=('user', 'password')
    )
    return response.text

# These queries reuse the same TCP connection
result1 = query('SELECT count() FROM events')
result2 = query('SELECT avg(latency_ms) FROM events')
```

## Client-Side Configuration (Go)

```go
transport := &http.Transport{
    MaxIdleConns:        100,
    MaxIdleConnsPerHost: 10,
    IdleConnTimeout:     30 * time.Second,
}
client := &http.Client{Transport: transport}
```

Setting `IdleConnTimeout` to less than ClickHouse's `keep_alive_timeout` prevents receiving "connection reset by peer" errors.

## Checking Active Connections

Monitor recent HTTP requests in the ClickHouse system tables:

```sql
SELECT
    http_method,
    http_user_agent,
    count() AS request_count
FROM system.query_log
WHERE event_time >= now() - INTERVAL 5 MINUTE
  AND type = 'QueryFinish'
  AND http_method > 0
GROUP BY http_method, http_user_agent
ORDER BY request_count DESC
LIMIT 10;
```

Alternatively, use OS-level tools:

```bash
ss -tn state established '( dport = :8123 or sport = :8123 )'
```

## Nginx Keep-Alive Coordination

If Nginx sits in front of ClickHouse, set `keepalive` on the upstream:

```nginx
upstream clickhouse {
    server 127.0.0.1:8123;
    keepalive 32;
}

server {
    location / {
        proxy_pass http://clickhouse;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
    }
}
```

Set `proxy_http_version 1.1` and clear the `Connection` header to enable upstream keep-alive from Nginx to ClickHouse.

## Summary

ClickHouse HTTP keep-alive is controlled primarily by `keep_alive_timeout` in `config.xml`. Set it to 30-60 seconds for high-frequency clients. On the client side, use connection pooling and set idle timeouts slightly shorter than the server value. If using Nginx, configure upstream `keepalive` and HTTP/1.1 to prevent Nginx from closing connections prematurely.
