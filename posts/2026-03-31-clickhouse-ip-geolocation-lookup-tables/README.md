# How to Build IP Geolocation Lookup Tables in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Network, Geolocation, Analytics, Dictionary

Description: Learn how to build efficient IP geolocation lookup tables and dictionaries in ClickHouse to enrich network logs with country, city, and ASN data at query time.

---

IP geolocation enrichment maps raw IP addresses to location metadata - country, city, region, ISP, and ASN. ClickHouse supports this through range-based lookup tables that can be queried directly or loaded as flat dictionaries for sub-millisecond lookups. This guide covers loading a MaxMind-style GeoLite2 dataset, querying it with BETWEEN range predicates, and promoting the table to a dictionary for efficient per-row enrichment.

## Schema for a GeoLite2-Style IP Range Table

```sql
-- IPv4 geolocation range table (MaxMind CSV format)
CREATE TABLE geoip_ranges (
    network_id   UInt64,   -- unique id per range (used as dictionary PRIMARY KEY)
    ip_start     UInt32,   -- first IP in range as integer
    ip_end       UInt32,   -- last IP in range as integer
    country_code LowCardinality(String),
    country_name LowCardinality(String),
    region_name  LowCardinality(String),
    city_name    String,
    latitude     Float32,
    longitude    Float32,
    asn          UInt32,
    as_name      String
) ENGINE = MergeTree
ORDER BY ip_start;
```

## Loading GeoLite2 CSV Data

```bash
# Convert MaxMind CSV network notation to integer range pairs
# (example using Python pre-processing step)
python3 convert_geoip.py GeoLite2-City-Blocks-IPv4.csv > geoip_ranges.csv

# Load into ClickHouse
clickhouse-client --query \
  "INSERT INTO geoip_ranges FORMAT CSV" < geoip_ranges.csv
```

A simple Python snippet to produce integer pairs:

```bash
python3 -c "
import ipaddress, csv, sys
reader = csv.DictReader(open('GeoLite2-City-Blocks-IPv4.csv'))
for row in reader:
    net = ipaddress.ip_network(row['network'])
    print(int(net.network_address), int(net.broadcast_address),
          row.get('country_iso_code',''), sep=',')
" > ranges.csv
```

## Basic Lookup Query

```sql
-- Find geolocation for a single IP address
SELECT
    country_code,
    country_name,
    city_name,
    latitude,
    longitude,
    asn,
    as_name
FROM geoip_ranges
WHERE toUInt32(toIPv4('8.8.8.8')) BETWEEN ip_start AND ip_end
LIMIT 1;
```

```text
country_code  country_name   city_name  latitude  longitude  asn    as_name
US            United States  Ashburn    39.0438   -77.4874   15169  Google LLC
```

## Enriching Access Logs with GeoIP Data

```sql
-- Join access logs with the geolocation table
SELECT
    l.event_time,
    l.client_ip,
    g.country_code,
    g.country_name,
    g.city_name,
    g.asn,
    l.request_path,
    l.status_code
FROM access_logs l
LEFT JOIN geoip_ranges g
    ON toUInt32(toIPv4OrZero(l.client_ip)) BETWEEN g.ip_start AND g.ip_end
WHERE l.event_time >= today()
ORDER BY l.event_time DESC
LIMIT 20;
```

## Creating a Range Dictionary for Fast Lookups

For high-throughput enrichment, load the range table into a ClickHouse dictionary. The `RANGE_HASHED` layout supports efficient range-based lookups by a single point key that falls between `MIN` and `MAX` range columns.

```sql
CREATE DICTIONARY geoip_dict (
    network_id   UInt64,
    ip_start     UInt32,
    ip_end       UInt32,
    country_code String,
    country_name String,
    city_name    String,
    latitude     Float32,
    longitude    Float32,
    asn          UInt32,
    as_name      String
)
PRIMARY KEY network_id
SOURCE(CLICKHOUSE(
    TABLE 'geoip_ranges'
    DB 'default'
))
LAYOUT(RANGE_HASHED())
RANGE(MIN ip_start MAX ip_end)
LIFETIME(MIN 3600 MAX 7200);
```

