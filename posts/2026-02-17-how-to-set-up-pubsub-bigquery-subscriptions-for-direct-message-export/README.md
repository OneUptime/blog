# How to Set Up Pub/Sub BigQuery Subscriptions for Direct Message Export

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Pub/Sub, BigQuery, Data Pipeline, Streaming

Description: Learn how to configure Pub/Sub BigQuery subscriptions to write messages directly to BigQuery tables without intermediate processing, reducing pipeline complexity.

---

One of the most common patterns in GCP is taking messages from Pub/Sub and loading them into BigQuery for analysis. Traditionally, this required a Dataflow pipeline or a Cloud Function sitting in between. That works fine, but it adds operational overhead - you have to manage another service, handle scaling, and deal with failures in the intermediary.

Pub/Sub BigQuery subscriptions cut out the middleman. Messages flow directly from a Pub/Sub topic into a BigQuery table. No Dataflow, no Cloud Functions, no custom code. Pub/Sub handles the writing, retries, and error handling.

Here is how to set it up.

## Prerequisites

Before configuring a BigQuery subscription, you need:

1. A Pub/Sub topic with messages
2. A BigQuery dataset and table with a schema that matches your message structure
3. The Pub/Sub service account must have BigQuery write permissions

Let me walk through each step.

## Creating the BigQuery Table

Your BigQuery table schema needs to match the fields in your Pub/Sub messages. Pub/Sub can write messages in three modes: using the topic schema, using the BigQuery table schema for JSON messages, or writing the raw message to a generic table.

For structured data, create a table that matches your message format:

```sql
-- Create a BigQuery table for order events
CREATE TABLE `my-project.analytics.order_events` (
  order_id STRING NOT NULL,
  customer_id STRING NOT NULL,
  total_amount FLOAT64,
  currency STRING,
  status STRING,
  created_at TIMESTAMP,
  -- Pub/Sub metadata columns (automatically populated)
  subscription_name STRING,
  message_id STRING,
  publish_time TIMESTAMP,
  attributes STRING
);
```

If you do not want to define a specific schema, you can use the default table schema that Pub/Sub supports. It writes the entire message as a single column:

```sql
-- Generic table for raw Pub/Sub messages
CREATE TABLE `my-project.analytics.raw_messages` (
  data STRING,           -- The message body
  subscription_name STRING,
  message_id STRING,
  publish_time TIMESTAMP,
  attributes STRING      -- JSON string of message attributes
);
```

## Granting Permissions

The Pub/Sub service account needs permission to write to your BigQuery table. The service account follows the format `service-PROJECT_NUMBER@gcp-sa-pubsub.iam.gserviceaccount.com`:

```bash
# Get your project number

PROJECT_NUMBER=$(gcloud projects describe my-project --format="value(projectNumber)")

# Grant BigQuery data editor role to the Pub/Sub service account
gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:service-${PROJECT_NUMBER}@gcp-sa-pubsub.iam.gserviceaccount.com" \
  --role="roles/bigquery.dataEditor"

# Also grant metadata viewer for table access
gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:service-${PROJECT_NUMBER}@gcp-sa-pubsub.iam.gserviceaccount.com" \
  --role="roles/bigquery.metadataViewer"
```

## Creating the BigQuery Subscription

Now create the subscription that connects your topic to the BigQuery table:

```bash
# Create a BigQuery subscription
gcloud pubsub subscriptions create order-events-bq-sub \
  --topic=order-events \
  --bigquery-table=my-project.analytics.order_events \
  --use-topic-schema \
  --write-metadata
```

The `--use-topic-schema` flag tells Pub/Sub to use the Avro or Protocol Buffer schema attached to the topic for mapping fields. The `--write-metadata` flag adds Pub/Sub metadata (message ID, publish time, subscription name, attributes) to the table.

If your topic does not have a schema, omit the `--use-topic-schema` flag and Pub/Sub will write the raw message data to the `data` column. If you publish JSON messages and want Pub/Sub to map JSON fields to matching BigQuery columns instead, use the `--use-table-schema` option.

## Terraform Configuration

For infrastructure-as-code, here is the Terraform setup:

