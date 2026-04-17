# Validation Summary: How to Store and Analyze Firewall Logs in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree engine, IPv4 data type, LowCardinality, TTL, aggregate functions)
- SQL for log analytics
- Firewall log schema design

## Sources Consulted
- ClickHouse CREATE TABLE docs: https://clickhouse.com/docs/en/sql-reference/statements/create/table
- ClickHouse MergeTree engine docs: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse data types (IPv4, LowCardinality, UUID): https://clickhouse.com/docs/en/sql-reference/data-types
- ClickHouse aggregate functions (count, countIf, countDistinct, groupArray, sum): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference
- ClickHouse date/time functions (toYYYYMMDD, toStartOfHour, toDate, now): https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse TTL clause docs: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-ttl

## Issues Found
No technical issues found.

All SQL queries are syntactically valid:
- Table schema uses correct ClickHouse data types (UUID with generateUUIDv4(), IPv4, UInt16, UInt64, LowCardinality(String), DateTime).
- MergeTree engine with PARTITION BY toYYYYMMDD(log_time), ORDER BY tuple, and TTL expression are all valid syntax.
- Aggregate functions (count, countDistinct, countIf, sum, groupArray, round) are used correctly.
- Date/time functions (now(), toStartOfHour, INTERVAL literals) are valid.
- The `groupArray(5)(DISTINCT CAST(dest_port AS String))` is valid — ClickHouse supports the DISTINCT modifier within aggregate function arguments, and the parameterized form `groupArray(N)(x)` limits array size to N elements.

## Review Notes
- Daily partitioning via `toYYYYMMDD(log_time)` is appropriate for high-volume firewall logs with a 180-day TTL (max ~180 partitions), though monthly partitioning (`toYYYYMM`) is the more common default; daily is a valid trade-off for this use case.
- The `ORDER BY (action, source_ip, log_time)` primary key is reasonable given the queries shown (which often filter by action first). Time-range-only queries will still benefit from partition pruning.
- In the "Top Blocked Source IPs" query, the explicit `CAST(dest_port AS String)` inside `groupArray` is unnecessary — `Array(UInt16)` is a valid ClickHouse type and `groupArray(5)(DISTINCT dest_port)` would work directly. This is a minor stylistic point, not a correctness issue, so it was left unchanged. Alternatively, `groupUniqArray(5)(dest_port)` is the more idiomatic ClickHouse way to get a deduplicated, bounded-size array.
- The hardcoded action values `'allow'` and `'deny'` assume a specific firewall log format (common for Cisco ASA, pfSense, iptables-style logs). Users ingesting logs from other firewalls (e.g., Palo Alto uses "allow"/"deny"/"drop"; Windows Firewall uses "ALLOW"/"BLOCK") may need to normalize during ingest.
