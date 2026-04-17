# How to Disable Unnecessary ClickHouse Interfaces

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Security, Interface, Hardening, Attack Surface

Description: Reduce ClickHouse's attack surface by disabling unnecessary network interfaces including MySQL, PostgreSQL, and interserver ports that your deployment doesn't require.

---

ClickHouse ships with multiple network interfaces enabled by default: HTTP, HTTPS, native TCP, MySQL compatibility, PostgreSQL compatibility, gRPC, and interserver ports. Each open port is a potential attack surface. Disabling the ones your deployment doesn't use is a quick, high-impact security improvement.

## Default ClickHouse Ports

| Port | Protocol | Purpose |
|---|---|---|
| 8123 | HTTP | Query interface |
| 8443 | HTTPS | Secure query interface |
| 9000 | TCP | Native client protocol |
| 9440 | TCP+TLS | Secure native protocol |
| 9004 | MySQL | MySQL-compatible interface |
| 9005 | PostgreSQL | PostgreSQL-compatible interface |
| 9009 | HTTP | Interserver data replication |
| 9010 | HTTPS | Secure interserver replication |

## Disabling Interfaces in config.xml

Remove ports you don't use by setting them to empty with `remove="true"`:

```xml
<clickhouse>
  <!-- Keep only what you need -->
  <https_port>8443</https_port>
  <tcp_port_secure>9440</tcp_port_secure>

  <!-- Disable plain text interfaces -->
  <http_port remove="true"></http_port>
  <tcp_port remove="true"></tcp_port>

  <!-- Disable MySQL compatibility if not needed -->
  <mysql_port remove="true"></mysql_port>

  <!-- Disable PostgreSQL compatibility if not needed -->
  <postgresql_port remove="true"></postgresql_port>

  <!-- Disable gRPC if not used -->
  <grpc_port remove="true"></grpc_port>

  <!-- Keep interserver only on internal interface -->
  <interserver_http_port>9009</interserver_http_port>
  <interserver_http_host>10.0.1.5</interserver_http_host>
</clickhouse>
```

## Disabling the MySQL Interface

The MySQL interface is useful for BI tools that speak MySQL protocol (Tableau, Metabase) but is an unnecessary risk if you don't use it:

```xml
<mysql_port remove="true"></mysql_port>
```

If you need MySQL compatibility, require TLS:

```xml
<mysql_port>9004</mysql_port>
<openSSL>
  <server>
    <!-- SSL config applies to all secure ports -->
  </server>
</openSSL>
```

## Restricting the Interserver Port

The interserver port is needed for replication but should only be accessible between cluster nodes:

```bash
# Allow interserver port only from cluster subnet
ufw allow from 10.0.1.0/24 to any port 9009
ufw allow from 10.0.1.0/24 to any port 9010
ufw deny 9009
ufw deny 9010
```

## Verifying Open Ports After Configuration

```bash
# Check which ports ClickHouse is actually listening on
ss -tlnp | grep clickhouse

# Verify from the ClickHouse side
clickhouse-client --query "SELECT * FROM system.server_settings WHERE name LIKE '%port%'"
```

## Checking Interface Usage in Query Log

Before disabling an interface, check if it's being used:

```sql
SELECT
    interface,
    count() AS query_count,
    uniqExact(user) AS unique_users
FROM system.query_log
WHERE event_date >= today() - 30
GROUP BY interface
ORDER BY query_count DESC;
```

Interface values: `TCP`, `HTTP`, `gRPC`, `MySQL`, `PostgreSQL`, `LOCAL`, `TCP_INTERSERVER`.

If an interface shows zero queries over 30 days, it's safe to disable.

## Firewall as Defense in Depth

Even after disabling ports in config.xml, maintain firewall rules as a second layer:

```bash
# Default deny all ClickHouse ports
ufw deny 8123/tcp
ufw deny 9000/tcp
ufw deny 9004/tcp
ufw deny 9005/tcp

# Allow only what is needed from specific sources
ufw allow from 10.0.0.0/8 to any port 8443
ufw allow from 10.0.0.0/8 to any port 9440
```

## Summary

Disabling unnecessary ClickHouse interfaces reduces the attack surface to only what your deployment actually needs. Check `system.query_log` to identify unused interfaces, remove their port configurations with `remove="true"`, and reinforce with firewall rules. This is one of the most impactful hardening steps you can take with minimal operational risk.