```hcl
# BigQuery dataset for analytics
resource "google_bigquery_dataset" "analytics" {
  dataset_id = "analytics"
  location   = "US"
}

# BigQuery table for order events
resource "google_bigquery_table" "order_events" {
  dataset_id = google_bigquery_dataset.analytics.dataset_id
  table_id   = "order_events"

  schema = jsonencode([
    { name = "order_id",     type = "STRING",    mode = "REQUIRED" },
    { name = "customer_id",  type = "STRING",    mode = "REQUIRED" },
    { name = "total_amount", type = "FLOAT64",   mode = "NULLABLE" },
    { name = "currency",     type = "STRING",    mode = "NULLABLE" },
    { name = "status",       type = "STRING",    mode = "NULLABLE" },
    { name = "created_at",   type = "TIMESTAMP", mode = "NULLABLE" },
    # Metadata columns populated by Pub/Sub
    { name = "subscription_name", type = "STRING",    mode = "NULLABLE" },
    { name = "message_id",        type = "STRING",    mode = "NULLABLE" },
    { name = "publish_time",      type = "TIMESTAMP", mode = "NULLABLE" },
    { name = "attributes",        type = "STRING",    mode = "NULLABLE" },
  ])
}

# Pub/Sub topic with Avro schema
resource "google_pubsub_schema" "order_events" {
  name       = "order-events-schema"
  type       = "AVRO"
  definition = jsonencode({
    type = "record"
    name = "OrderEvent"
    fields = [
      { name = "order_id",     type = "string" },
      { name = "customer_id",  type = "string" },
      { name = "total_amount", type = "double" },
      { name = "currency",     type = "string" },
      { name = "status",       type = "string" },
      { name = "created_at",   type = { type = "long", logicalType = "timestamp-micros" } },
    ]
  })
}

resource "google_pubsub_topic" "order_events" {
  name = "order-events"

  schema_settings {
    schema   = google_pubsub_schema.order_events.id
    encoding = "JSON"
  }
}

# BigQuery subscription that writes directly to the table
resource "google_pubsub_subscription" "order_events_bq" {
  name  = "order-events-bq-sub"
  topic = google_pubsub_topic.order_events.id

  bigquery_config {
    table            = "${google_bigquery_table.order_events.project}.${google_bigquery_table.order_events.dataset_id}.${google_bigquery_table.order_events.table_id}"
    use_topic_schema = true
    write_metadata   = true
  }

  # No expiration
  expiration_policy {
    ttl = ""
  }
}

# Grant Pub/Sub service account access to write to BigQuery
resource "google_project_iam_member" "pubsub_bq_editor" {
  project = var.project_id
  role    = "roles/bigquery.dataEditor"
  member  = "serviceAccount:service-${data.google_project.current.number}@gcp-sa-pubsub.iam.gserviceaccount.com"
}

resource "google_project_iam_member" "pubsub_bq_viewer" {
  project = var.project_id
  role    = "roles/bigquery.metadataViewer"
  member  = "serviceAccount:service-${data.google_project.current.number}@gcp-sa-pubsub.iam.gserviceaccount.com"
}

data "google_project" "current" {}
```

## How Message Mapping Works

Pub/Sub maps message fields to BigQuery columns based on the topic schema. Here is how the different data types translate:

| Avro Type | BigQuery Type |
|-----------|---------------|
| string | STRING |
| int | INT64 |
| long | INT64 |
| float | FLOAT64 |
| double | FLOAT64 |
| boolean | BOOL |
| bytes | BYTES |
| timestamp-micros (logical) | TIMESTAMP |

If the topic schema has a field that does not match any column in the BigQuery table, the write fails and the message stays in the subscription backlog unless you enable `drop_unknown_fields`. If you enable `drop_unknown_fields`, Pub/Sub drops fields that are in the topic schema but not in the BigQuery schema. If a required BigQuery column is missing from the message, the write fails and the message is nacked for retry.

## Handling Errors and Dead Letters

Messages can fail to write to BigQuery for several reasons - schema mismatches, invalid field values, or BigQuery API errors. You should configure a dead letter topic to catch message-level write failures. Permission or table-state errors can put the subscription into an error state and leave messages in the backlog until you fix the configuration.

