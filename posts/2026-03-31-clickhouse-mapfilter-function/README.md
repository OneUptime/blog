# How to Use mapFilter() Function in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Map Function, Lambda, Filtering

Description: Learn how mapFilter() selects only matching key-value pairs from a Map using a lambda predicate in ClickHouse, with examples for removing zero values and key selection.

---

`mapFilter()` is a higher-order function in ClickHouse that filters a Map based on a predicate lambda applied to each key-value pair. It returns a new Map containing only the entries for which the lambda returns a non-zero (truthy) result. This is the map equivalent of `arrayFilter()` and is useful for cleaning up sparse maps, extracting sub-maps by key pattern, removing zero or null-equivalent values, and focusing downstream processing on relevant entries only.

## Function Signature

```text
mapFilter(func, map)
```

The `func` argument is a lambda `(k, v) -> condition`. Entries where the condition evaluates to a non-zero value are kept; all others are removed. The returned map preserves the original key and value types.

## Basic Usage

Filter a simple numeric map to keep only entries with positive values.

```sql
SELECT mapFilter((k, v) -> v > 0, map('a', 3, 'b', 0, 'c', -1, 'd', 7)) AS positive_only;
```

The result is `{'a': 3, 'd': 7}`. Entries with zero or negative values are excluded.

Filter by key prefix to extract a sub-map.

```sql
SELECT mapFilter(
    (k, v) -> startsWith(k, 'db_'),
    map('db_reads', 1500, 'db_writes', 320, 'cache_hits', 4200, 'db_errors', 5)
) AS db_metrics_only;
```

## Setting Up a Sample Table

Create a table storing per-request span attributes as a Map, where some attributes may be empty or zero-valued placeholders.

```sql
CREATE TABLE trace_spans
(
    trace_id   String,
    span_id    String,
    service    String,
    attributes Map(String, String)
)
ENGINE = MergeTree
ORDER BY (service, trace_id);

INSERT INTO trace_spans VALUES
('tr-001', 'sp-001', 'api',     map('http.method', 'GET',  'http.status', '200', 'db.query', '',     'user.id', 'u-42')),
('tr-001', 'sp-002', 'db',      map('db.system', 'postgres', 'db.query', 'SELECT * FROM orders', 'http.method', '', 'user.id', '')),
('tr-002', 'sp-003', 'api',     map('http.method', 'POST', 'http.status', '201', 'db.query', '',     'user.id', 'u-99')),
('tr-002', 'sp-004', 'cache',   map('cache.key', 'session:u-99', 'cache.hit', '1', 'http.method', '', 'db.query', ''));
```

## Removing Empty String Values

Use `mapFilter()` to strip out placeholder empty-string values, producing a compact map with only meaningful attributes.

```sql
SELECT
    span_id,
    service,
    mapFilter((k, v) -> v != '', attributes) AS clean_attributes
FROM trace_spans;
```

## Filtering by Key Name Pattern

Extract only the HTTP-related attributes from a mixed-purpose attribute map.

```sql
SELECT
    span_id,
    service,
    mapFilter((k, v) -> startsWith(k, 'http.'), attributes) AS http_attributes
FROM trace_spans;
```

## Setting Up a Numeric Metric Table

Create a table with numeric metric maps to demonstrate numeric filtering patterns.

```sql
CREATE TABLE host_metrics
(
    host    String,
    ts      DateTime,
    metrics Map(String, Float64)
)
ENGINE = MergeTree
ORDER BY (host, ts);

INSERT INTO host_metrics VALUES
('web-01', '2024-04-01 10:00:00', map('cpu_pct', 72.5, 'mem_pct', 88.1, 'disk_pct', 45.0, 'net_errors', 0.0, 'swap_pct', 0.0)),
('web-02', '2024-04-01 10:00:00', map('cpu_pct', 15.2, 'mem_pct', 62.0, 'disk_pct', 78.3, 'net_errors', 3.0, 'swap_pct', 12.5)),
('db-01',  '2024-04-01 10:00:00', map('cpu_pct', 95.1, 'mem_pct', 97.4, 'disk_pct', 85.0, 'net_errors', 0.0, 'swap_pct', 55.0));
```

## Keeping Only Non-Zero Metrics

Filter out metric dimensions with zero values to focus only on active signals.

```sql
SELECT
    host,
    mapFilter((k, v) -> v > 0.0, metrics) AS active_metrics
FROM host_metrics;
```

## Identifying Critical Threshold Breaches

Filter the map to retain only metrics that exceed alert thresholds, making it easy to see which dimensions are in violation per host.

```sql
SELECT
    host,
    mapFilter((k, v) -> v > 80.0, metrics) AS breached_metrics
FROM host_metrics
WHERE length(mapFilter((k, v) -> v > 80.0, metrics)) > 0;
```

## Combining mapFilter with mapApply

First normalize values with `mapApply()`, then keep only the entries within a valid range using `mapFilter()`.

```sql
SELECT
    host,
    mapFilter(
        (k, v) -> v BETWEEN 0.0 AND 100.0,
        mapApply((k, v) -> (k, round(v, 1)), metrics)
    ) AS valid_pct_metrics
FROM host_metrics;
```

## Summary

`mapFilter()` provides a clean, inline way to reduce a Map to only the entries that satisfy a condition. Use it to remove empty or zero-valued placeholder entries, extract sub-maps by key prefix or pattern, identify threshold breaches, and clean up sparse maps before further processing. The lambda receives both key and value, giving full flexibility to filter based on either dimension or a combination of both. Chain `mapFilter()` with `mapApply()`, `mapKeys()`, or `mapValues()` to build complete map processing pipelines.
