# Validation Summary: How to Use Change Data Capture with CockroachDB

## Status
validated

## Post Type
Tutorial / Technical guide

## Technologies Covered
- CockroachDB changefeeds (core/sinkless and enterprise)
- Apache Kafka (kafkajs Node.js client, confluent-kafka Python client)
- Google Cloud Storage (gs://) and AWS S3 changefeed sinks
- Webhook sinks (Express.js consumer)
- Confluent Schema Registry / Avro format
- Prometheus client (Python) for metrics
- psycopg2 for CockroachDB monitoring
- Node.js `pg` driver streaming

## Sources Consulted
- CockroachDB CREATE CHANGEFEED reference: https://www.cockroachlabs.com/docs/stable/create-changefeed
- CockroachDB Changefeed Sinks: https://www.cockroachlabs.com/docs/stable/changefeed-sinks
- CockroachDB Changefeed Messages (delivery guarantees): https://www.cockroachlabs.com/docs/stable/changefeed-messages
- CockroachDB CHANGEFEED FOR (core / sinkless): https://www.cockroachlabs.com/docs/stable/changefeed-for
- CockroachDB SHOW JOBS / SHOW CHANGEFEED JOBS: https://www.cockroachlabs.com/docs/stable/show-jobs
- node-postgres (`pg`) Query streaming API: https://node-postgres.com/apis/client

## Issues Found

1. **Incorrect delivery guarantee claim ("exactly-once")** — The post stated that enterprise changefeeds provide "Exactly-once delivery semantics" both in the key-benefits bullet list and in the Core vs. Enterprise comparison table. Official CockroachDB documentation is explicit that all changefeeds (core and enterprise) provide **at-least-once** delivery with resolved-timestamp checkpoints; duplicates are possible across retries and restarts. Updated both occurrences to accurately state at-least-once.

2. **Missing `Query` import in Node.js core-changefeed consumer** — The example used `new Query(query)` but only imported `Client` from `pg`, so the code would throw `ReferenceError: Query is not defined`. Updated the require line to `const { Client, Query } = require('pg');`.

3. **Kafka SASL options placed in WITH clause** — `sasl_enabled`, `sasl_mechanism`, `sasl_user`, `sasl_password` are URI query parameters on the `kafka://` scheme, not WITH options. Moved them into the URI (and added `tls_enabled=true`, which is required for SASL/PLAIN over an untrusted network).

4. **GCS `AUTH` and `CREDENTIALS` placed in WITH clause** — These are URI query parameters on the `gs://` scheme. Moved them into the URI.

5. **Invalid `schema_prefix` option** — `schema_prefix` is not a real WITH option. (The closest valid option is `avro_schema_prefix`, which only applies to Avro and was not relevant here since the example uses JSON.) Removed the line.

6. **Deprecated `EXPERIMENTAL CHANGEFEED FOR` syntax** — Deprecated as of v25.2 and slated for removal. Replaced with the modern equivalent `CREATE CHANGEFEED FOR TABLE ...` without an `INTO` clause (a sinkless changefeed) in the SQL example, the Node.js consumer query string, and the mermaid diagram. Added a note explaining the deprecation.

7. **Deprecated `protect_data_from_gc_on_pause` option** — Deprecated since v23.2; paused changefeeds now protect data via protected timestamps automatically. Removed from both the multi-table production example and the best-practices example, and updated the troubleshooting table accordingly.

## Review Notes

- The webhook URI scheme `webhook-https://` is correct per CockroachDB docs.
- `SHOW CHANGEFEED JOB <id>` / `SHOW CHANGEFEED JOBS` syntax is correct.
- `schema_change_policy` values (`backfill`, `nobackfill`, `stop`) and `schema_change_events = 'column_changes'` are valid.
- `envelope = 'wrapped'`, `full_table_name`, `on_error = 'pause'`, `min_checkpoint_frequency`, `topic_prefix`, `compression = 'gzip'`, `partition_format` (`daily`/`hourly`/`flat`), `file_size`, and `kafka_sink_config` are all valid options.
- The `confluent_kafka.avro.AvroConsumer` API used in the Python schema-evolution example is from the older confluent-kafka-python API surface. It still works but newer code typically prefers `DeserializingConsumer` + `AvroDeserializer`. This is a stylistic/future-deprecation concern rather than a current correctness issue, so it was left as-is.
- `datetime.utcnow()` in the Python monitoring script is deprecated as of Python 3.12 (replaced by `datetime.now(timezone.utc)`), but still functions. Left unchanged to avoid scope creep — the surrounding monitoring code is illustrative.
- The wrapped envelope JSON example showing `"before"`, `"after"`, and `"updated"` keys is consistent with CockroachDB's documented JSON message format.
- The note "Joins are not supported" inside the CDC queries SQL example is accurate for current CDC query restrictions.