```hcl
# Dead letter topic for messages that fail BigQuery insertion
resource "google_pubsub_topic" "order_events_bq_dlq" {
  name = "order-events-bq-dlq"
}

resource "google_pubsub_subscription" "order_events_bq" {
  name  = "order-events-bq-sub"
  topic = google_pubsub_topic.order_events.id

  bigquery_config {
    table            = "${google_bigquery_table.order_events.project}.${google_bigquery_table.order_events.dataset_id}.${google_bigquery_table.order_events.table_id}"
    use_topic_schema = true
    write_metadata   = true
  }

  # Send failed messages to a dead letter topic after 10 attempts
  dead_letter_policy {
    dead_letter_topic     = google_pubsub_topic.order_events_bq_dlq.id
    max_delivery_attempts = 10
  }

  expiration_policy {
    ttl = ""
  }
}

# Pub/Sub also needs permission to forward and acknowledge dead-lettered messages
resource "google_pubsub_topic_iam_member" "order_events_bq_dlq_publisher" {
  topic  = google_pubsub_topic.order_events_bq_dlq.name
  role   = "roles/pubsub.publisher"
  member = "serviceAccount:service-${data.google_project.current.number}@gcp-sa-pubsub.iam.gserviceaccount.com"
}

resource "google_pubsub_subscription_iam_member" "order_events_bq_subscriber" {
  subscription = google_pubsub_subscription.order_events_bq.name
  role         = "roles/pubsub.subscriber"
  member       = "serviceAccount:service-${data.google_project.current.number}@gcp-sa-pubsub.iam.gserviceaccount.com"
}
```

## Monitoring the Subscription

Keep an eye on these metrics in Cloud Monitoring to make sure your BigQuery subscription is healthy:

- `pubsub.googleapis.com/subscription/num_undelivered_messages` - Messages waiting to be written. A growing backlog means writes are falling behind.
- `pubsub.googleapis.com/subscription/oldest_unacked_message_age` - How stale your oldest pending message is. High values indicate processing delays.
- `pubsub.googleapis.com/subscription/dead_letter_message_count` - Messages sent to the DLQ. Any increase here needs investigation.

```bash
# Check the subscription configuration and state
gcloud pubsub subscriptions describe order-events-bq-sub \
  --format="yaml(name,state,topic,bigqueryConfig,deadLetterPolicy)"
```

## Limitations to Know About

BigQuery subscriptions are powerful but have some constraints:

1. **Limited transformation**: Messages are written to BigQuery without custom subscriber code. If you need complex transformations, enrichment, joins, windowing, or aggregation, you still need Dataflow or another processing layer.

2. **Schema required for structured data**: If you want field-level mapping, use an Avro or Protocol Buffer topic schema, or use the BigQuery table schema option for JSON messages. Otherwise, everything goes into a single `data` column.

3. **Throughput limits**: BigQuery subscriptions use the BigQuery Storage Write API, which has its own quotas. For extremely high-throughput topics, check that you are within limits.

4. **Streaming buffer behavior for partitioned tables**: BigQuery subscriptions can write to partitioned tables, but streaming writes can temporarily appear in the `__UNPARTITIONED__` partition for ingestion-time partitioned tables until BigQuery repartitions the data.

## When to Use BigQuery Subscriptions vs Dataflow

Use BigQuery subscriptions when your data is already in the right format and you just need to land it in BigQuery. Use Dataflow when you need to transform, aggregate, join, or filter data before it hits BigQuery.

For many use cases - logging, event tracking, audit trails, simple analytics - BigQuery subscriptions are the simpler and cheaper option. Reserve Dataflow for the cases where you genuinely need the processing power.

## Wrapping Up

Pub/Sub BigQuery subscriptions are a great way to eliminate unnecessary middleware in your data pipeline. They handle the writing, retries, and batching for you. Set up your topic schema, create the BigQuery table, configure the subscription, and messages flow automatically. Add a dead letter topic for error handling, monitor the backlog metrics, and you have a reliable streaming pipeline with minimal moving parts.
