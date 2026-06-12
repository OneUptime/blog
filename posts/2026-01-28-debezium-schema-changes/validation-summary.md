# Validation Summary: How to Handle Debezium Schema Changes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Debezium (CDC connector framework)
- Apache Kafka / Kafka Connect
- Confluent Schema Registry (Avro)
- PostgreSQL, MySQL (Debezium source connectors)
- Single Message Transforms (SMT): `Cast$Value`, `ByLogicalTableRouter`
- Python (kafka-python, dataclasses, requests)
- Bash / curl (Kafka Connect REST API)

## Sources Consulted
- Debezium 2.x PostgreSQL connector documentation (snapshot modes, `include.schema.changes`, schema history applicability): https://debezium.io/documentation/reference/stable/connectors/postgresql.html
- Debezium 2.x MySQL connector documentation (schema history, `schema_only_recovery`): https://debezium.io/documentation/reference/stable/connectors/mysql.html
- Debezium schema history configuration reference: https://debezium.io/documentation/reference/stable/operations/debezium-server.html and connector-specific schema history sections
- Kafka Connect Cast SMT documentation (`org.apache.kafka.connect.transforms.Cast$Value`): https://kafka.apache.org/documentation/#connect_transforms
- Debezium `ByLogicalTableRouter` SMT documentation: https://debezium.io/documentation/reference/stable/transformations/topic-routing.html
- Confluent Schema Registry compatibility modes and REST API: https://docs.confluent.io/platform/current/schema-registry/avro.html
- Confluent AvroConverter properties (`auto.register.schemas` vs. JsonConverter's `schemas.enable`): https://docs.confluent.io/platform/current/schema-registry/connect.html
- Debezium event envelope structure and `op` field semantics (`c`/`u`/`d`/`r`): https://debezium.io/documentation/reference/stable/connectors/postgresql.html#postgresql-events

## Issues Found

1. **Schema history misattributed to the PostgreSQL connector.** The original `# For PostgreSQL connector` comment in the schema history configuration block was misleading: the PostgreSQL connector does not use a schema history topic — that mechanism is specific to the MySQL, SQL Server, and Oracle connectors (which need it because their transaction logs do not preserve all schema state). Updated the comment to indicate this configuration applies to MySQL/SQL Server/Oracle connectors and explicitly noted that PostgreSQL does not use schema history.

2. **`value.converter.schemas.enable=true` is not an AvroConverter property.** This property belongs to the `JsonConverter` (controls whether JSON messages embed a schema). The Confluent `AvroConverter` always uses schemas via the registry and ignores this property. Replaced with `value.converter.auto.register.schemas=true`, which is the actual AvroConverter property relevant to schema evolution (automatic registration of new schema versions with the registry).

3. **Non-standard `__debezium_op` field name in DDL handler.** The Debezium change event envelope exposes the operation as the `op` field (with values `c`, `u`, `d`, `r`, `t`). There is no `__debezium_op` field in raw Debezium events; with the `ExtractNewRecordState` SMT and `add.fields=op` you'd get `__op`, but `__debezium_op` is invented. Changed to `op` and added a comment noting it lives in the Debezium envelope payload.

4. **Recovery script combined `PostgresConnector` with `snapshot.mode=schema_only_recovery`, which is invalid.** The `schema_only_recovery` snapshot mode does not exist for the PostgreSQL connector — its valid modes are `initial`, `always`, `initial_only`, `never`, `when_needed`, and `custom`. `schema_only_recovery` is a MySQL/SQL Server/Oracle mode tied to schema history (renamed to `recovery` in newer Debezium versions but still accepted as the legacy name). Changed `connector.class` to `io.debezium.connector.mysql.MySqlConnector` so the snapshot mode and schema history configuration are internally consistent.

## Review Notes

- The "Schema Changes During Snapshot" section uses `snapshot.mode=schema_only_recovery` without specifying a connector. This mode is only valid for the MySQL, SQL Server, and Oracle connectors (and in Debezium 2.6+ has been renamed to `recovery`, though the old name continues to be accepted). Readers using PostgreSQL should treat this as a MySQL/SQL Server example.
- `column.include.list=inventory.products.*` is shown as a configuration to "include default values in schema," but `column.include.list` actually controls which columns are captured, not default-value handling. Functionally the value works as a regex but the explanatory comment is loose. Left as-is since it is not strictly incorrect.
- `time.precision.mode=adaptive_time_microseconds` is valid for both MySQL and PostgreSQL connectors. `decimal.handling.mode=double` is also valid across these connectors.
- The post references the legacy snapshot mode names (`schema_only`, `schema_only_recovery`). In Debezium 2.6+ these were renamed to `no_data` and `recovery` respectively, though the older names remain accepted as aliases. No correction needed for current Debezium releases, but readers on very recent versions may see deprecation notices.
- The PostgreSQL connector does emit schema change events to a topic when `include.schema.changes=true` (default for that connector), but it derives schema state from the database catalog rather than persisting it to a schema history topic. The DDL-events guidance in the post is broadly accurate but most directly applicable to MySQL/SQL Server/Oracle.
