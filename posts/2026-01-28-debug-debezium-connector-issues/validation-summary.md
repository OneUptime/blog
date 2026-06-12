# Validation Summary: How to Debug Debezium Connector Issues

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Debezium (Change Data Capture)
- Kafka Connect (REST API, Connectors)
- Apache Kafka (topics, consumer groups, console producer/consumer)
- PostgreSQL (logical replication, WAL, replication slots, publications, pgoutput)
- MySQL (binary log, GTID, server-id, replication grants)
- Log4j (Kafka Connect logging)
- Docker / docker-compose
- JVM (G1GC, heap tuning, jcmd)
- Python (psycopg2 for connectivity testing)
- Bash scripting

## Sources Consulted
- Debezium PostgreSQL connector documentation: https://debezium.io/documentation/reference/stable/connectors/postgresql.html
- Debezium MySQL connector documentation: https://debezium.io/documentation/reference/stable/connectors/mysql.html
- Kafka Connect REST API reference: https://kafka.apache.org/documentation/#connect_rest
- Kafka Connect dynamic logging admin endpoint (KIP-495): `/admin/loggers/{logger}`
- PostgreSQL documentation on `pg_replication_slots`, `pg_publication`, logical decoding (pgoutput): https://www.postgresql.org/docs/current/logicaldecoding.html
- PostgreSQL `wal_level`, `ALTER SYSTEM`, `pg_create_logical_replication_slot` docs
- MySQL Replication & binary log configuration documentation
- psycopg2 documentation: https://www.psycopg.org/docs/

## Issues Found

1. **Misleading `tasks.max=4` recommendation under "High Replication Lag"** — The post recommended `tasks.max=4` to "increase parallelism". This is incorrect for Debezium source connectors: the PostgreSQL, MySQL, and MongoDB connectors are designed to run as a single task regardless of `tasks.max`. The Debezium PostgreSQL connector docs explicitly state the connector "only ever uses a single task". I replaced the misleading parallelism line with a clarifying comment noting that `tasks.max` does not increase parallelism for these connectors, and that the throughput settings (`max.batch.size`, `max.queue.size`, `poll.interval.ms`) should be tuned instead. The remaining recommendations are accurate.

## Review Notes

- **MySQL `expire_logs_days=3`**: Still works but was deprecated in MySQL 8.0 in favor of `binlog_expire_logs_seconds`. Left as-is because the older option still functions on MySQL 5.7 and 8.x — it is a documented Debezium prerequisite in many tutorials.
- **MySQL `SHOW MASTER STATUS`**: Deprecated in MySQL 8.0.22 and removed in MySQL 8.4 in favor of `SHOW BINARY LOG STATUS`. Still functional on widely-deployed MySQL versions (5.7 and 8.0.x), so left as-is. Readers on MySQL 8.4+ will need the newer command.
- **Kafka Connect `log4j.properties` format**: The shown properties use Log4j 1.x style. Kafka Connect has migrated to Log4j 2 / Reload4j in newer versions; the property syntax differs slightly. The shown style works for many existing distributions but readers on newer Kafka versions may need Log4j 2 syntax.
- **`snapshot.lock.timeout.ms` under PostgreSQL "Snapshot Never Completes"**: This property is MySQL/SQL Server specific (PostgreSQL does not take table locks during snapshots), but the surrounding context references both databases generically, so it is not strictly incorrect. Worth noting for readers focusing exclusively on PostgreSQL.
- **`signal.data.collection=inventory.debezium_signal`**: Format is `database.table` for MySQL or `schema.table` for PostgreSQL — the example fits MySQL or could be interpreted either way; acceptable as a generic example.
- **`kafka-consumer-groups --group connect-inventory-connector`**: This convention applies more naturally to sink connectors; Debezium source connectors don't register a consumer group by that name unless schema-history consumption is being measured. For source connector lag the canonical signal is the `MilliSecondsBehindSource` JMX metric. The example is not strictly wrong (it surfaces the schema-history consumer for some connector types) but the canonical lag signal is JMX.
- **Manual offset reset via `kafka-console-producer` tombstone**: Still works, but Kafka Connect 3.6+ provides a dedicated `/connectors/{name}/offsets` REST endpoint (KIP-875) which is preferred when available. Both approaches are valid.
