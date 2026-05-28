# Validation Summary: How to Use Schema Evolution and Backward Compatibility in GCP Data Pipelines

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Pub/Sub
- Pub/Sub schemas and schema revisions
- Apache Avro schema evolution
- Python Pub/Sub client library
- Apache Beam / Dataflow
- BigQuery table schemas
- gcloud CLI

## Sources Consulted
- Google Cloud Pub/Sub schema overview: https://docs.cloud.google.com/pubsub/docs/schemas
- Google Cloud Pub/Sub associate schema with topic: https://docs.cloud.google.com/pubsub/docs/associate-schema-topic
- Google Cloud Pub/Sub publish messages to a topic with a schema: https://docs.cloud.google.com/pubsub/docs/publish-topics-schema
- Google Cloud Pub/Sub parse messages from a topic with a schema: https://cloud.google.com/pubsub/docs/schemas-valid
- Google Cloud Pub/Sub commit schema revision: https://cloud.google.com/pubsub/docs/commit-schema-revision
- gcloud pubsub schemas commit reference: https://docs.cloud.google.com/sdk/gcloud/reference/pubsub/schemas/commit
- gcloud pubsub schemas validate-message reference: https://docs.cloud.google.com/sdk/gcloud/reference/pubsub/schemas/validate-message
- gcloud pubsub schemas validate-schema reference: https://docs.cloud.google.com/sdk/gcloud/reference/pubsub/schemas/validate-schema
- gcloud pubsub topics create reference: https://docs.cloud.google.com/sdk/gcloud/reference/pubsub/topics/create
- Google Cloud Pub/Sub Avro publish sample: https://cloud.google.com/pubsub/docs/samples/pubsub-publish-avro-records
- BigQuery modifying table schemas: https://docs.cloud.google.com/bigquery/docs/managing-table-schemas
- Apache Avro specification: https://avro.apache.org/docs/

## Issues Found
- The opening JSON example used an RFC 3339 timestamp string while the Avro schema defined `timestamp` as `long` with `timestamp-millis`. Changed the example timestamp to epoch milliseconds.
- The post described `validate-message` as a schema compatibility check and used the incorrect `--schema` flag. Updated the workflow to use `validate-schema` for the new schema, `validate-message` with `--type` and `--definition-file` for a representative payload, and clarified that committing the revision is where Pub/Sub checks compatibility with existing revisions.
- The compatibility explanation did not mention Pub/Sub's stricter schema revision behavior. Added a note that Pub/Sub Avro revisions must satisfy Avro schema resolution in both directions.
- The publisher example imported `Encoding` without using it and used `datetime.utcnow()`. Removed the unused import and changed the timestamp generation to `datetime.now(timezone.utc)`.
- The Avro `currency` field documentation said null defaults to USD even though the schema default is `null`. Updated the field doc and changed the consumer fallback to handle both missing and explicit null values.
- The type-change guidance implied widening is generally safe. Clarified that widening can be backward compatible but is not necessarily forward compatible.

## Review Notes
The Dataflow example shows tagged dead-letter output but does not include a sink for that output. This is acceptable for a compact tutorial snippet, but a production example should wire the dead-letter collection to Pub/Sub, BigQuery, Cloud Storage, or another durable destination.
