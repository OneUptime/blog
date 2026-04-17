# Validation Summary: Why You Should Avoid Small Inserts in ClickHouse

## Status
validated

## Post Type
Guide / Best Practices

## Technologies Covered
- ClickHouse
- MergeTree table engine
- Buffer table engine
- Kafka table engine
- `system.parts` system table
- `clickhouse-client` CLI

## Sources Consulted
- ClickHouse MergeTree settings documentation: https://clickhouse.com/docs/en/operations/settings/merge-tree-settings (sections `#parts_to_throw_insert`, `#parts_to_delay_insert`)
- ClickHouse source for defaults: https://github.com/ClickHouse/ClickHouse/blob/master/src/Storages/MergeTree/MergeTreeSettings.cpp
- ClickHouse Buffer engine docs: https://clickhouse.com/docs/en/engines/table-engines/special/buffer
- ClickHouse Kafka engine docs: https://clickhouse.com/docs/en/engines/table-engines/integrations/kafka
- ClickHouse `system.parts` docs: https://clickhouse.com/docs/en/operations/system-tables/parts

## Issues Found
- **Outdated `parts_to_throw_insert` default value.** The post stated "The background merger limit default is 300 active parts per partition." The 300 value was the pre-ClickHouse 23.6 default. Since 23.6 (June 2023), the default is 3,000. Updated the sentence to cite the current `parts_to_throw_insert` default (3,000), mention the pre-23.6 value (300), and also reference `parts_to_delay_insert` (default 1,000) which is the threshold at which inserts start being throttled/delayed — which is what the original sentence was describing.

## Review Notes
- The Buffer engine syntax and the 9-parameter signature `Buffer(database, table, num_layers, min_time, max_time, min_rows, max_rows, min_bytes, max_bytes)` are correct. Note that ClickHouse now treats `num_layers` as effectively deprecated (most deployments are fine with 1 layer), but the value of 16 still works and is not incorrect.
- The Kafka engine settings (`kafka_broker_list`, `kafka_topic_list`, `kafka_group_name`, `kafka_format`) are current and correct.
- The `system.parts` query is syntactically correct and uses valid column names (`table`, `partition`, `active`, `rows`, `database`).
- The post does not mention the modern `async_insert` feature (available since ClickHouse 21.11, significantly improved in recent versions), which is now often the recommended way to handle high-frequency small inserts without an external buffer or Kafka. This is not a technical error, but a future revision could mention it as an additional option alongside Buffer tables and Kafka.
- The illustrative `INSERT INTO events VALUES ($i, 'click', now())` in the bash loop uses a 3-value tuple while the later schema example has 4 columns. The two snippets are describing illustrative/abstract `events` tables rather than the same schema, so this is acceptable as illustration.
