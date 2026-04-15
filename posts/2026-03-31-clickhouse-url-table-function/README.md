# How to Use url() Table Function in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Table Function, HTTP, SQL, Database, ETL

Description: Learn how to use the url() table function in ClickHouse to query remote HTTP and HTTPS endpoints as virtual tables, stream data from APIs, and write results to remote URLs.

---

The `url()` table function in ClickHouse allows you to read data from any HTTP or HTTPS endpoint and treat it as a regular table. This is one of the simplest ways to pull data from external REST APIs, public datasets, or internal services without a dedicated connector.

## What Is the url() Table Function?

`url()` fetches data from a remote URL using HTTP GET (for reads) or HTTP POST (for writes) and presents the response as a set of rows. The response must be in a format ClickHouse can parse, such as CSV, TSV, JSONEachRow, or Parquet.

```sql
SELECT *
FROM url(
    'https://datasets.clickhouse.com/hits/tsv/hits_v1.tsv.xz',
    'TSV',
    'WatchID UInt64, JavaEnable UInt8, Title String, GoodEvent UInt16'
)
LIMIT 5;
```

## Basic Syntax

```sql
url(URL [, format] [, structure] [, headers])
```

| Parameter   | Description |
|-------------|-------------|
| `url`       | The HTTP or HTTPS URL to fetch from |
| `format`    | Any ClickHouse input format: `CSV`, `TSV`, `JSONEachRow`, `Parquet`, etc. (optional) |
| `structure` | Column definitions as `'col type, ...'` (optional) |
| `headers`   | Optional map of HTTP headers |

## Reading a Public CSV Dataset

```sql
SELECT
    country,
    population,
    gdp_usd
FROM url(
    'https://example.com/data/countries.csv',
    'CSVWithNames',
    'country String, population UInt64, gdp_usd Float64'
)
ORDER BY population DESC
LIMIT 10;
```

## Reading JSON Lines from an API

Many APIs return newline-delimited JSON (JSONEachRow). You can query them directly:

```sql
SELECT
    user_id,
    event_type,
    toDate(event_ts) AS event_date
FROM url(
    'https://api.myservice.com/events/stream',
    'JSONEachRow',
    'user_id UInt32, event_type String, event_ts DateTime'
)
WHERE event_type = 'purchase'
LIMIT 1000;
```

## Sending Custom HTTP Headers

Use the `headers` argument to pass authentication tokens or content-type headers:

```sql
SELECT *
FROM url(
    'https://api.myservice.com/v1/metrics',
    'JSONEachRow',
    'metric_name String, value Float64, ts DateTime',
    headers('Authorization' = 'Bearer my_api_token_here', 'Accept' = 'application/x-ndjson')
)
LIMIT 100;
```

## Reading Parquet from a Remote URL

```sql
SELECT
    host,
    avg(cpu_percent) AS avg_cpu,
    max(mem_bytes)   AS peak_mem
FROM url(
    'https://storage.mycompany.com/exports/metrics_2026_03.parquet',
    'Parquet',
    'host String, cpu_percent Float32, mem_bytes UInt64, recorded_at DateTime'
)
GROUP BY host
ORDER BY avg_cpu DESC;
```

## Importing Remote Data into a ClickHouse Table

Fetch once and store permanently:

```sql
CREATE TABLE exchange_rates
(
    date         Date,
    currency     String,
    rate_to_usd  Float64
)
ENGINE = MergeTree()
ORDER BY (date, currency);

INSERT INTO exchange_rates
SELECT *
FROM url(
    'https://open.er-api.com/v6/latest/rates.csv',
    'CSVWithNames',
    'date Date, currency String, rate_to_usd Float64'
);
```

## Querying GitHub Raw Files

Public repos on GitHub serve raw files over HTTPS - a convenient way to load reference data:

```sql
SELECT *
FROM url(
    'https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.csv',
    'CSVWithNames',
    'name String, alpha2 String, alpha3 String, country_code UInt16'
)
LIMIT 20;
```

## Writing Results to a Remote Endpoint

`INSERT INTO FUNCTION url(...)` sends data via HTTP POST to the target URL:

```sql
INSERT INTO FUNCTION url(
    'https://ingest.myservice.com/api/events',
    'JSONEachRow',
    'date Date, product String, total_sales Float64'
)
SELECT
    toDate(created_at) AS date,
    product_name       AS product,
    sum(price)         AS total_sales
FROM orders
GROUP BY date, product;
```

## Using url() in a JOIN

Enrich local table rows with remote reference data:

```sql
SELECT
    s.sale_id,
    s.amount,
    r.region_name
FROM sales AS s
JOIN url(
    'https://config.myservice.com/regions.json',
    'JSONEachRow',
    'region_code String, region_name String'
) AS r ON s.region_code = r.region_code;
```

## Combining url() with Glob Patterns

For paginated or date-partitioned remote files:

```sql
-- Read daily export files for March 2026
SELECT count(), sum(revenue)
FROM url(
    'https://exports.myservice.com/sales/2026-03-{01..31}.csv',
    'CSV',
    'order_id UInt64, product String, revenue Float64'
);
```

## Configuration for url()

Several settings control `url()` behavior:

```sql
-- Increase timeout for slow endpoints (seconds)
SET http_connection_timeout = 30;
SET http_receive_timeout    = 120;

-- Allow redirects (default is 0)
SET max_http_get_redirects = 5;

-- Set the read buffer size (bytes)
SET max_read_buffer_size = 10485760; -- 10 MB
```

In `users.xml` or profile settings, you can restrict which hosts are reachable:

```xml
<remote_url_allow_hosts>
    <host>trusted-data-source.com</host>
    <host_regexp>.*\.mycompany\.com</host_regexp>
</remote_url_allow_hosts>
```

## Caching Remote Data

`url()` fetches fresh data on every query. To avoid repeated network calls during development or testing, load the data into a Memory or MergeTree table first:

```sql
CREATE TABLE cached_rates ENGINE = Memory AS
SELECT *
FROM url(
    'https://open.er-api.com/v6/latest/rates.csv',
    'CSVWithNames',
    'date Date, currency String, rate_to_usd Float64'
);

-- Now query the in-memory copy without network overhead
SELECT * FROM cached_rates WHERE currency = 'EUR';
```

## Error Handling

- If the remote server returns a non-200 status code, ClickHouse raises an exception.
- Malformed rows are handled according to the `input_format_allow_errors_num` setting.
- For unreliable endpoints, wrap the call in a materialized view refresh job rather than querying in real time.

## Summary

The `url()` table function bridges ClickHouse and the broader HTTP ecosystem. Key points:

- Read any HTTP/HTTPS resource in supported formats with no extra infrastructure.
- Pass custom headers for API authentication.
- Write results to remote endpoints using `INSERT INTO FUNCTION url(...)`.
- Cache remote data locally when the same URL is queried repeatedly.
- Restrict allowed hosts via `remote_url_allow_hosts` for security.
