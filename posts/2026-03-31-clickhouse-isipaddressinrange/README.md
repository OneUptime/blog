# How to Use isIPAddressInRange() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Network, IP Address, Security, Analytics

Description: Learn how isIPAddressInRange() checks whether an IPv4 or IPv6 address falls within a CIDR range, enabling subnet filtering, access control audits, and traffic segmentation.

---

`isIPAddressInRange(address, prefix)` returns `1` when the string `address` falls within the CIDR `prefix`, and `0` otherwise. Both arguments are strings. The function handles IPv4 and IPv6 transparently - you do not need to convert to a native type first. If the IP version of the address and the CIDR don't match (e.g. an IPv6 address against an IPv4 CIDR), the result is `0`. This makes it ideal for network-aware filtering directly inside SQL without writing bitwise arithmetic by hand.

## Basic Usage

```sql
-- Simple CIDR membership checks
SELECT
    isIPAddressInRange('192.168.1.50',  '192.168.1.0/24')  AS in_subnet,
    isIPAddressInRange('10.0.0.1',      '192.168.1.0/24')  AS not_in_subnet,
    isIPAddressInRange('192.168.1.255', '192.168.1.0/24')  AS broadcast_in,
    isIPAddressInRange('2001:db8::1',   '2001:db8::/32')   AS ipv6_in_range,
    isIPAddressInRange('::1',           '::1/128')         AS loopback;
```

```text
in_subnet  not_in_subnet  broadcast_in  ipv6_in_range  loopback
1          0              1             1              1
```

## Filtering Requests from a Private Network

```sql
-- Count requests that originate from RFC-1918 private address space
SELECT
    count() AS private_requests
FROM access_logs
WHERE
    isIPAddressInRange(client_ip, '10.0.0.0/8')
    OR isIPAddressInRange(client_ip, '172.16.0.0/12')
    OR isIPAddressInRange(client_ip, '192.168.0.0/16');
```

## Security Audit: Access from Unexpected Subnets

```sql
-- Find admin-panel requests not coming from the approved management subnet
SELECT
    event_time,
    client_ip,
    request_path,
    user_id
FROM access_logs
WHERE
    request_path LIKE '/admin%'
    AND NOT isIPAddressInRange(client_ip, '10.10.0.0/16')
ORDER BY event_time DESC
LIMIT 50;
```

## Tagging Requests by Network Zone

```sql
-- Assign a zone label to each request row
SELECT
    client_ip,
    request_path,
    CASE
        WHEN isIPAddressInRange(client_ip, '10.0.0.0/8')       THEN 'corporate'
        WHEN isIPAddressInRange(client_ip, '172.16.0.0/12')    THEN 'docker'
        WHEN isIPAddressInRange(client_ip, '192.168.0.0/16')   THEN 'home-lab'
        WHEN isIPAddressInRange(client_ip, '127.0.0.0/8')      THEN 'loopback'
        ELSE 'public'
    END AS network_zone
FROM access_logs
LIMIT 20;
```

## Aggregating Traffic by Zone

```sql
-- Summarize daily traffic volume per network zone
SELECT
    toDate(event_time) AS day,
    CASE
        WHEN isIPAddressInRange(client_ip, '10.0.0.0/8')     THEN 'corporate'
        WHEN isIPAddressInRange(client_ip, '172.16.0.0/12')  THEN 'docker'
        WHEN isIPAddressInRange(client_ip, '192.168.0.0/16') THEN 'home-lab'
        ELSE 'public'
    END AS zone,
    count()             AS requests,
    sum(response_bytes) AS bytes
FROM access_logs
GROUP BY day, zone
ORDER BY day DESC, requests DESC;
```

## Checking Against a Dynamic Allow-List

When your allow-list is stored in a table you can JOIN or use `IN` with a subquery, but for a small number of CIDRs a `multiIf` or array-based approach is more readable.

```sql
-- Allow-list stored in a table
CREATE TABLE allowed_subnets (
    id          UInt32,
    cidr        String,
    description String
) ENGINE = MergeTree ORDER BY id;

INSERT INTO allowed_subnets VALUES
    (1, '10.10.0.0/16',   'prod-vpc'),
    (2, '10.20.0.0/16',   'staging-vpc'),
    (3, '203.0.113.0/24', 'office-egress');

-- Check if a set of client IPs are in any allowed subnet
SELECT
    l.client_ip,
    groupArray(s.description) AS matching_subnets,
    notEmpty(groupArray(s.description)) AS is_allowed
FROM access_logs l
LEFT JOIN allowed_subnets s
    ON isIPAddressInRange(l.client_ip, s.cidr)
GROUP BY l.client_ip
ORDER BY is_allowed ASC, l.client_ip
LIMIT 20;
```

## IPv6 CIDR Filtering

```sql
-- Count IPv6 requests from the documentation prefix (2001:db8::/32)
SELECT
    count() AS doc_prefix_requests
FROM access_logs
WHERE isIPv6String(client_ip)
  AND isIPAddressInRange(client_ip, '2001:db8::/32');
```

## Detecting Tor Exit Nodes (Example Pattern)

```sql
-- Flag requests from known Tor exit CIDRs (illustrative example)
CREATE TABLE tor_exit_ranges (
    cidr String
) ENGINE = MergeTree ORDER BY cidr;

INSERT INTO tor_exit_ranges VALUES
    ('185.220.100.0/22'),
    ('185.220.101.0/24'),
    ('104.244.72.0/21');

-- ClickHouse does not support correlated subqueries (the inner query
-- cannot reference outer columns), so use an INNER JOIN with the
-- function in the ON clause to match each request against any CIDR.
SELECT DISTINCT
    l.event_time,
    l.client_ip,
    l.request_path
FROM access_logs l
INNER JOIN tor_exit_ranges t
    ON isIPAddressInRange(l.client_ip, t.cidr)
ORDER BY l.event_time DESC
LIMIT 20;
```

## Materialized Column for Zone Precomputation

For high-volume tables, precompute the zone at insert time using a materialized column.

```sql
CREATE TABLE access_logs_zoned (
    event_time   DateTime,
    client_ip    String,
    request_path String,
    zone         String MATERIALIZED
        CASE
            WHEN isIPAddressInRange(client_ip, '10.0.0.0/8')     THEN 'corporate'
            WHEN isIPAddressInRange(client_ip, '172.16.0.0/12')  THEN 'docker'
            WHEN isIPAddressInRange(client_ip, '192.168.0.0/16') THEN 'home-lab'
            ELSE 'public'
        END
) ENGINE = MergeTree ORDER BY (zone, event_time);
```

## Summary

`isIPAddressInRange(address, prefix)` provides CIDR membership testing for both IPv4 and IPv6 strings without any manual type conversion. Use it for subnet filtering in WHERE clauses, CASE-based zone tagging, security audits, and materialized columns that precompute network zones at insert time. For large allow-list tables, a LEFT JOIN pattern with the function in the ON clause works cleanly, though indexing on the CIDR side is not possible - keep allow-lists small or use dictionary lookups for high-throughput paths.
