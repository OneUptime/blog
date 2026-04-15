# How to Use ClickHouse Native Protocol vs HTTP Protocol

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Protocol, HTTP, Native, Performance

Description: Compare ClickHouse's native binary protocol and HTTP interface - when to use each, their trade-offs, and how to configure clients for both.

---

## Two Protocols, Different Trade-offs

ClickHouse exposes two primary interfaces: the **native binary protocol** (port 9000) and the **HTTP interface** (port 8123). Understanding the differences helps you choose the right one for your use case.

## Native Protocol (Port 9000)

The native protocol is a custom binary format offering:
- Lower overhead (binary encoding vs. text)
- Higher throughput for large result sets
- Support for server-push progress notifications
- Used by `clickhouse-client` CLI and native drivers

```python
# Native protocol via clickhouse-driver
from clickhouse_driver import Client

client = Client(
    host="localhost",
    port=9000,
    user="default",
    password=""
)

rows, columns = client.execute(
    "SELECT event_type, count() AS cnt FROM events GROUP BY event_type",
    with_column_types=True
)
print(columns)
print(rows[:5])
```

## HTTP Protocol (Port 8123)

The HTTP interface is text-based and universally compatible:
- Works with any HTTP client (curl, requests, wget)
- Easier to proxy through load balancers and firewalls
- Supports JSON, CSV, TSV, Parquet response formats
- Required for HTTPS/TLS termination at proxy

```bash
curl "http://localhost:8123/?query=SELECT+count()+FROM+events"
```

```python
import requests

response = requests.get(
    "http://localhost:8123/",
    params={"query": "SELECT count() FROM events", "default_format": "JSON"},
    auth=("default", "")
)
print(response.json())
```

## clickhouse-connect Uses HTTP

The modern `clickhouse-connect` client uses HTTP by default but with efficient binary row blocks:

```python
import clickhouse_connect

client = clickhouse_connect.get_client(
    host="localhost",
    port=8123,
    compress=True  # enables compression over HTTP (LZ4 for inserts, zstd for query responses)
)
```

## SQLAlchemy Protocol Selection

```python
from sqlalchemy import create_engine

# HTTP
engine_http = create_engine("clickhouse+http://default:@localhost:8123/default")

# Native
engine_native = create_engine("clickhouse+native://default:@localhost:9000/default")
```

## When to Use Which

```text
Native Protocol:
- High-throughput batch inserts
- Low-latency OLAP queries in internal services
- clickhouse-client and CLI tooling

HTTP Protocol:
- Browser and web applications
- Proxied environments (HTTPS termination)
- Tool integrations (Grafana, Metabase, curl)
- Language clients where native driver unavailable
```

## HTTPS Configuration

```bash
# Connect over HTTPS (port 8443)
curl "https://localhost:8443/?query=SELECT+1" \
  --user default: \
  --cacert /etc/ssl/certs/ca-certificates.crt
```

```python
client = clickhouse_connect.get_client(
    host="myhost.example.com",
    port=8443,
    secure=True
)
```

## Performance Comparison

For large result sets, native protocol is generally faster due to binary encoding. For most application queries returning thousands to tens-of-thousands of rows, the difference is negligible. HTTP with LZ4 compression (`clickhouse-connect`) narrows the gap significantly.

## Summary

Use the native protocol for maximum throughput in internal services and batch operations. Use HTTP for web applications, tool integrations, and environments requiring TLS termination. The `clickhouse-connect` library offers a practical middle ground: HTTP transport with binary-efficient encoding.
