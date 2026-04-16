# How to Use IPv6CIDRToRange() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, IP Function, Analytics, Network, Security

Description: Learn how IPv6CIDRToRange() returns the first and last address of an IPv6 CIDR block in ClickHouse, enabling IPv6 subnet membership tests and network segmentation.

---

`IPv6CIDRToRange(ip, prefix_length)` takes an IPv6 address (as `IPv6` or `String`) and a prefix length (`UInt8`, 0-128) and returns a `Tuple(IPv6, IPv6)` containing the first and last address of the corresponding CIDR prefix. This is the IPv6 equivalent of `IPv4CIDRToRange()` and works identically in structure, enabling subnet membership tests, prefix matching, and CIDR-based lookup tables for IPv6 traffic.

## Basic Usage

```sql
-- Get the range for various IPv6 CIDR prefixes
SELECT
    ip_str,
    prefix,
    IPv6CIDRToRange(toIPv6(ip_str), prefix).1 AS first_addr,
    IPv6CIDRToRange(toIPv6(ip_str), prefix).2 AS last_addr
FROM (
    SELECT arrayJoin([
        ('2001:db8::1',   32),
        ('2001:db8::1',   48),
        ('fe80::1',       10),
        ('::1',          128),
        ('fc00::1',        7)
    ]) AS t,
    t.1 AS ip_str,
    t.2 AS prefix
);
```

```text
ip_str       prefix  first_addr       last_addr
2001:db8::1  32      2001:db8::       2001:db8:ffff:ffff:ffff:ffff:ffff:ffff
2001:db8::1  48      2001:db8::       2001:db8::ffff:ffff:ffff:ffff:ffff
fe80::1      10      fe80::           febf:ffff:ffff:ffff:ffff:ffff:ffff:ffff
::1          128     ::1              ::1
fc00::1      7       fc00::           fdff:ffff:ffff:ffff:ffff:ffff:ffff:ffff
```

## IPv6 Subnet Membership Check

```sql
-- Check whether requests come from within the 2001:db8::/32 block
SELECT
    client_ip,
    toIPv6(client_ip)                                                              AS ip_val,
    IPv6CIDRToRange(toIPv6('2001:db8::'), 32).1                                    AS first,
    IPv6CIDRToRange(toIPv6('2001:db8::'), 32).2                                    AS last,
    ip_val BETWEEN first AND last                                                  AS in_prefix
FROM ipv6_access_logs
WHERE toDate(ts) = yesterday()
LIMIT 30;
```

## Classifying IPv6 Traffic by Address Type

```sql
-- Tag requests by IPv6 address category using CIDR ranges
SELECT
    client_ip,
    CASE
        WHEN toIPv6(client_ip) = toIPv6('::1')
            THEN 'loopback'
        WHEN toIPv6(client_ip) BETWEEN
             IPv6CIDRToRange(toIPv6('fe80::'), 10).1 AND
             IPv6CIDRToRange(toIPv6('fe80::'), 10).2
            THEN 'link-local'
        WHEN toIPv6(client_ip) BETWEEN
             IPv6CIDRToRange(toIPv6('fc00::'), 7).1 AND
             IPv6CIDRToRange(toIPv6('fc00::'), 7).2
            THEN 'unique-local (ULA)'
        WHEN toIPv6(client_ip) BETWEEN
             IPv6CIDRToRange(toIPv6('2001:db8::'), 32).1 AND
             IPv6CIDRToRange(toIPv6('2001:db8::'), 32).2
            THEN 'documentation'
        ELSE 'global-unicast'
    END AS address_type,
    count() AS requests
FROM ipv6_access_logs
WHERE toDate(ts) = yesterday()
GROUP BY client_ip, address_type
ORDER BY requests DESC
LIMIT 30;
```

## Building an IPv6 CIDR Owner Lookup Table

```sql
-- Store known IPv6 allocations and their owners
CREATE TABLE ipv6_cidr_owners
(
    prefix      IPv6,
    prefix_len  UInt8,
    owner       String,
    region      String
)
ENGINE = MergeTree()
ORDER BY (prefix, prefix_len);

INSERT INTO ipv6_cidr_owners VALUES
    (toIPv6('2001:db8::'),  32, 'Documentation',   'global'),
    (toIPv6('2606:4700::'), 32, 'CloudflareEdge',  'global'),
    (toIPv6('2a00:1450::'), 32, 'GoogleIPv6',      'global');
```

```sql
-- Join access logs with CIDR owner table
SELECT
    al.client_ip,
    co.owner,
    co.region,
    count() AS requests
FROM ipv6_access_logs al
JOIN ipv6_cidr_owners co
  ON toIPv6(al.client_ip) BETWEEN
       IPv6CIDRToRange(co.prefix, co.prefix_len).1 AND
       IPv6CIDRToRange(co.prefix, co.prefix_len).2
WHERE toDate(al.ts) = yesterday()
GROUP BY al.client_ip, co.owner, co.region
ORDER BY requests DESC
LIMIT 30;
```

## Counting Prefix Length Distribution

```sql
-- How many unique /48 prefixes appear in traffic (ISP-level granularity)?
SELECT
    IPv6CIDRToRange(toIPv6(client_ip), 48).1 AS prefix_48,
    count()                                  AS requests,
    uniq(client_ip)                          AS unique_addresses
FROM ipv6_access_logs
WHERE toDate(ts) = yesterday()
GROUP BY prefix_48
ORDER BY requests DESC
LIMIT 20;
```

## ULA (Unique Local Address) Detection

```sql
-- Identify internal traffic from ULA ranges (fc00::/7)
SELECT
    client_ip,
    count() AS requests
FROM ipv6_access_logs
WHERE toDate(ts) = yesterday()
  AND toIPv6(client_ip) BETWEEN
        IPv6CIDRToRange(toIPv6('fc00::'), 7).1 AND
        IPv6CIDRToRange(toIPv6('fc00::'), 7).2
GROUP BY client_ip
ORDER BY requests DESC
LIMIT 20;
```

## Subnet Size for IPv6 Prefixes

```sql
-- Calculate address space size as a power of 2 for common prefix lengths
SELECT
    prefix_len,
    128 - prefix_len AS host_bits,
    pow(2, 128 - prefix_len) AS total_addresses
FROM (
    SELECT arrayJoin([32, 48, 56, 64, 96, 128]) AS prefix_len
);
```

```text
prefix_len  host_bits  total_addresses
32          96         7.922816251426434e+28
48          80         1.2089258196146292e+24
56          72         4.722366482869645e+21
64          64         1.8446744073709552e+19
96          32         4294967296
128         0          1
```

## Summary

`IPv6CIDRToRange()` returns a `(first, last)` address tuple for any IPv6 CIDR prefix, enabling straightforward `BETWEEN` subnet membership tests on `IPv6` typed values. Use it to classify traffic by address type (link-local, ULA, global unicast), perform prefix-based lookups against a CIDR owner table, or audit which IPv6 prefixes are hitting your infrastructure. Always combine it with `toIPv6()` to ensure type-safe comparisons and to handle both full and compressed IPv6 notations correctly.
