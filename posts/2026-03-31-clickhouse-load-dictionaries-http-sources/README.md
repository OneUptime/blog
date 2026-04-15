# How to Load Dictionaries from HTTP Sources in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Dictionary, HTTP Source, External Data, Integration

Description: Learn how to load ClickHouse dictionaries from HTTP endpoints, enabling lookups against external APIs and dynamically updated reference data.

---

## HTTP Dictionary Sources

ClickHouse can load dictionary data from any HTTP endpoint that returns data in a supported format (CSV, TSV, JSON, etc.). This is useful for loading reference data from external APIs, microservices, or hosted files.

## Basic HTTP Dictionary

```sql
CREATE DICTIONARY country_codes_http (
    code String,
    name String DEFAULT 'Unknown',
    continent String DEFAULT 'Unknown'
)
PRIMARY KEY code
SOURCE(HTTP(
    url 'https://example.com/api/countries.csv'
    format 'CSVWithNames'
))
LAYOUT(COMPLEX_KEY_HASHED())
LIFETIME(3600);
```

The HTTP endpoint must return data in the specified format with columns matching the dictionary definition.

## Example CSV Response Format

The HTTP endpoint should return data like:

```text
code,name,continent
US,United States,North America
GB,United Kingdom,Europe
JP,Japan,Asia
DE,Germany,Europe
```

## HTTP with Authentication

```sql
CREATE DICTIONARY geo_data_dict (
    ip_prefix String,
    country String DEFAULT '',
    asn UInt32 DEFAULT 0
)
PRIMARY KEY ip_prefix
SOURCE(HTTP(
    url 'https://api.example.com/geo-data.tsv'
    format 'TabSeparated'
    headers(
        header(name 'Authorization' value 'Bearer your-api-token'),
        header(name 'X-Client-ID' value 'clickhouse-prod')
    )
))
LAYOUT(COMPLEX_KEY_HASHED())
LIFETIME(MIN 3600 MAX 7200);
```

## HTTP with Custom Format

Use TSV with named columns:

```sql
CREATE DICTIONARY feature_flags_dict (
    flag_id UInt64,
    flag_name String DEFAULT '',
    enabled UInt8 DEFAULT 0,
    rollout_pct Float32 DEFAULT 0.0
)
PRIMARY KEY flag_id
SOURCE(HTTP(
    url 'http://internal-config-service/feature-flags'
    format 'TabSeparatedWithNames'
))
LAYOUT(FLAT())
LIFETIME(MIN 60 MAX 120);
```

## Querying the Dictionary

```sql
SELECT
    event_id,
    user_id,
    country_code,
    dictGetString('country_codes_http', 'name', tuple(country_code)) AS country_name
FROM events
WHERE event_time >= today()
LIMIT 20;
```

## Monitor Dictionary Status

```sql
SELECT
    name,
    status,
    element_count,
    last_successful_update_time,
    last_exception
FROM system.dictionaries
WHERE name = 'country_codes_http';
```

## Handle Load Failures Gracefully

Configure a fallback behavior when the HTTP source is unavailable:

```sql
LIFETIME(MIN 3600 MAX 7200)
-- ClickHouse will continue using the last successfully loaded data
-- if the HTTP source fails to respond during refresh
```

## Force Reload

```sql
SYSTEM RELOAD DICTIONARY country_codes_http;
```

## Debugging HTTP Connections

Check the last exception if the dictionary fails to load:

```sql
SELECT last_exception
FROM system.dictionaries
WHERE name = 'country_codes_http';
```

## Best Practices

- Use HTTP sources for reference data that updates infrequently (hourly or daily)
- Set `LIFETIME` to a reasonable interval - too short causes excessive HTTP requests
- Ensure the endpoint supports HEAD requests or returns proper cache headers
- Use internal HTTP sources for sensitive data rather than external APIs

## Summary

HTTP dictionary sources in ClickHouse allow you to load reference data from any accessible web endpoint. This is powerful for integrating with internal configuration services, external enrichment APIs, and dynamically updated lookup tables without manual ETL pipelines.
