# How to Configure clickhouse-server Listen Ports and Addresses

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Configuration, Network, Port, Security, Server

Description: Configure ClickHouse server listen addresses and ports for HTTP, HTTPS, native TCP, and MySQL/PostgreSQL compatibility interfaces to match your network security requirements.

---

## Introduction

ClickHouse listens on multiple ports for different interfaces. By default it binds to localhost only (`127.0.0.1` / `::1`), so a fresh install is not exposed to the network. Production deployments that need remote access must set `<listen_host>` explicitly and should bind to specific internal interfaces rather than all addresses. This guide covers all configurable ports and how to restrict them.

## Default Ports

| Port | Interface | Protocol |
|---|---|---|
| 8123 | HTTP | Plain HTTP |
| 8443 | HTTPS | TLS HTTP |
| 9000 | Native TCP | ClickHouse binary protocol |
| 9440 | Secure Native TCP | TLS native protocol |
| 9004 | MySQL compatibility | MySQL wire protocol |
| 9005 | PostgreSQL compatibility | PostgreSQL wire protocol |
| 9009 | Interserver HTTP | Replication between nodes |
| 9010 | Interserver HTTPS | Encrypted replication |
| 9181 | ClickHouse Keeper | ZooKeeper-compatible protocol |

## Checking Active Ports

```bash
ss -tlnp | grep clickhouse

# Or via ClickHouse system tables
clickhouse-client -q "
SELECT
    name,
    value
FROM system.server_settings
WHERE name LIKE '%port%' OR name LIKE '%listen%'
"
```

## Configuring Listen Address and Ports

Create `/etc/clickhouse-server/config.d/network.xml`:

```xml
<clickhouse>
  <!-- Bind to a specific interface instead of all addresses -->
  <listen_host>10.0.0.5</listen_host>

  <!-- Also listen on localhost for local admin access -->
  <listen_host>127.0.0.1</listen_host>

  <!-- HTTP interface -->
  <http_port>8123</http_port>

  <!-- HTTPS interface (TLS config required) -->
  <!-- <https_port>8443</https_port> -->

  <!-- Native TCP -->
  <tcp_port>9000</tcp_port>

  <!-- Secure native TCP (TLS config required) -->
  <!-- <tcp_port_secure>9440</tcp_port_secure> -->

  <!-- MySQL compatibility interface (optional) -->
  <!-- <mysql_port>9004</mysql_port> -->

  <!-- PostgreSQL compatibility interface (optional) -->
  <!-- <postgresql_port>9005</postgresql_port> -->

  <!-- Interserver communication (for replication) -->
  <interserver_http_port>9009</interserver_http_port>
  <interserver_http_host>clickhouse-01.internal.example.com</interserver_http_host>
</clickhouse>
```

## Disabling Unused Ports

The safest approach is to comment out ports you do not use:

```xml
<clickhouse>
  <!-- Only HTTP and native TCP; all others disabled -->
  <listen_host>10.0.0.5</listen_host>
  <listen_host>127.0.0.1</listen_host>
  <http_port>8123</http_port>
  <tcp_port>9000</tcp_port>
  <!-- <https_port>8443</https_port> -->
  <!-- <mysql_port>9004</mysql_port> -->
  <!-- <postgresql_port>9005</postgresql_port> -->
</clickhouse>
```

## Binding to IPv6

```xml
<listen_host>::1</listen_host>     <!-- IPv6 localhost only -->
<listen_host>0.0.0.0</listen_host> <!-- All IPv4 interfaces -->
<listen_host>::</listen_host>       <!-- All IPv4 and IPv6 interfaces -->
```

## Enabling MySQL Compatibility Interface

```xml
<mysql_port>9004</mysql_port>
```

After enabling, test with a MySQL client:

```bash
mysql --host=127.0.0.1 --port=9004 --user=default --password=secret
```

## Enabling PostgreSQL Compatibility Interface

```xml
<postgresql_port>9005</postgresql_port>
```

Test with psql:

```bash
psql "host=127.0.0.1 port=9005 user=default password=secret dbname=default"
```

## Configuring Interserver Communication

For replicated clusters, ClickHouse nodes communicate over the interserver port. Always set an explicit hostname:

```xml
<interserver_http_port>9009</interserver_http_port>
<interserver_http_host>clickhouse-01.internal.example.com</interserver_http_host>
```

For encrypted interserver communication:

```xml
<interserver_https_port>9010</interserver_https_port>
<interserver_http_credentials>
  <user>interserver</user>
  <password>strongpassword</password>
</interserver_http_credentials>
```

## Firewall Rules

```bash
# Allow only internal network to reach ClickHouse ports
ufw allow from 10.0.0.0/8 to any port 8123
ufw allow from 10.0.0.0/8 to any port 9000
ufw deny 8123
ufw deny 9000
```

## Verifying Port Binding After Restart

```bash
systemctl restart clickhouse-server

ss -tlnp | grep clickhouse
# tcp LISTEN 0 128 10.0.0.5:8123  0.0.0.0:*  users:(("clickhouse-se",pid=12345,fd=42))
# tcp LISTEN 0 128 10.0.0.5:9000  0.0.0.0:*  users:(("clickhouse-se",pid=12345,fd=43))
```

## Summary

ClickHouse listen addresses and ports are configured in `config.xml` via `<listen_host>`, `<http_port>`, `<tcp_port>`, `<https_port>`, `<tcp_port_secure>`, and compatibility interface ports. Bind to specific internal IP addresses instead of all interfaces, comment out ports you do not need, and use firewall rules as an additional layer. Set `<interserver_http_host>` to the fully qualified hostname for replication to work correctly across nodes.
