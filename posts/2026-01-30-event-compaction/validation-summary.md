# Validation Summary: How to Create Event Compaction

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Apache Kafka log compaction
- Kafka command-line topic configuration
- kafka-python producer API
- Python JSON serialization
- PostgreSQL tables, triggers, JSONB, and upserts
- psycopg2

## Sources Consulted
- Apache Kafka topic configuration reference: https://kafka.apache.org/30/generated/topic_config.html
- Apache Kafka Quickstart: https://kafka.apache.org/quickstart/
- Confluent Kafka log compaction design documentation: https://docs.confluent.io/kafka/design/log_compaction.html
- kafka-python KafkaProducer API documentation: https://kafka-python.readthedocs.io/en/master/apidoc/KafkaProducer.html
- PostgreSQL INSERT / ON CONFLICT documentation: https://www.postgresql.org/docs/current/sql-insert.html
- PostgreSQL CREATE TRIGGER documentation: https://www.postgresql.org/docs/current/sql-createtrigger.html
- PostgreSQL PL/pgSQL trigger function documentation: https://www.postgresql.org/docs/current/plpgsql-trigger.html
- psycopg2 JSON adaptation documentation: https://www.psycopg.org/docs/extras.html

## Issues Found
- The Kafka topic creation command used `--bootstrap-server localhost:9092` with `--replication-factor 3`. That fails on a single local broker, so the example was changed to `--replication-factor 1`.
- The `kafka-python` producer configured `value_serializer=lambda v: json.dumps(v).encode('utf-8')`, which would serialize a tombstone `None` value as JSON `null` bytes instead of producing a Kafka null value. The serializer now returns `None` when the value is `None`.

## Review Notes
The Kafka compaction description is intentionally simplified. Kafka log compaction is asynchronous and guarantees at least the latest value for each key after compaction; older duplicate records can remain until eligible log segments are cleaned. The hybrid example assumes an `event_archive` table exists before calling `store_event_hybrid`.
