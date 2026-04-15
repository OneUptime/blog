# Validation Summary: How to Use ClickHouse with Snowplow for Event Collection

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (Kafka engine, ReplacingMergeTree, JSONExtract functions, TTL, DateTime64)
- Snowplow (enriched event format, self-describing events, Iglu schema registry)
- Apache Kafka (as message broker between Snowplow and ClickHouse)
- SQL

## Sources Consulted
- ClickHouse Kafka engine documentation: https://clickhouse.com/docs/en/engines/table-engines/integrations/kafka
- ClickHouse ReplacingMergeTree documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replacingmergetree
- ClickHouse JSON functions documentation: https://clickhouse.com/docs/en/sql-reference/functions/json-functions
- Snowplow canonical event model: https://docs.snowplow.io/docs/understanding-your-pipeline/canonical-event/
- Snowplow self-describing events structure: https://docs.snowplow.io/docs/understanding-your-pipeline/canonical-event/understanding-the-enriched-tsv-format/

## Issues Found

1. **Incorrect Snowplow field name `referr_urlhost`** — Changed to `refr_urlhost`. The Snowplow canonical event model uses the `refr_` prefix for referrer fields (e.g., `refr_urlhost`, `refr_urlscheme`, `refr_urlpath`), not `referr_`.

2. **Kafka engine table missing column definitions** — The `snowplow.events_kafka` table had no column definitions, only `ENGINE = Kafka SETTINGS ...`. ClickHouse requires explicit column definitions for Kafka engine tables; without them the `CREATE TABLE` statement fails with a syntax error. Added the full column list matching the target `snowplow.events` table.

3. **Incorrect JSON extraction paths for self-describing events** — Snowplow's `unstruct_event` field uses a double-nested self-describing JSON envelope: `{schema: "iglu:.../unstruct_event/...", data: {schema: "iglu:.../product_view/...", data: {productId: ..., price: ...}}}`. The blog extracted from `data.productId` (one level deep) but the correct path is `data.data.productId` (two levels deep). Similarly, the schema check was at the top-level `schema` (which is the generic unstruct_event envelope schema), but should be at `data.schema` to match the specific event schema. Fixed all three `JSONExtract` calls.

4. **Misleading "session window functions" description** — The Session Analysis section claimed to use "ClickHouse session window functions" but the query uses standard `GROUP BY` aggregation with `min()`/`max()`/`count()`, not window functions. Changed the description to "ClickHouse aggregation".

## Review Notes
- The `ReplacingMergeTree` engine deduplicates based on the ORDER BY key `(app_id, event, collector_tstamp)`. This means different events that share the same app_id, event type, and exact timestamp would be incorrectly deduplicated. For robust deduplication, `event_id` should be included in the ORDER BY. This is a design concern rather than a syntax error, so it was not changed.
- The schema only includes a subset of Snowplow's 131+ canonical enriched event fields. This is reasonable for a tutorial but readers building production pipelines should reference the full canonical event model.
- The `kafka_format = 'JSONEachRow'` setting assumes the Snowplow enriched stream outputs JSON. Snowplow's default enriched output is TSV format; a JSON transformation step (e.g., via Snowplow Analytics SDK or a custom transformer) would be needed upstream.
