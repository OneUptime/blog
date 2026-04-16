# Validation Summary: How to Use ClickHouse with Benthos

## Status
validated

## Post Type
Tutorial / How-To Guide

## Technologies Covered
- Benthos / Redpanda Connect
- ClickHouse
- Bloblang (Benthos transformation language)
- Kafka (input source)
- Docker

## Sources Consulted
- Redpanda Connect outputs overview: https://docs.redpanda.com/redpanda-connect/components/outputs/about/
- `sql_insert` output reference: https://docs.redpanda.com/redpanda-connect/components/outputs/sql_insert/
- `http_server` input reference: https://docs.redpanda.com/redpanda-connect/components/inputs/http_server/
- `kafka` input reference: https://docs.redpanda.com/redpanda-connect/components/inputs/kafka/
- `broker` output reference: https://docs.redpanda.com/redpanda-connect/components/outputs/broker/
- Bloblang methods reference: https://docs.redpanda.com/redpanda-connect/guides/bloblang/methods/
- Redpanda Connect Docker image: https://hub.docker.com/r/redpandadata/connect
- Benthos legacy installer script (https://sh.benthos.dev — now under `/deprecated/`)

## Issues Found

1. **Non-existent `clickhouse` output component (major).** The post described `output: clickhouse:` as a built-in plugin. Benthos / Redpanda Connect does NOT expose a dedicated ClickHouse output. ClickHouse is supported through the generic `sql_insert` (or `sql_raw`) output with `driver: clickhouse`. Fix: changed every `output: clickhouse:` block to `output: sql_insert:` with `driver: clickhouse`. Introductory and summary sentences were also updated to reflect this.

2. **Missing required `args_mapping` field.** The `sql_insert` output requires `args_mapping` (a Bloblang expression producing an array of column values) in addition to `columns`. The original examples had only `columns`, which would fail validation. Fix: added `args_mapping` mapping the incoming message fields to each column for all three output examples (basic HTTP pipeline, Kafka pipeline, and fan-out broker).

3. **Outdated Docker image.** The post referenced `jeffail/benthos`, which is legacy / unmaintained. The current official image is `docker.redpanda.com/redpandadata/connect`. Fix: updated the `docker pull` command accordingly.

4. **Kafka input example extended.** The second pipeline previously had no `columns`/`args_mapping` on the output — because the output type was wrong. As part of fix #1/#2, explicit columns (`event_id`, `user_id`, `event_type`, `ingested_at`) and matching `args_mapping` were added so the example is self-consistent with the Bloblang processor above it.

## Review Notes

- The legacy `benthos` CLI (`benthos -c pipeline.yaml`) and the `https://sh.benthos.dev` installer still function, but both are officially deprecated. The current path is `rpk connect run config.yaml` via Redpanda's `rpk` CLI. Kept as-is because the legacy tooling still works and a wholesale CLI rewrite is outside the scope of a technical-correctness fix.
- The `kafka` input (`addresses`, `topics`, `consumer_group`) is still valid but marked deprecated since Redpanda Connect 4.68.0 in favor of the unified `redpanda` input or `kafka_franz`. Left unchanged because the existing fields remain functional.
- `http_server` input fields (`address`, `path`, `allowed_verbs`) verified correct. `allowed_verbs` default is `["POST"]`.
- `broker` output with `pattern: fan_out` verified correct; `fan_out` is the default pattern.
- All Bloblang methods used (`.string()`, `.lowercase()`, `.number()`, `.ts_parse()`, `.ts_format()`, `parse_json()`, `now()`) verified present in the official Bloblang methods reference.
- Consider noting in a future revision that when inserting `DateTime` values through the ClickHouse driver, values should be passed as Go `time.Time` or in a driver-acceptable format — Bloblang's `now()` returns an RFC3339 string by default, which the ClickHouse driver accepts but readers may want to be explicit about via `ts_parse` / `ts_format`.
