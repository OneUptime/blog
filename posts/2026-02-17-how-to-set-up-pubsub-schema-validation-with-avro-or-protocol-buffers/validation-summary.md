# Validation Summary: How to Set Up Pub/Sub Schema Validation with Avro or Protocol Buffers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Pub/Sub
- Pub/Sub schemas
- Apache Avro
- Protocol Buffers
- Google Cloud CLI
- Terraform Google provider
- Python Pub/Sub client library

## Sources Consulted
- Google Cloud Pub/Sub schema overview: https://docs.cloud.google.com/pubsub/docs/schemas
- Google Cloud Pub/Sub create schema documentation: https://docs.cloud.google.com/pubsub/docs/create-schemas
- Google Cloud Pub/Sub associate schema with topic documentation: https://docs.cloud.google.com/pubsub/docs/associate-schema-topic
- Google Cloud Pub/Sub publish to topics with schemas documentation: https://docs.cloud.google.com/pubsub/docs/publish-topics-schema
- Google Cloud Pub/Sub validate message documentation: https://docs.cloud.google.com/pubsub/docs/validate-schema-message
- Google Cloud Pub/Sub RPC reference for SchemaSettings and Encoding: https://docs.cloud.google.com/pubsub/docs/reference/rpc/google.pubsub.v1
- Google Cloud SDK `gcloud pubsub schemas create` and `commit` references: https://docs.cloud.google.com/sdk/gcloud/reference/pubsub/schemas/create and https://docs.cloud.google.com/sdk/gcloud/reference/pubsub/schemas/commit
- Google Cloud SDK `gcloud pubsub schemas validate-message` reference: https://docs.cloud.google.com/sdk/gcloud/reference/pubsub/schemas/validate-message
- Terraform Google provider `google_pubsub_topic` resource documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/pubsub_topic
- Google Cloud Pub/Sub Python publisher documentation: https://docs.cloud.google.com/pubsub/docs/publisher
- Apache Avro specification: https://avro.apache.org/docs/1.11.2/specification/

## Issues Found
- The gcloud examples used API-style schema type values (`AVRO`, `PROTOCOL_BUFFER`) instead of the current CLI-documented values (`avro`, `protocol-buffer`). Updated the CLI snippets while leaving Terraform enum values unchanged.
- The Avro `metadata` field was described as optional because it had a default. Avro defaults support schema resolution but do not make a field optional at encoding time. Updated the wording and included `metadata` in the invalid Python example so the demonstrated failure is specifically the invalid enum value.
- The schema revision Terraform example used unsupported `first_revision_id` and `last_revision_id` arguments in `google_pubsub_topic.schema_settings`. Replaced it with a gcloud revision-range example and noted the Terraform provider limitation.
- The revision example used a timestamp-like revision ID and implied an empty `last_revision_id` means latest. Pub/Sub revision IDs are server-generated IDs, and omitted revision bounds have range semantics. Updated the example to use revision-ID-shaped values and removed the incorrect empty-value guidance.
- The Avro guidance implied existing publishers continue to work solely because a new field has a default. Updated it to account for accepted schema revision ranges and publisher rollout.
- The Avro selection guidance described messages as self-describing. Pub/Sub messages are validated against associated schemas rather than carrying a self-contained Avro object container schema, so this was replaced with a data-pipeline tooling benefit.

## Review Notes
The local environment did not have `gcloud` installed, so CLI validation was performed against current official Google Cloud SDK documentation rather than local `--help` output.
