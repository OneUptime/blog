# How to Create Pub/Sub Subscriptions with Push and Pull in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Pub/Sub, Messaging, OpenTofu, Event-Driven, Infrastructure

Description: Learn how to create Google Cloud Pub/Sub topics and subscriptions with both push and pull delivery modes using OpenTofu for event-driven architectures.

## Overview

Cloud Pub/Sub is a scalable, asynchronous messaging service. Subscriptions can be pull-based (consumer requests messages) or push-based (Pub/Sub delivers to an HTTPS endpoint). OpenTofu manages topics, subscriptions, and their configurations.

## Step 1: Create a Pub/Sub Topic

```hcl
# main.tf - Pub/Sub topic with schema validation

resource "google_pubsub_topic" "orders_topic" {
  name = "order-events"

  # Message retention duration (10 minutes to 31 days)
  message_retention_duration = "86400s"  # 24 hours

  # Schema enforcement for message validation
  schema_settings {
    schema   = google_pubsub_schema.order_schema.id
    encoding = "JSON"
  }

  labels = {
    service = "order-processing"
  }
}

# Dead letter topic for undeliverable messages
resource "google_pubsub_topic" "dead_letter_topic" {
  name = "order-events-dead-letter"
}
```

## Step 2: Create a Pull Subscription

```hcl
# Pull subscription - consumers poll for messages
resource "google_pubsub_subscription" "order_processor_pull" {
  name  = "order-processor-subscription"
  topic = google_pubsub_topic.orders_topic.name

  # Message acknowledgement deadline
  ack_deadline_seconds = 30

  # Retain unacknowledged messages for up to 7 days
  message_retention_duration = "604800s"

  # Dead letter policy - forward undeliverable messages
  dead_letter_policy {
    dead_letter_topic     = google_pubsub_topic.dead_letter_topic.id
    max_delivery_attempts = 5  # Approximate delivery attempts before dead-lettering
  }

  # Retry policy for failed deliveries
  retry_policy {
    minimum_backoff = "10s"
    maximum_backoff = "600s"
  }

  labels = {
    consumer = "order-processor"
  }
}
```

## Step 3: Create a Push Subscription

```hcl
# Push subscription - Pub/Sub delivers to an HTTPS endpoint
resource "google_pubsub_subscription" "order_webhook_push" {
  name  = "order-webhook-push-subscription"
  topic = google_pubsub_topic.orders_topic.name

  ack_deadline_seconds = 20

  push_config {
    push_endpoint = "https://api.example.com/webhooks/orders"

    # Authentication for the push endpoint
    oidc_token {
      service_account_email = google_service_account.pubsub_sa.email
      audience              = "https://api.example.com"
    }

    attributes = {
      x-goog-version = "v1"
    }
  }

  dead_letter_policy {
    dead_letter_topic     = google_pubsub_topic.dead_letter_topic.id
    max_delivery_attempts = 5
  }

  depends_on = [google_service_account_iam_member.pubsub_push_token_creator]
}
```

## Step 4: BigQuery Subscription

```hcl
# Write messages directly to BigQuery
resource "google_pubsub_subscription" "bq_subscription" {
  name  = "orders-to-bigquery"
  topic = google_pubsub_topic.orders_topic.name

  # The destination table must include the required data and metadata columns.
  bigquery_config {
    table               = "${data.google_project.project.project_id}.${google_bigquery_dataset.events.dataset_id}.${google_bigquery_table.orders.table_id}"
    write_metadata      = true
    drop_unknown_fields = false
  }

  depends_on = [google_project_iam_member.pubsub_bigquery_writer]
}
```

## Step 5: IAM

```hcl
data "google_project" "project" {}

resource "google_pubsub_topic_iam_member" "publisher" {
  topic  = google_pubsub_topic.orders_topic.name
  role   = "roles/pubsub.publisher"
  member = "serviceAccount:${google_service_account.app_sa.email}"
}

resource "google_pubsub_subscription_iam_member" "subscriber" {
  subscription = google_pubsub_subscription.order_processor_pull.name
  role         = "roles/pubsub.subscriber"
  member       = "serviceAccount:${google_service_account.processor_sa.email}"
}

# Required for dead-letter forwarding
resource "google_pubsub_topic_iam_member" "dead_letter_publisher" {
  topic  = google_pubsub_topic.dead_letter_topic.name
  role   = "roles/pubsub.publisher"
  member = "serviceAccount:service-${data.google_project.project.number}@gcp-sa-pubsub.iam.gserviceaccount.com"
}

resource "google_pubsub_subscription_iam_member" "dead_letter_pull_subscriber" {
  subscription = google_pubsub_subscription.order_processor_pull.name
  role         = "roles/pubsub.subscriber"
  member       = "serviceAccount:service-${data.google_project.project.number}@gcp-sa-pubsub.iam.gserviceaccount.com"
}

resource "google_pubsub_subscription_iam_member" "dead_letter_push_subscriber" {
  subscription = google_pubsub_subscription.order_webhook_push.name
  role         = "roles/pubsub.subscriber"
  member       = "serviceAccount:service-${data.google_project.project.number}@gcp-sa-pubsub.iam.gserviceaccount.com"
}

# Required for OIDC-authenticated push delivery
resource "google_service_account_iam_member" "pubsub_push_token_creator" {
  service_account_id = google_service_account.pubsub_sa.name
  role               = "roles/iam.serviceAccountTokenCreator"
  member             = "serviceAccount:service-${data.google_project.project.number}@gcp-sa-pubsub.iam.gserviceaccount.com"
}

# Required for BigQuery subscriptions that use the default Pub/Sub service agent
resource "google_project_iam_member" "pubsub_bigquery_writer" {
  project = data.google_project.project.project_id
  role    = "roles/bigquery.dataEditor"
  member  = "serviceAccount:service-${data.google_project.project.number}@gcp-sa-pubsub.iam.gserviceaccount.com"
}
```

## Summary

Cloud Pub/Sub subscriptions with OpenTofu support multiple delivery patterns. Pull subscriptions let consumers control the rate, push subscriptions deliver to HTTPS endpoints, and BigQuery subscriptions write directly to tables. Dead-letter topics and retry policies help manage failed deliveries when consumers experience failures.
