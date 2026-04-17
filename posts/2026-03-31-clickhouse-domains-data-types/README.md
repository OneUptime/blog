# How to Use Domains in ClickHouse Data Types

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, Data Type, Domain, IPv4, IPv6

Description: Learn how ClickHouse domain types like IPv4 and IPv6 provide semantic validation and display formatting over their underlying storage types.

---

ClickHouse domains are special types built on top of existing primitive types. They add semantic meaning, input validation, and display formatting without changing the underlying storage representation. The most common built-in domains are `IPv4` and `IPv6`, which store IP addresses as `UInt32` and `UInt128` (big-endian) respectively while accepting and displaying them in human-readable dotted-decimal or colon-hex notation.

## What Is a Domain Type?

A domain type is a restricted form of a base type. It shares the same binary representation as the base type but enforces constraints on valid values and controls how they are displayed. You cannot assign an arbitrary string to an `IPv4` column - it must be a valid IPv4 address string.

```sql
SELECT toTypeName(toIPv4('192.168.1.1'));
-- Result: IPv4

SELECT toTypeName(toIPv6('::1'));
-- Result: IPv6
```

## IPv4 Domain

`IPv4` is stored as a `UInt32` (4 bytes) but accepts dotted-decimal input and displays in dotted-decimal format.

```sql
CREATE TABLE network_connections (
    connection_id  UInt64,
    source_ip      IPv4,
    dest_ip        IPv4,
    port           UInt16,
    connected_at   DateTime DEFAULT now()
) ENGINE = MergeTree()
ORDER BY (source_ip, connected_at);

INSERT INTO network_connections (connection_id, source_ip, dest_ip, port)
VALUES
(1, '192.168.1.10', '10.0.0.1', 443),
(2, '10.20.30.40',  '172.16.0.5', 80),
(3, '192.168.1.10', '8.8.8.8', 53);

SELECT source_ip, dest_ip, port
FROM network_connections;
-- source_ip=192.168.1.10, dest_ip=10.0.0.1, port=443
```

Because `IPv4` is backed by `UInt32`, you can perform numeric range comparisons and convert between the two:

```sql
-- Convert an IPv4 to its numeric representation
SELECT toUInt32(toIPv4('192.168.1.1'));
-- Result: 3232235777

-- Convert a UInt32 back to IPv4
SELECT toIPv4(3232235777);
-- Result: 192.168.1.1

-- Range check using CIDR-like numeric comparison
SELECT source_ip
FROM network_connections
WHERE toUInt32(source_ip) BETWEEN toUInt32(toIPv4('192.168.1.0'))
                               AND toUInt32(toIPv4('192.168.1.255'));
```

## IPv6 Domain

`IPv6` is stored in 16 bytes as `UInt128` big-endian but accepts and displays in standard colon-hex notation. It also accepts IPv4-mapped IPv6 addresses.

```sql
CREATE TABLE ipv6_connections (
    id       UInt64,
    src_ip   IPv6,
    dst_ip   IPv6
) ENGINE = MergeTree()
ORDER BY id;

INSERT INTO ipv6_connections VALUES
(1, '2001:db8::1',       'fe80::1'),
(2, '::ffff:192.168.1.1', '::1'),
(3, '2001:db8:85a3::8a2e:370:7334', '::1');

SELECT id, src_ip, dst_ip FROM ipv6_connections;
-- src_ip=2001:db8::1, dst_ip=fe80::1
```

To convert between IPv4 and IPv6 representations:

```sql
-- Map an IPv4 address into IPv6 space
SELECT IPv4ToIPv6(toIPv4('192.168.1.1'));
-- Result: ::ffff:192.168.1.1

-- Display an IPv4-mapped IPv6 address in canonical string form
SELECT IPv6NumToString(toIPv6('::ffff:192.168.1.1'));
-- Result: ::ffff:192.168.1.1
```

## Validating IP Addresses on Insert

Domain types reject invalid input at insert time, which prevents storing garbage data:

```sql
-- This will raise an error
INSERT INTO network_connections (connection_id, source_ip, dest_ip, port)
VALUES (99, 'not_an_ip', '10.0.0.1', 80);
-- Exception: Invalid IPv4 value
```

To safely handle potentially invalid input from external sources, validate before inserting:

```sql
-- Check if a string is a valid IPv4 address
SELECT isIPv4String('192.168.1.1');   -- 1
SELECT isIPv4String('999.0.0.1');     -- 0
SELECT isIPv4String('not_an_ip');     -- 0

SELECT isIPv6String('2001:db8::1');   -- 1
SELECT isIPv6String('192.168.1.1');   -- 0
```

## Using Domains in Aggregations

Because domains share storage with their base types, aggregation functions work naturally:

```sql
-- Count unique source IPs
SELECT
    count()          AS total_connections,
    uniq(source_ip)  AS unique_sources
FROM network_connections;

-- Group by IP address
SELECT
    source_ip,
    count()  AS connection_count
FROM network_connections
GROUP BY source_ip
ORDER BY connection_count DESC;
```

## The Domain Type Concept

The domain mechanism is extensible in principle - domains inherit all operators and functions from their base type while adding validation. Any comparison, arithmetic, or function that works on `UInt32` works on `IPv4`. Any function that works on `UInt128` works on `IPv6`. The domain layer only adds:

1. Input parsing from a human-readable string format
2. Output formatting back to the human-readable string format
3. Rejection of values that do not conform to the domain's rules

## Summary

ClickHouse domain types like `IPv4` and `IPv6` add input validation and display formatting on top of `UInt32` and `UInt128` big-endian storage. They accept human-readable strings during insert, reject invalid values, and display in standard notation. Because they share storage with their base types, all numeric and binary functions remain available. Use `isIPv4String()` and `isIPv6String()` to validate input before insertion when working with untrusted data.
