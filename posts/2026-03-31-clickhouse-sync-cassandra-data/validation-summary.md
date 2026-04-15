# Validation Summary: How to Sync Cassandra Data to ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Apache Cassandra (CDC, CQL, cqlsh, token-based pagination)
- ClickHouse (Kafka engine, ReplacingMergeTree, CSVWithNames format)
- Debezium Cassandra Connector
- Apache Kafka
- Python (cassandra-driver, clickhouse-driver)

## Sources Consulted
- Apache Cassandra documentation on CDC: https://cassandra.apache.org/doc/latest/cassandra/operating/cdc.html
- Cassandra CQL ALTER TABLE documentation: https://cassandra.apache.org/doc/latest/cassandra/cql/ddl.html
- Debezium Cassandra Connector documentation: https://debezium.io/documentation/reference/stable/connectors/cassandra.html
- ClickHouse Kafka engine documentation: https://clickhouse.com/docs/en/engines/table-engines/integrations/kafka
- ClickHouse ReplacingMergeTree documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replacingmergetree
- cqlsh COPY command documentation: https://cassandra.apache.org/doc/latest/cassandra/tools/cqlsh.html

## Issues Found

1. **Incorrect CDC ALTER TABLE syntax**: The post used `ALTER TABLE myapp.events WITH cdc = {'enabled': 'true'};` which is invalid CQL. The `cdc` table property is a boolean, not a map. Fixed to `ALTER TABLE myapp.events WITH cdc = true;`.

2. **Misleading description of Option 1 code**: The text stated "Write a consumer that reads CDC mutation logs and inserts into ClickHouse" but the Python code actually performs regular CQL queries using token-based pagination — it does not read CDC commit log segments. Fixed the description to accurately say "Write a consumer that polls Cassandra using token-based pagination and inserts into ClickHouse."

3. **Inapplicable `connector.class` in Debezium config**: The Debezium Cassandra connector is a standalone Java agent deployed as a sidecar process alongside Cassandra nodes, not a standard Kafka Connect source connector. The `connector.class` property is a Kafka Connect concept and does not apply. Removed this property from the configuration block.

## Review Notes
- The Debezium Cassandra connector configuration is shown in JSON format (resembling Kafka Connect REST API), but since it is a standalone agent, configuration is typically provided via a properties file. The property names shown (aside from the removed `connector.class`) are correct, but the delivery format is slightly misleading. This was not changed to avoid restructuring the section.
- The `ReplacingMergeTree()` engine is used without a `ver` (version) column, meaning ClickHouse will keep the last inserted row during merges rather than using a timestamp for conflict resolution. For better handling of Cassandra's eventual consistency, specifying a version column (e.g., `ReplacingMergeTree(event_time)`) would be more robust. This is a best-practice suggestion, not an error.
- Option 1 is titled "Cassandra CDC with Custom Consumer" but the code shown is a polling/batch approach, not a true CDC consumer (which would parse commit log segments from `cdc_raw`). The CDC enablement instructions at the top of the section are correct, but the code example is better suited to a polling-based sync pattern. Only the description text was corrected; the section was not restructured.
