# How to Use URL Table Engine in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, URL Table Engine, HTTP, Data Ingestion, External Data

Description: Learn how to use the URL table engine in ClickHouse to query and ingest data directly from HTTP and HTTPS endpoints without staging files locally.

---

The URL table engine in ClickHouse lets you treat a remote HTTP or HTTPS endpoint as a table. You can read data from it using SELECT queries or write data to it using INSERT. This is useful when you need to pull data from REST APIs, webhooks, or publicly accessible datasets directly into your queries.

## Basic Syntax

To create a URL table, use the following syntax:

```sql
CREATE TABLE url_table (
    id UInt32,
    name String,
    value Float64
)
ENGINE = URL('https://example.com/data.csv', CSV);
```

The second argument to URL() is the format. ClickHouse will parse the HTTP response body using that format.

## Querying a Remote CSV File

A practical use case is querying a public CSV dataset:

```sql
CREATE TABLE public_data (
    date Date,
    country String,
    cases UInt64
)
ENGINE = URL(
    'https://raw.githubusercontent.com/example/data/main/cases.csv',
    CSVWithNames
);

SELECT country, sum(cases) AS total
FROM public_data
WHERE date >= '2024-01-01'
GROUP BY country
ORDER BY total DESC
LIMIT 10;
```

ClickHouse fetches and parses the CSV response on each query execution.

## Writing Data to an HTTP Endpoint

The URL engine also supports INSERT, which sends data as an HTTP POST to the specified URL:

```sql
INSERT INTO url_table VALUES (1, 'alpha', 3.14), (2, 'beta', 2.71);
```

This can be useful for pushing aggregated results to a webhook or data pipeline.

## Using Query Parameters

You can pass query parameters as part of the URL:

```sql
CREATE TABLE api_data (
    event_id UInt64,
    event_type String
)
ENGINE = URL(
    'https://api.example.com/events?limit=1000&format=csv',
    CSV
);
```

## Supported Formats

The URL engine supports many ClickHouse input/output formats, including:

```text
CSV
CSVWithNames
TSV
JSONEachRow
Parquet
ORC
```

## Performance Considerations

Since the URL engine fetches data over the network on every query, it is not suitable for high-frequency queries on large datasets. Consider materializing frequently used remote data into a local MergeTree table:

```sql
INSERT INTO local_table
SELECT * FROM url_table;
```

You can also schedule this with a cron job or a ClickHouse refreshable materialized view to keep local data fresh.

## Credentials and Authentication

If the remote endpoint requires Basic Auth, embed credentials in the URL:

```sql
ENGINE = URL('https://user:password@api.example.com/data.json', JSONEachRow);
```

Avoid hardcoding credentials in production. Use environment variables or a secrets manager where possible.

## Summary

The URL table engine is a convenient way to pull external HTTP data into ClickHouse queries without building an ETL pipeline. It works well for low-frequency access to relatively small remote datasets, public APIs, and quick prototyping. For production workloads, materialize the data locally to avoid repeated network fetches and latency in query execution.
