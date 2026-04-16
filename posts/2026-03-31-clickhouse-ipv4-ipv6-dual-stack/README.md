# How to Configure ClickHouse for IPv4 and IPv6 Dual Stack

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, IPv4, IPv6, Networking, Configuration

Description: Learn how to configure ClickHouse to listen on both IPv4 and IPv6 addresses for dual-stack network environments and modern infrastructure.

---

## What Is Dual-Stack Networking?

A dual-stack server accepts connections over both IPv4 and IPv6. Modern cloud environments increasingly use IPv6, and configuring ClickHouse to handle both protocols ensures compatibility with all clients while future-proofing your deployment.

## Default Listening Behavior

By default, ClickHouse listens on `127.0.0.1` and `::1` (localhost only) for both HTTP (8123) and native TCP (9000). To accept connections from other hosts on both protocols, you configure additional listen addresses.

## Configuring Dual-Stack Listeners

In `config.xml`, add separate `listen_host` entries for IPv4 and IPv6:

```xml
<listen_host>0.0.0.0</listen_host>
<listen_host>::</listen_host>
```

`::` is the IPv6 wildcard that binds to all IPv6 interfaces. On Linux, binding to `::` may also cover IPv4 depending on the `IPV6_V6ONLY` socket option. Adding both is explicit and safe.

## Verifying the Configuration

After restarting ClickHouse, confirm it is listening on both protocols:

```bash
ss -tlnp | grep clickhouse
```

Expected output:

```text
LISTEN  0.0.0.0:9000   (IPv4 native TCP)
LISTEN  :::9000        (IPv6 native TCP)
LISTEN  0.0.0.0:8123   (IPv4 HTTP)
LISTEN  :::8123        (IPv6 HTTP)
```

## Testing IPv6 Connectivity

```bash
# Test HTTP over IPv6
curl -v "http://[::1]:8123/?query=SELECT+1"

# Test native TCP over IPv6
clickhouse-client --host "::1" --query "SELECT 1"
```

## Intercluster Communication Over IPv6

For clusters where nodes communicate over IPv6, specify hostnames that resolve to AAAA records:

```xml
<remote_servers>
  <prod_cluster>
    <shard>
      <replica>
        <host>ch-node-1.ipv6.internal</host>
        <port>9000</port>
      </replica>
    </shard>
  </prod_cluster>
</remote_servers>
```

Ensure DNS is configured to return AAAA records for these hostnames.

## Storing IP Addresses

ClickHouse has native `IPv4` and `IPv6` data types for efficient storage:

```sql
CREATE TABLE access_log
(
    ts         DateTime,
    client_ip  IPv6,
    request    String
)
ENGINE = MergeTree()
ORDER BY ts;

-- Insert either IPv4 or IPv6 using toIPv6()
INSERT INTO access_log VALUES (now(), toIPv6('192.168.1.1'), 'GET /');
INSERT INTO access_log VALUES (now(), toIPv6('2001:db8::1'), 'POST /api');
```

`toIPv6` maps IPv4 addresses to IPv4-in-IPv6 format automatically.

## Filtering by IP Version

```sql
SELECT client_ip, count()
FROM access_log
WHERE client_ip NOT BETWEEN toIPv6('::ffff:0.0.0.0') AND toIPv6('::ffff:255.255.255.255')  -- Pure IPv6 only (exclude IPv4-mapped)
GROUP BY client_ip
ORDER BY count() DESC
LIMIT 10;
```

## Summary

Configure dual-stack ClickHouse by adding both `0.0.0.0` and `::` as `listen_host` entries in `config.xml`. Verify with `ss -tlnp`, test connectivity with `curl` and `clickhouse-client`, and use the native `IPv4`/`IPv6` data types for storing addresses efficiently. Dual-stack support ensures your cluster is compatible with both legacy IPv4 clients and modern IPv6-only environments.
