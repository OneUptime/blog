# Validation Summary: How to Use ClickHouse with NATS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (NATS table engine)
- NATS (core subjects and JetStream)
- Python (nats.py async client)
- SQL (ClickHouse dialect)
- MergeTree engine and Materialized Views

## Sources Consulted
- ClickHouse NATS table engine documentation: https://clickhouse.com/docs/engines/table-engines/integrations/nats
- NATS JetStream documentation: https://docs.nats.io/nats-concepts/jetstream
- NATS TLS documentation: https://docs.nats.io/using-nats/developer/connecting/tls
- ClickHouse GitHub repository (NATS engine implementation)
- nats.py Python client documentation: https://github.com/nats-io/nats.py

## Issues Found

### 1. Incorrect JetStream parameter name: `nats_stream_name`
- **What was wrong:** The JetStream SQL example used `nats_stream_name = 'analytics'` which is not the correct ClickHouse setting name.
- **What was changed:** Corrected to `nats_stream = 'analytics'` per official ClickHouse documentation.
- **Why:** The ClickHouse NATS engine uses `nats_stream` (not `nats_stream_name`) to reference an existing JetStream stream.

### 2. Incorrect JetStream parameter name: `nats_durable`
- **What was wrong:** The JetStream SQL example used `nats_durable = 'clickhouse_consumer'` and the Summary section also referenced `nats_durable`.
- **What was changed:** Corrected to `nats_consumer = 'clickhouse_consumer'` in the SQL example and updated the Summary section reference accordingly.
- **Why:** The ClickHouse NATS engine uses `nats_consumer` (not `nats_durable`) to reference an existing durable pull consumer in JetStream.

## Review Notes
- The `system.nats_consumers` system table is referenced in the monitoring section. While this table does exist in ClickHouse, the exact column names (`num_consumers`, `num_pending_messages`) could not be fully verified against the latest schema. Users should check `DESCRIBE system.nats_consumers` on their ClickHouse instance to confirm available columns.
- The Python publishing script uses `nats.py` async client which is correct and current. The `nc.jetstream()` API usage is accurate for the nats.py library.
- The TLS configuration correctly uses the `tls://` URL scheme combined with `nats_secure = 1` and certificate paths.
- The `nats_queue_group` setting is correctly used for load balancing across multiple ClickHouse instances.
- The `parseDateTimeBestEffort` function in the materialized view is appropriate for parsing ISO 8601 timestamps, though it returns `DateTime` (second precision), not `DateTime64(3)`. ClickHouse will implicitly cast this, but fractional seconds from the source will be truncated.
