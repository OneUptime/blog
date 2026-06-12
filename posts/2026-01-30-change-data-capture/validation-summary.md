# Validation Summary: How to Build Change Data Capture

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Change Data Capture (CDC)
- PostgreSQL logical replication, logical decoding, triggers, and WAL
- MySQL binary logs with python-mysql-replication
- Debezium PostgreSQL connector
- Kafka and Kafka Connect
- Docker Compose
- Python, psycopg2, kafka-python, and Redis

## Sources Consulted
- PostgreSQL logical decoding examples: https://www.postgresql.org/docs/current/logicaldecoding-example.html
- PostgreSQL logical decoding concepts: https://www.postgresql.org/docs/current/logicaldecoding-explanation.html
- PostgreSQL logical decoding output plugins: https://www.postgresql.org/docs/current/logicaldecoding-output-plugin.html
- PostgreSQL test_decoding output plugin: https://www.postgresql.org/docs/current/test-decoding.html
- Debezium PostgreSQL connector documentation: https://debezium.io/documentation/reference/stable/connectors/postgresql.html
- Debezium event flattening SMT documentation: https://debezium.io/documentation/reference/stable/transformations/event-flattening.html
- python-mysql-replication BinLogStreamReader documentation: https://python-mysql-replication.readthedocs.io/en/latest/binlogstream.html
- kafka-python KafkaProducer documentation: https://kafka-python.readthedocs.io/en/master/apidoc/KafkaProducer.html
- Apache Kafka Connect user guide: https://kafka.apache.org/40/kafka-connect/user-guide/
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/

## Issues Found
- The log-based CDC advantages claimed "Zero impact on source database." Changed this to "Minimal impact" because log readers still consume database resources and can affect WAL retention.
- The PostgreSQL logical decoding example created a `pgoutput` slot and then queried it with `pg_logical_slot_get_changes()`. `pgoutput` is intended for the logical replication protocol, while the SQL logical decoding example should use a textual plugin such as `test_decoding`. Updated the slot and query example accordingly, while keeping the publication for pgoutput-based streaming clients such as Debezium.
- The timestamp-based CDC processor said it added a precision buffer but stored the exact latest `updated_at` value. Updated it to store a one-microsecond overlap to reduce the risk of missing rows that share a timestamp at a batch boundary.
- The Debezium connector configuration used the event-flattening SMT, but the consumer example parsed the unflattened Debezium envelope with `before`, `after`, `source`, and `op`. Removed the SMT configuration so the connector emits the event shape consumed by the Python example.
- The Python decorator registration methods (`on_create`, `on_update`, and `on_delete`) did not return the handler function. Added returns so they behave correctly as decorators.
- The Docker Compose example used the obsolete top-level `version` field. Removed it to match the current Compose Specification.

## Review Notes
- The Python code blocks and JSON snippets were syntax-checked after editing.
- The examples are educational and omit some production hardening, such as table-name allow-listing for dynamic SQL, multi-worker locking for trigger-table polling, and stronger idempotency keys for operations that can share an LSN.
