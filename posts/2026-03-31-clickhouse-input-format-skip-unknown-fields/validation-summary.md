# Validation Summary: How to Use input_format_skip_unknown_fields in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- ClickHouse format settings (input_format_skip_unknown_fields)
- JSONEachRow / CSVWithNames input formats
- ClickHouse table functions (file, url)
- ClickHouse Kafka table engine

## Sources Consulted
- [ClickHouse Format Settings docs](https://clickhouse.com/docs/operations/settings/formats) — confirms setting name, Bool type, default 0, supported formats list
- [ClickHouse CSVWithNamesAndTypes docs](https://clickhouse.com/docs/interfaces/formats/CSVWithNamesAndTypes)
- [GitHub Issue #16064 — Kafka engine + skip_unknown_fields](https://github.com/ClickHouse/ClickHouse/issues/16064)
- [GitHub Issue #12078 — CSVWithNames behavior](https://github.com/ClickHouse/ClickHouse/issues/12078)
- [Altinity KB — Kafka error handling](https://kb.altinity.com/altinity-kb-integrations/altinity-kb-kafka/error-handling/)

## Issues Found
1. **Incorrect supported-formats list.** The post originally claimed the setting works with "JSON, JSONEachRow, CSV with headers, and Parquet." Per ClickHouse docs, plain `JSON`, plain `CSV`, and `Parquet` are not in the supported set — only the JSON-row formats (JSONEachRow, BSONEachRow), TSKV, MySQLDump, Native, and the `WithNames`/`WithNamesAndTypes` variants honor this setting. Schema-driven formats (Parquet/Avro/Protobuf) use their own dedicated skip settings. Updated the sentence to reflect the actually supported formats and added a parenthetical pointing readers to the schema-driven format settings.
2. **Misleading Kafka example.** The post showed `INSERT INTO ... SELECT FROM kafka_table SETTINGS input_format_skip_unknown_fields = 1`. Parsing happens inside the Kafka consumer before the downstream INSERT runs, so a query-level SETTINGS clause does not propagate (see ClickHouse Issue #16064). Replaced the Kafka example with a `file()`-based example that demonstrates the same point, and added a clarifying note that for Kafka tables the setting must be configured at the user-profile or Kafka-engine level.

## Review Notes
- The example error message (`Unknown field found while parsing JSONEachRow format: extra_field`) matches ClickHouse's actual exception (Code 117, `INCORRECT_DATA`).
- For CSVWithNames in particular, `input_format_with_names_use_header` (default 1) must remain enabled for skip-by-header-name to work; the post does not need to call this out since the default is correct.
- Historically there have been edge-case bugs with CSVWithNames where extra trailing columns still raise `Expected end of line` errors (Issues #12078, #38543). Not blocking — readers using current ClickHouse versions should be unaffected for the typical case.
- The first SQL example includes `metadata String` in the parser's structure, then uses `SELECT *`. If the target `events` table has no `metadata` column the INSERT side would fail — but that's an INSERT/column-mismatch issue, not a parsing issue, and is consistent with the post's own caveat that the setting "only affects the parsing stage." Left as-is.
