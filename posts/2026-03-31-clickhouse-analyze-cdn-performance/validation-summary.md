# Validation Summary: How to Analyze CDN Performance with ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree engine, LowCardinality, tokenbf_v1 skip index, TTL, partitioning)
- SQL aggregate functions (countIf, sumIf, quantile, formatReadableSize)
- CDN access log schema (cache_status, edge_region, origin health)
- Mermaid diagrams
- Referenced ingestion options: S3 Table Engine, Kafka Table Engine

## Sources Consulted
- ClickHouse MergeTree engine docs: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse data types (LowCardinality, Nullable, IPv4, DateTime64): https://clickhouse.com/docs/en/sql-reference/data-types
- ClickHouse skip indexes (tokenbf_v1): https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-data_skipping-indexes
- ClickHouse date/time functions (today, now, toStartOfHour, toStartOfFiveMinutes, toYYYYMMDD, toDate): https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse aggregate function combinators (-If) and parametric aggregate quantile: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators
- ClickHouse TTL expressions: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-ttl

## Issues Found
No technical issues found.

- Schema types are appropriate: `LowCardinality(String)` for low-cardinality repeated values (edge_region, country, host, method, scheme, cache_status, content_type, origin_host), `IPv4` for client_ip, `DateTime64(3)` for millisecond-precision timestamps, `Nullable(UInt32)`/`Nullable(UInt16)` for origin metrics that may be absent on cache hits.
- `PARTITION BY toYYYYMMDD(requested_at)` combined with `ORDER BY (host, requested_at)` is a reasonable layout for the described access patterns.
- `TTL toDate(requested_at) + INTERVAL 90 DAY DELETE` is valid ClickHouse TTL syntax.
- `tokenbf_v1(32768, 3, 0) GRANULARITY 4` is valid; useful for URI token lookups.
- Parametric aggregate syntax `quantile(0.50)(response_time_ms)` is correct.
- `countIf`/`sumIf` combinators, `formatReadableSize`, `toStartOfHour`/`toStartOfFiveMinutes`, `today()`/`now()`, and `INTERVAL 1 HOUR` all used correctly.
- Date arithmetic `requested_at >= today() - 7` correctly compares DateTime64 against a Date (ClickHouse widens Date to DateTime at midnight).
- Using aliases in `HAVING` and aggregate expressions in `ORDER BY` is supported by ClickHouse.
- `countIf(origin_status >= 500)` on a `Nullable(UInt16)` column safely treats NULL as non-matching (comparison returns NULL, filtered out by countIf).

## Review Notes
- Minor stylistic notes (not corrected, since they are not errors):
  - The `cache_hit_rate_pct < 50` predicate in the HAVING of "Cache Inefficiency Detection" is fine, but when aliases are reused in HAVING, some teams prefer to repeat the expression to avoid implementation-specific behavior; ClickHouse supports this pattern.
  - The TTL uses `toDate(requested_at) + INTERVAL 90 DAY DELETE`; an equivalent shorthand is `requested_at + INTERVAL 90 DAY DELETE`, but the explicit form is also valid.
  - `PARTITION BY toYYYYMMDD(...)` produces one partition per day which may be aggressive for very high-volume CDN logs; monthly or weekly partitioning can reduce part counts, but daily partitioning is still technically correct and commonly used.
- No deprecated APIs or outdated syntax detected. All functions and engine features are current as of ClickHouse 24.x / 25.x.
