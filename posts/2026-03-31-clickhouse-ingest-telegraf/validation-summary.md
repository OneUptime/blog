# Validation Summary: How to Ingest Data from Telegraf into ClickHouse

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- ClickHouse (MergeTree engine, JSONEachRow format, JSON functions, async_insert)
- Telegraf (inputs.cpu, inputs.mem, inputs.disk, outputs.http plugin)
- TOML configuration syntax
- SQL DDL (CREATE TABLE, TTL, partitioning)

## Sources Consulted
- Telegraf HTTP output plugin README: https://github.com/influxdata/telegraf/blob/master/plugins/outputs/http/README.md
- Telegraf JSON output serializer README: https://github.com/influxdata/telegraf/blob/master/plugins/serializers/json/README.md
- Telegraf JSON output data format docs: https://docs.influxdata.com/telegraf/v1/data_formats/output/json/
- ClickHouse JSONEachRow format documentation: https://clickhouse.com/docs/en/interfaces/formats#jsoneachrow
- ClickHouse JSONLines format documentation: https://clickhouse.com/docs/interfaces/formats/JSONLines
- Telegraf PR #16005 (json array output option): https://github.com/influxdata/telegraf/pull/16005

## Issues Found

1. **Invalid TOML in `[[outputs.http]]` headers definition**: The original config defined `headers` twice — once as an inline table (`headers = {...}`) and again as a nested table (`[outputs.http.headers]`). TOML does not allow a key to be defined as both an inline table and a sub-table; this would fail to parse. Fixed by consolidating all three headers (`Content-Type`, `X-ClickHouse-User`, `X-ClickHouse-Key`) into the single `[outputs.http.headers]` sub-table at the end of the plugin definition (per Telegraf docs, sub-tables must come last in a plugin block).

2. **Non-existent `json_timestamp_key` option**: The original config set `json_timestamp_key = "ts"`. The Telegraf JSON serializer does not have such an option — its only timestamp-related options are `json_timestamp_units` and `json_timestamp_format`. The serializer always emits the timestamp under the key `timestamp`. Removed the invalid line.

3. **Schema/serializer field-name mismatch**: Because Telegraf emits the timestamp as `timestamp` (not configurable), the ClickHouse table column needed to match. Renamed the column `ts` to `timestamp` in both target tables (`telegraf_metrics` and `metrics_flat`) and in the `PARTITION BY`, `ORDER BY`, `TTL`, and downstream `SELECT` queries that referenced it.

4. **Misleading `Content-Type: application/x-ndjson`**: The Telegraf JSON serializer emits a JSON object (single-metric mode) or `{"metrics":[...]}` (batch mode) — never NDJSON. Changed the Content-Type to `application/json`. (Note: ClickHouse ignores Content-Type when the output format is supplied via the URL `FORMAT` clause, so this is cosmetic but more accurate.)

## Review Notes

- **Important caveat regarding the JSON-serializer / JSONEachRow pipeline**: Even after the fixes above, the configuration in this post will not produce records that ClickHouse's `JSONEachRow` parser can consume in batch mode. Telegraf's batch JSON output is shaped as `{"metrics":[{...},{...}]}`, while `JSONEachRow` expects newline-delimited top-level JSON objects. To make this pipeline work in practice, readers will likely need one of:
  - Set `metric_batch_size = 1` (extremely inefficient), or
  - Use the `json_transformation` (JSONata) option to flatten the batch, or
  - Use a different serializer (e.g., `data_format = "influx"` plus the InputFormat `LineAsString`/`Regexp`, or wait for the upcoming `output_json_array` option from Telegraf PR #16005 paired with `input_format_json_read_objects_as_strings`).
  This is a structural issue with the post's chosen approach that cannot be fixed without restructuring the post; flagged here so a future revision can address it.

- The `tags` and `fields` columns are typed `String` in the schema but Telegraf will emit them as JSON objects, not strings. ClickHouse's JSONEachRow parser will reject objects in `String` columns unless `input_format_json_read_objects_as_strings = 1` is enabled (either as a server setting or appended to the URL query). Worth noting in a future revision.

- All ClickHouse SQL is syntactically valid: `MergeTree`, `LowCardinality(String)`, `toYYYYMM`, `TTL ... INTERVAL`, `JSONExtractFloat`, and `async_insert` are all current and correct as of ClickHouse 24.x/25.x.

- The Telegraf input plugin options used (`percpu`, `totalcpu`, `ignore_fs`) are accurate and current.

- The `async_insert=1` URL parameter is a valid ClickHouse setting that enables batched server-side inserts — the post's description is correct.
