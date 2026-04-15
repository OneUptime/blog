# Validation Summary: How to Stream Data from Google Pub/Sub to ClickHouse

## Status
validated

## Post Type
Tutorial / Integration Guide

## Technologies Covered
- ClickHouse (MergeTree engine, Kafka engine, system.query_log)
- Google Cloud Pub/Sub (google-cloud-pubsub Python SDK)
- Python (clickhouse-driver, google-cloud-pubsub, apache-beam, requests)
- Apache Kafka (ClickHouse Kafka engine)
- Apache Beam / Google Cloud Dataflow
- gcloud CLI

## Sources Consulted
- ClickHouse Kafka engine documentation: https://clickhouse.com/docs/en/engines/table-engines/integrations/kafka
- ClickHouse MergeTree documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse system.query_log documentation: https://clickhouse.com/docs/en/operations/system-tables/query_log
- Google Cloud Pub/Sub Python client library: https://cloud.google.com/pubsub/docs/reference/libraries
- Apache Beam Python SDK ReadFromPubSub: https://beam.apache.org/releases/pydoc/current/apache_beam.io.gcp.pubsub.html
- Apache Beam Python SDK WriteToText: https://beam.apache.org/releases/pydoc/current/apache_beam.io.textio.html
- gcloud pubsub CLI reference: https://cloud.google.com/sdk/gcloud/reference/pubsub
- clickhouse-driver Python package: https://clickhouse-driver.readthedocs.io/

## Issues Found

1. **Intro text said "two practical approaches" but post covers three options.**
   - Changed "two" to "three" to match the actual content (Option 1: Python Subscriber, Option 2: Kafka Bridge, Option 3: Dataflow Pipeline).

2. **Dataflow Pipeline example used `beam.io.WriteToText` to write to ClickHouse.**
   - `beam.io.WriteToText` writes to text files on a filesystem (local or GCS), not to HTTP endpoints. It cannot be used to insert data into ClickHouse.
   - Replaced with a custom `beam.DoFn` (`WriteToClickHouse`) that POSTs data to the ClickHouse HTTP interface, which is the correct approach since there is no built-in Apache Beam IO connector for ClickHouse.
   - Also added the missing `import json` statement that was used by `beam.Map(json.loads)` but never imported.

## Review Notes
- **Thread safety in Option 1**: The Python subscriber callback accesses a shared `buffer` list, but `google-cloud-pubsub`'s `subscribe()` dispatches callbacks on a thread pool. In production, this would need a threading lock around buffer access to prevent race conditions. Acceptable as a simplified example but worth noting.
- **Dead Letter Queue section**: The section title promises "Dead Letter Queue Handling" but only shows a `system.query_log` query to check for errors. It does not demonstrate actual DLQ implementation (e.g., publishing failed messages to a dead letter topic). The SQL itself is correct.
- **Monitor Pub/Sub Lag section**: The `gcloud pubsub subscriptions describe` command shows subscription config, not actual message backlog/lag metrics. Monitoring actual lag would use Stackdriver/Cloud Monitoring metrics like `pubsub.googleapis.com/subscription/num_undelivered_messages`.
- **Option 2 Kafka Bridge**: The approach of using a push subscription to forward messages to a Kafka bridge HTTP endpoint is conceptually valid, but in practice most teams would use the official Kafka Connect Pub/Sub Source Connector rather than a push subscription to a custom bridge service.
- **Dataflow custom DoFn**: The replacement code sends one HTTP request per element for simplicity. In production, batching rows before sending to ClickHouse would be more efficient. This is a reasonable simplification for a tutorial.
