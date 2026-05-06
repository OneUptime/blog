# How to Configure ClickHouse with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, ClickHouse, Database, OLAP, Analytics

Description: Learn how to configure ClickHouse to listen on IPv6 addresses for HTTP, native protocol, and inter-server communication.

## ClickHouse Configuration Files

```bash
# Main config: /etc/clickhouse-server/config.xml

# User config: /etc/clickhouse-server/users.xml
# Drop-in: /etc/clickhouse-server/config.d/*.xml
```

## Configure IPv6 Listen Address

```xml
<!-- /etc/clickhouse-server/config.d/ipv6.xml -->

<clickhouse>
    <!-- Listen on specific IPv6 address -->
    <listen_host>2001:db8::10</listen_host>
    <listen_host>::1</listen_host>        <!-- IPv6 loopback -->
    <listen_host>127.0.0.1</listen_host>  <!-- IPv4 loopback -->

    <!-- HTTP interface -->
    <http_port>8123</http_port>

    <!-- Native client interface (clickhouse-client) -->
    <tcp_port>9000</tcp_port>

    <!-- Inter-server communication: endpoint advertised to other servers -->
    <interserver_http_port>9009</interserver_http_port>
    <interserver_http_host>2001:db8::10</interserver_http_host>
</clickhouse>
```

## Listen on All Interfaces

```xml
<!-- /etc/clickhouse-server/config.d/listen-all.xml -->

<clickhouse>
    <!-- :: = all IPv6 interfaces -->
    <listen_host>::</listen_host>

    <!-- Or use 0.0.0.0 for IPv4 and :: for IPv6 -->
    <!-- <listen_host>0.0.0.0</listen_host> -->
    <!-- <listen_host>::</listen_host> -->
</clickhouse>
```

## Apply and Test

```bash
# Restart ClickHouse
systemctl restart clickhouse-server

# Verify listening on IPv6
ss -6 -tln | grep -E ':(8123|9000|9009)'
# Expected: entries on ports 8123, 9000, and 9009 bound to your configured IPv6 addresses,
# such as [2001:db8::10]:8123 or [::]:8123

# Test HTTP interface over IPv6
curl -6 http://[2001:db8::10]:8123/ping

# Test native client
clickhouse-client --host 2001:db8::10 --port 9000 --query "SELECT version()"

# Test HTTP query
curl -6 "http://[2001:db8::10]:8123/?query=SELECT+version()"
```

## Connect via HTTP API over IPv6

```bash
# Run a query via HTTP
curl -6 "http://[2001:db8::10]:8123/" \
    --data-binary "SELECT count() FROM system.tables"

# With authentication
curl -6 "http://default:password@[2001:db8::10]:8123/" \
    --data-binary "SHOW DATABASES"

# Insert data
curl -6 "http://[2001:db8::10]:8123/?query=INSERT+INTO+mydb.mytable+FORMAT+JSONEachRow" \
    -H "Content-Type: application/json" \
    -d '{"id": 1, "name": "test"}'
```

## Python ClickHouse Client over IPv6

```python
from clickhouse_driver import Client

# Connect to ClickHouse via IPv6
client = Client(
    host='2001:db8::10',
    port=9000,
    user='default',
    password='',
    database='default'
)

result = client.execute('SELECT version()')
print(result)
```

## Summary

Configure ClickHouse for IPv6 by adding `<listen_host>2001:db8::10</listen_host>` or `<listen_host>::</listen_host>` (all interfaces) in a drop-in config file at `/etc/clickhouse-server/config.d/`. If other nodes should reach this server over IPv6, set `interserver_http_host` to the IPv6 hostname or address they should use for cluster communication; the inter-server listener follows `listen_host` by default. Test HTTP interface with `curl -6 http://[2001:db8::10]:8123/ping` and native client with `clickhouse-client --host 2001:db8::10`. Restart with `systemctl restart clickhouse-server`.
