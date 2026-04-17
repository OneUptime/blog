# How to Use gcs() Table Function for Google Cloud Storage in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, gcs(), Table Function, Google Cloud Storage, GCS, Analytics, SQL

Description: Learn how to use the gcs() table function in ClickHouse to query files stored in Google Cloud Storage directly with SQL, including authentication and format options.

---

The `gcs()` table function in ClickHouse lets you read files from Google Cloud Storage (GCS) directly within SQL queries, without creating a permanent table. It supports the same file formats as `s3()` (Parquet, CSV, JSONEachRow, ORC, etc.) and accepts glob patterns for multi-file reads.

## Syntax

```sql
gcs('gcs_uri', 'hmac_key', 'hmac_secret', 'format')
gcs('gcs_uri', 'hmac_key', 'hmac_secret', 'format', 'structure')
```

GCS uses HMAC keys for ClickHouse authentication. Generate them in GCP Console under Cloud Storage > Settings > Interoperability.

## Reading a Parquet File from GCS

```sql
SELECT *
FROM gcs(
    'https://storage.googleapis.com/my-bucket/data/orders-2026.parquet',
    'GOOG1ABC123HMACKEY',
    'hmac_secret_here',
    'Parquet'
)
LIMIT 10;
```

## Reading Multiple Files with Glob Pattern

```sql
-- Read all monthly files for Q1 2026
SELECT
    product_id,
    sum(revenue) AS total_revenue
FROM gcs(
    'https://storage.googleapis.com/my-bucket/sales/2026-0{1,2,3}-*.parquet',
    'GOOG1ABC123HMACKEY',
    'hmac_secret_here',
    'Parquet'
)
GROUP BY product_id
ORDER BY total_revenue DESC;
```

## Inspecting Schema

```sql
DESCRIBE TABLE gcs(
    'https://storage.googleapis.com/my-bucket/events/events-sample.parquet',
    'GOOG1ABC123HMACKEY',
    'hmac_secret_here',
    'Parquet'
);
```

## Loading GCS Data into ClickHouse

```sql
INSERT INTO orders (order_id, customer_id, amount, created_at)
SELECT order_id, customer_id, amount, created_at
FROM gcs(
    'https://storage.googleapis.com/my-bucket/orders/*.parquet',
    'GOOG1ABC123HMACKEY',
    'hmac_secret_here',
    'Parquet'
);
```

## Reading JSON Lines from GCS

```sql
SELECT
    event_type,
    count() AS cnt
FROM gcs(
    'https://storage.googleapis.com/my-bucket/logs/events-*.jsonl',
    'GOOG1ABC123HMACKEY',
    'hmac_secret_here',
    'JSONEachRow',
    'event_type String, user_id UInt64, ts DateTime'
)
GROUP BY event_type
ORDER BY cnt DESC;
```

## Storing Credentials in Named Collections

To avoid repeating credentials in every query, define a named collection:

```sql
CREATE NAMED COLLECTION gcs_creds AS
    access_key_id = 'GOOG1ABC123HMACKEY',
    secret_access_key = 'hmac_secret_here';
```

Then use it:

```sql
SELECT count()
FROM gcs(gcs_creds, url = 'https://storage.googleapis.com/my-bucket/events/*.parquet', format = 'Parquet');
```

## Reading CSV with Header

```sql
SELECT user_id, signup_date
FROM gcs(
    'https://storage.googleapis.com/my-bucket/users/users.csv',
    'GOOG1ABC123HMACKEY',
    'hmac_secret_here',
    'CSVWithNames'
)
WHERE toYear(signup_date) = 2026;
```

## Comparing gcs() vs S3 Table Engine (for GCS)

```text
gcs() table function           S3 Table Engine (with GCS URL)
Ad hoc, no DDL                 Persistent named table
Good for one-off queries       Good for repeated access
Credentials in query           Credentials in table definition
```

## Summary

The `gcs()` table function enables direct SQL queries over GCS files using HMAC key authentication. Use glob patterns for multi-file reads, push WHERE filters to minimize data transfer, and use named collections to keep credentials out of query text. For high-frequency access to the same GCS bucket, the `S3` table engine (pointed at a `https://storage.googleapis.com/...` URL with HMAC credentials) provides a persistent named table object.
