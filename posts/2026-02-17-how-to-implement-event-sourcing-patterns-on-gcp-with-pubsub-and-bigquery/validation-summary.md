# Validation Summary: How to Implement Event Sourcing Patterns on GCP with Pub/Sub and BigQuery

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud Pub/Sub
- Pub/Sub message ordering and ordering keys
- Pub/Sub BigQuery subscriptions
- BigQuery
- GoogleSQL
- Apache Beam / Dataflow
- Python Google Cloud Pub/Sub client
- Google Cloud Monitoring
- gcloud CLI

## Sources Consulted
- Google Cloud Pub/Sub message ordering documentation: https://docs.cloud.google.com/pubsub/docs/ordering
- Google Cloud Pub/Sub publishing with ordering keys documentation: https://docs.cloud.google.com/pubsub/docs/publisher
- Google Cloud Pub/Sub BigQuery subscription documentation: https://docs.cloud.google.com/pubsub/docs/create-bigquery-subscription
- Google Cloud SDK `gcloud pubsub subscriptions create` reference: https://cloud.google.com/sdk/gcloud/reference/pubsub/subscriptions/create
- Google Cloud SDK `gcloud monitoring policies create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Apache Beam Python Pub/Sub I/O documentation: https://beam.apache.org/releases/pydoc/2.64.0/apache_beam.io.gcp.pubsub.html
- BigQuery partitioned tables documentation: https://docs.cloud.google.com/bigquery/docs/partitioned-tables
- BigQuery JSON data type documentation: https://cloud.google.com/bigquery/docs/reference/standard-sql/data-types
- BigQuery GoogleSQL DML syntax documentation: https://cloud.google.com/bigquery/docs/reference/standard-sql/dml-syntax

## Issues Found
- The Pub/Sub ordering explanation overstated the guarantee. Updated it to reflect that ordering applies per ordering key, in the order Pub/Sub receives messages, and requires publishing messages with the same ordering key in the same region.
- The Python publisher used `datetime.utcnow()`, which is deprecated in current Python. Replaced it with timezone-aware UTC timestamp generation.
- The Dataflow example used `message.data`, but `ReadFromPubSub` returns raw bytes by default unless `with_attributes=True` is set. Updated the parser to decode the bytes returned by the default transform.
- The Dataflow example configured `id_label="event_id"` but the publisher did not publish that attribute. Added `event_id` as a Pub/Sub message attribute.
- The direct Pub/Sub BigQuery subscription example used `--use-topic-schema` without saying that the topic must have a compatible schema, and also used `--write-metadata` without the required metadata columns in the BigQuery table. Clarified the topic-schema prerequisite, removed `--write-metadata`, and updated the table identifier format to the official `PROJECT.DATASET.TABLE` form.
- The deduplication `MERGE` query targeted a table created with `require_partition_filter=true` but did not include a partition filter on the target table. Added a target-side `timestamp` filter.
- The Cloud Monitoring alert command used invalid flags `--condition-threshold-value` and `--condition-threshold-duration`. Replaced them with the documented `--if` and `--duration` flags.

## Review Notes
The local environment did not have `gcloud` installed, so CLI validation was performed against official Google Cloud SDK documentation rather than local `--help` output.
