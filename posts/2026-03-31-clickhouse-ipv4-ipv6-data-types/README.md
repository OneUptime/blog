# How to Use IPv4 and IPv6 Data Types in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, Data Type, IPv4, IPv6, Networking

Description: Learn how ClickHouse stores IPv4 and IPv6 addresses as compact integers, how to convert strings, and how to run CIDR range queries.

---

ClickHouse provides dedicated `IPv4` and `IPv6` data types for storing IP addresses efficiently. `IPv4` uses 4 bytes (stored as UInt32) and `IPv6` uses 16 bytes (stored as UInt128 big-endian). Compared to storing IPs as plain strings, these types consume less space, allow faster comparisons, and come with built-in functions for CIDR lookups, subnet checks, and string conversion.

## Defining IPv4 and IPv6 Columns

Declare columns directly with the `IPv4` or `IPv6` type. String literals are automatically parsed on insert.

```sql
CREATE TABLE access_logs (
    log_id       UInt64,
    client_ipv4  IPv4,
    client_ipv6  IPv6,
    server_ipv4  IPv4,
    user_agent   String,
    logged_at    DateTime
) ENGINE = MergeTree()
ORDER BY (logged_at, log_id);

INSERT INTO access_logs VALUES
(1, '192.168.1.42',   '2001:db8::1',         '10.0.0.1', 'Mozilla/5.0', '2026-03-01 09:00:00'),
(2, '203.0.113.15',   '2001:db8::2',         '10.0.0.1', 'curl/7.88',   '2026-03-01 09:01:00'),
(3, '192.168.1.100',  '::ffff:192.168.1.42', '10.0.0.2', 'Python/3.12', '2026-03-01 09:02:00');
```

## Converting Between Strings and IP Types

Use `toIPv4()`, `toIPv6()`, `IPv4NumToString()`, and `IPv6NumToString()` to convert between representations.

```sql
-- String to IPv4
SELECT toIPv4('192.168.1.1') AS ip;

-- String to IPv6
SELECT toIPv6('2001:db8::1') AS ip;

-- IPv4 back to dotted-decimal string
SELECT IPv4NumToString(toIPv4('192.168.1.42')) AS ip_string;

-- IPv6 back to colon-hex string
SELECT IPv6NumToString(toIPv6('2001:db8::1')) AS ip_string;

-- Convert IPv4 address to its numeric (UInt32) value
SELECT toUInt32(toIPv4('192.168.1.1')) AS numeric_val;

-- IPv4-mapped IPv6 addresses
SELECT toIPv6('::ffff:192.168.1.42') AS mapped;
```

## CIDR and Subnet Queries

Use `isIPAddressInRange()` to check whether an IP falls within a CIDR range.

```sql
-- Check if a single IP is in a subnet
SELECT isIPAddressInRange('192.168.1.42', '192.168.1.0/24') AS in_private_range;

-- Filter rows by subnet
SELECT log_id, client_ipv4, logged_at
FROM access_logs
WHERE isIPAddressInRange(IPv4NumToString(client_ipv4), '192.168.1.0/24');

-- Multiple subnet check using OR
SELECT log_id, client_ipv4
FROM access_logs
WHERE
    isIPAddressInRange(IPv4NumToString(client_ipv4), '192.168.0.0/16')
    OR isIPAddressInRange(IPv4NumToString(client_ipv4), '10.0.0.0/8')
    OR isIPAddressInRange(IPv4NumToString(client_ipv4), '172.16.0.0/12');
```

## IPv4 to IPv6 Mapping

IPv4 addresses can be represented as IPv4-mapped IPv6 addresses (`::ffff:x.x.x.x`). ClickHouse provides a function for this conversion.

```sql
-- Convert IPv4 to IPv4-mapped IPv6
SELECT toIPv6(IPv4NumToString(client_ipv4)) AS ipv6_mapped
FROM access_logs
WHERE log_id = 1;

-- Alternatively using IPv4ToIPv6 function
SELECT IPv4ToIPv6(client_ipv4) AS mapped_ipv6
FROM access_logs
LIMIT 3;
```

## Aggregation and Analytics on IP Columns

IP types work transparently with GROUP BY and aggregation functions.

```sql
-- Top 10 client IPs by request count
SELECT
    IPv4NumToString(client_ipv4) AS client_ip,
    count() AS requests
FROM access_logs
GROUP BY client_ipv4
ORDER BY requests DESC
LIMIT 10;

-- Count unique IPv4 and IPv6 clients
SELECT
    uniq(client_ipv4) AS unique_ipv4_clients,
    uniq(client_ipv6) AS unique_ipv6_clients
FROM access_logs;

-- Requests per /24 subnet
SELECT
    IPv4NumToString(bitAnd(client_ipv4, toIPv4('255.255.255.0'))) AS subnet,
    count() AS requests
FROM access_logs
GROUP BY subnet
ORDER BY requests DESC;
```

## Summary

The `IPv4` and `IPv6` types in ClickHouse store addresses in compact binary form, saving space compared to string columns and enabling fast numeric comparisons. Use `toIPv4()`/`toIPv6()` to convert string inputs and `isIPAddressInRange()` for CIDR subnet filtering. These types integrate seamlessly with GROUP BY, aggregation, and sorting, making them the recommended choice for any schema that stores network addresses.
