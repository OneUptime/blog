# Validation Summary: How to Ingest Data from Syslog into ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree, LowCardinality, TTL, HTTP interface)
- Vector.dev (syslog source, ClickHouse sink)
- rsyslog (omhttp output module)
- Syslog protocol (TCP)

## Sources Consulted
- Vector syslog source reference: https://vector.dev/docs/reference/configuration/sources/syslog/
- Vector ClickHouse sink reference: https://vector.dev/docs/reference/configuration/sinks/clickhouse/
- rsyslog omhttp module documentation: https://www.rsyslog.com/doc/configuration/modules/omhttp.html
- ClickHouse MergeTree engine docs: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse HTTP interface docs: https://clickhouse.com/docs/en/interfaces/http

## Issues Found
No technical issues found.

- Vector syslog source: `type`, `mode: tcp`, and `address` are all valid fields per official docs.
- Vector ClickHouse sink: `endpoint`, `database`, `table`, `auth.strategy: basic`, `batch.max_events`, `batch.timeout_secs`, and `encoding.timestamp_format: unix` are all valid configuration keys.
- rsyslog `omhttp` module exists; `server`, `serverport`, `restpath`, `template`, and `batch.maxsize` are valid action parameters.
- ClickHouse SQL: `MergeTree`, `LowCardinality(String)`, `PARTITION BY`, `ORDER BY`, and table-level `TTL` are all correct syntax.

## Review Notes
- The rsyslog `restpath` parameter accepts the embedded `?query=INSERT...` query string, which works in practice with ClickHouse's HTTP interface but is not explicitly documented in rsyslog's omhttp page. This is widely used in the community and functions correctly.
- Listening on port 514 typically requires elevated privileges (root or `CAP_NET_BIND_SERVICE`); not noted in the post but may be worth mentioning to readers in a future revision.
- The `app_name`, `proc_id`, and `msg_id` columns in the target table assume RFC 5424 syslog parsing; Vector's syslog source supports both RFC 3164 and RFC 5424 and will populate these where available.