Note: `RANGE_HASHED` requires a non-range `PRIMARY KEY` plus a `RANGE(MIN ... MAX ...)` clause. If you prefer to key lookups by CIDR strings instead of UInt32 bounds, use the `IP_TRIE` layout with a single `String` CIDR primary key.

## Top Countries by Request Volume

```sql
-- Daily requests grouped by country
SELECT
    toDate(l.event_time) AS day,
    g.country_code,
    g.country_name,
    count()              AS requests,
    uniq(l.client_ip)   AS unique_ips
FROM access_logs l
LEFT JOIN geoip_ranges g
    ON toUInt32(toIPv4OrZero(l.client_ip)) BETWEEN g.ip_start AND g.ip_end
GROUP BY day, g.country_code, g.country_name
ORDER BY day DESC, requests DESC
LIMIT 30;
```

## ASN Traffic Analysis

```sql
-- Top 20 ASNs by outbound bytes
SELECT
    g.asn,
    g.as_name,
    count()              AS flows,
    sum(l.response_bytes) AS total_bytes,
    uniq(l.client_ip)   AS unique_ips
FROM access_logs l
LEFT JOIN geoip_ranges g
    ON toUInt32(toIPv4OrZero(l.client_ip)) BETWEEN g.ip_start AND g.ip_end
WHERE l.event_time >= now() - INTERVAL 24 HOUR
GROUP BY g.asn, g.as_name
ORDER BY total_bytes DESC
LIMIT 20;
```

## Geo-Based Access Policy Alerting

```sql
-- Find requests from countries not in the approved list
SELECT
    l.event_time,
    l.client_ip,
    g.country_code,
    g.country_name,
    l.request_path
FROM access_logs l
LEFT JOIN geoip_ranges g
    ON toUInt32(toIPv4OrZero(l.client_ip)) BETWEEN g.ip_start AND g.ip_end
WHERE
    l.event_time >= today()
    AND g.country_code NOT IN ('US', 'CA', 'GB', 'DE', 'AU')
    AND g.country_code != ''
ORDER BY l.event_time DESC
LIMIT 50;
```

## Building a Geo Heatmap Aggregation

```sql
-- Aggregate request counts to 1-degree lat/lon grid cells for heatmap rendering
SELECT
    round(g.latitude)  AS lat_bucket,
    round(g.longitude) AS lon_bucket,
    count()            AS requests
FROM access_logs l
JOIN geoip_ranges g
    ON toUInt32(toIPv4OrZero(l.client_ip)) BETWEEN g.ip_start AND g.ip_end
WHERE l.event_time >= today() - INTERVAL 7 DAY
GROUP BY lat_bucket, lon_bucket
ORDER BY requests DESC;
```

## Refreshing GeoIP Data with EXCHANGE TABLES

MaxMind releases updates twice a week. Use a staging table and atomic rename to refresh without downtime.

```sql
-- Load new data into staging table
CREATE TABLE geoip_ranges_new AS geoip_ranges;

-- (bulk insert new data into geoip_ranges_new)

-- Swap atomically
EXCHANGE TABLES geoip_ranges AND geoip_ranges_new;

-- Drop old data
DROP TABLE geoip_ranges_new;
```

## Summary

Building IP geolocation lookup tables in ClickHouse requires storing ranges as integer pairs (`ip_start`, `ip_end`) indexed on `ip_start`, then joining with `BETWEEN` predicates after converting IP strings to `UInt32` using `toUInt32(toIPv4OrZero(...))`. For high-throughput enrichment, promote the table to a dictionary. Use country and ASN aggregations for dashboards, geo-fencing alerts, and heatmap generation. Refresh data atomically using `EXCHANGE TABLES` to avoid downtime during weekly GeoLite2 updates.
