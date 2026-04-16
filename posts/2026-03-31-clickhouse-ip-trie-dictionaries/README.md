# How to Create IP Trie Dictionaries in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Dictionary, IP Trie, Geolocation, Network

Description: Learn how to create IP trie dictionaries in ClickHouse to perform fast IP-to-attribute lookups such as geolocation, ASN, and network owner enrichment.

---

IP trie dictionaries in ClickHouse use a prefix tree (trie) data structure to map IP address ranges (CIDR blocks) to attributes. This makes them ideal for IP geolocation, ASN lookup, and network classification without needing a JOIN against a range table.

## Why IP Trie Dictionaries

Traditional IP range lookups require range comparisons that are slow on large tables. A trie encodes prefix matching natively, giving you O(prefix length) lookups regardless of how many CIDR blocks the dictionary holds.

## Creating an IP Trie Dictionary

The source table must have a column of type `String` containing CIDR notation (e.g., `192.168.1.0/24`) as the key:

```sql
CREATE TABLE ip_to_geo
(
    prefix  String,
    country String,
    asn     UInt32,
    org     String
)
ENGINE = MergeTree
ORDER BY prefix;
```

Then define the dictionary:

```sql
CREATE DICTIONARY ip_geo_dict
(
    prefix  String,
    country String,
    asn     UInt32,
    org     String
)
PRIMARY KEY prefix
SOURCE(CLICKHOUSE(
    HOST 'localhost' PORT 9000
    USER 'default' PASSWORD ''
    DB 'default' TABLE 'ip_to_geo'
))
LAYOUT(IP_TRIE())
LIFETIME(MIN 600 MAX 1200);
```

## Querying the IP Trie Dictionary

Use `dictGet` to look up a client IP address:

```sql
SELECT
    client_ip,
    dictGet('ip_geo_dict', 'country', tuple(IPv4StringToNum(client_ip))) AS country,
    dictGet('ip_geo_dict', 'asn',     tuple(IPv4StringToNum(client_ip))) AS asn
FROM access_logs
LIMIT 20;
```

For IPv6 addresses use `IPv6StringToNum`:

```sql
SELECT dictGet('ip_geo_dict', 'country', tuple(IPv6StringToNum(client_ip))) AS country
FROM access_logs_v6
LIMIT 5;
```

## Loading GeoIP Data

You can import MaxMind GeoLite2 CSV exports into a ClickHouse table and use them as the source:

```bash
clickhouse-client --query="INSERT INTO ip_to_geo FORMAT CSVWithNames" < GeoLite2-City-Blocks-IPv4.csv
```

## Reloading the Dictionary

After updating the source table, force a reload:

```sql
SYSTEM RELOAD DICTIONARY ip_geo_dict;
```

## Verifying the Dictionary

```sql
SELECT name, element_count, bytes_allocated, status
FROM system.dictionaries
WHERE name = 'ip_geo_dict';
```

## Practical Use Case - Traffic by Country

```sql
SELECT
    dictGet('ip_geo_dict', 'country', tuple(IPv4StringToNum(client_ip))) AS country,
    count() AS requests,
    sum(response_bytes) AS total_bytes
FROM access_logs
WHERE event_date = today()
GROUP BY country
ORDER BY requests DESC
LIMIT 20;
```

## Summary

IP trie dictionaries provide fast prefix-match lookups for IP geolocation and network enrichment directly inside ClickHouse queries. By using the `IP_TRIE` layout and CIDR-based source data, you can enrich events with country, ASN, and organization attributes without expensive range joins.
