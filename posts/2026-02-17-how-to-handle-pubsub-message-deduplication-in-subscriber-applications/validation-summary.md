# Validation Summary: How to Handle Pub/Sub Message Deduplication in Subscriber Applications

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud Pub/Sub
- Pub/Sub exactly-once delivery
- Python Google Cloud Pub/Sub client library
- Python Google Cloud Firestore client library
- Python Google Cloud BigQuery client library
- Redis
- BigQuery GoogleSQL DML
- PostgreSQL / Cloud SQL SQL
- Terraform Google provider
- gcloud CLI

## Sources Consulted
- Google Cloud Pub/Sub exactly-once delivery documentation: https://cloud.google.com/pubsub/docs/exactly-once-delivery
- Google Cloud Pub/Sub subscription properties documentation: https://cloud.google.com/pubsub/docs/subscription-properties
- Google Cloud Pub/Sub service overview: https://cloud.google.com/pubsub/docs/pubsub-basics
- Google Cloud Pub/Sub Python `Message` reference: https://cloud.google.com/python/docs/reference/pubsub/latest/google.cloud.pubsub_v1.subscriber.message.Message
- Google Cloud Pub/Sub Python `PublisherClient.publish` reference: https://cloud.google.com/python/docs/reference/pubsub/latest/google.cloud.pubsub_v1.publisher.client.Client
- Google Cloud Pub/Sub Python `PubsubMessage` reference: https://cloud.google.com/python/docs/reference/pubsub/latest/google.cloud.pubsub_v1.types.PubsubMessage
- Google Cloud BigQuery Python `QueryJobConfig` reference: https://cloud.google.com/python/docs/reference/bigquery/latest/google.cloud.bigquery.job.QueryJobConfig
- BigQuery GoogleSQL DML `MERGE` documentation: https://cloud.google.com/bigquery/docs/reference/standard-sql/dml-syntax
- BigQuery GoogleSQL lexical table-name documentation: https://cloud.google.com/bigquery/docs/reference/standard-sql/lexical
- Terraform Google provider `google_pubsub_subscription` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/pubsub_subscription
- Redis `SET` command documentation: https://redis.io/docs/latest/commands/set/

## Issues Found
- Clarified that Pub/Sub delivers messages at least once by default, because Pub/Sub exactly-once delivery is available for pull subscriptions.
- Corrected the duplicate-publish cause heading from "Multiple subscriptions" to "Duplicate publishes" to match the described scenario.
- Clarified that Pub/Sub message IDs are unique within a topic, matching the Pub/Sub API documentation.
- Changed the Redis deduplication TTL guidance from 24 hours / ack-deadline-based sizing to retention-window-based sizing. Pub/Sub can retain and redeliver unacknowledged messages for the subscription message retention duration, which defaults to 7 days and can be configured up to 31 days.
- Refined the exactly-once delivery caveats to state that exactly-once applies to messages with the same Pub/Sub-assigned message ID and that client code should use supported libraries and acknowledgement methods that report ack success, such as Python `ack_with_response()`.

## Review Notes
The examples are illustrative and omit surrounding production setup such as subscription creation, callback registration, schema creation, authentication, and error handling around downstream side effects. The gcloud command and Terraform field names are current, but `gcloud` was not installed locally, so CLI verification was done against official Google Cloud documentation instead of local `--help` output.
