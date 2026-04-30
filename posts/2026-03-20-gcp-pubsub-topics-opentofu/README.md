# How to Create GCP Pub/Sub Topics with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, GCP, Pub/Sub, Messaging, Infrastructure as Code, Streaming, Google Cloud

Description: Learn how to create GCP Pub/Sub topics, subscriptions, and IAM bindings using OpenTofu for scalable async messaging between services on Google Cloud.

---

GCP Pub/Sub is the globally distributed message queue and streaming platform. It decouples services, buffers event streams, and enables fanout messaging patterns. With OpenTofu, you define topics, subscriptions, and IAM access as code, ensuring your messaging infrastructure is as well-governed as your application infrastructure.

## Creating Topics

```hcl
# main.tf

terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.10"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# Main event topic
resource "google_pubsub_topic" "orders" {
  name    = "orders"
  project = var.project_id

  # Topic message retention - retain published messages for 7 days for replay/seek
  message_retention_duration = "604800s"

  # Restrict message storage to the specified region
  message_storage_policy {
    allowed_persistence_regions = [var.region]
  }

  labels = {
    environment = var.environment
    managed_by  = "opentofu"
  }
}

# Dead letter topic for failed messages
resource "google_pubsub_topic" "orders_dlq" {
  name    = "orders-dead-letter"
  project = var.project_id

  message_retention_duration = "604800s"
}
```

## Creating Subscriptions

```hcl
# subscriptions.tf
# Pull subscription for application consumers
resource "google_pubsub_subscription" "orders_processor" {
  name    = "orders-processor"
  topic   = google_pubsub_topic.orders.name
  project = var.project_id

  # Acknowledge deadline - processor must ack within 600 seconds
  ack_deadline_seconds = 600

  # Message retention - keep unacknowledged messages for 7 days
  message_retention_duration = "604800s"

  # Retry policy - retry with exponential backoff
  retry_policy {
    minimum_backoff = "10s"
    maximum_backoff = "600s"
  }

  # Dead letter policy - forward to the DLQ after approximately 5 delivery attempts
  dead_letter_policy {
    dead_letter_topic     = google_pubsub_topic.orders_dlq.id
    max_delivery_attempts = 5
  }

  labels = {
    environment = var.environment
    managed_by  = "opentofu"
  }
}

# Push subscription for a webhook endpoint
resource "google_pubsub_subscription" "orders_webhook" {
  name    = "orders-webhook"
  topic   = google_pubsub_topic.orders.name
  project = var.project_id

  ack_deadline_seconds = 60

  push_config {
    push_endpoint = var.webhook_url

    # Use the v1 push payload format
    attributes = {
      x-goog-version = "v1"
    }

    # Authenticate using OIDC
    oidc_token {
      service_account_email = google_service_account.pubsub_invoker.email
    }
  }
}
```

## IAM Bindings for Publishers and Subscribers

```hcl
# iam.tf
# Allow the orders service to publish to the orders topic
resource "google_pubsub_topic_iam_member" "orders_publisher" {
  topic   = google_pubsub_topic.orders.name
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:${google_service_account.orders_service.email}"
}

# Allow the processor service to consume from the subscription
resource "google_pubsub_subscription_iam_member" "orders_subscriber" {
  subscription = google_pubsub_subscription.orders_processor.name
  role         = "roles/pubsub.subscriber"
  member       = "serviceAccount:${google_service_account.processor_service.email}"
}

# Grant Pub/Sub service account permission to publish to the DLQ
# Required for dead letter policy to work
resource "google_pubsub_topic_iam_member" "dlq_publisher" {
  topic  = google_pubsub_topic.orders_dlq.name
  role   = "roles/pubsub.publisher"
  member = "serviceAccount:service-${data.google_project.main.number}@gcp-sa-pubsub.iam.gserviceaccount.com"
}

# Grant Pub/Sub service account permission to acknowledge and remove
# dead-lettered messages from the source subscription
resource "google_pubsub_subscription_iam_member" "orders_dlq_forwarder" {
  subscription = google_pubsub_subscription.orders_processor.name
  role         = "roles/pubsub.subscriber"
  member       = "serviceAccount:service-${data.google_project.main.number}@gcp-sa-pubsub.iam.gserviceaccount.com"
}

data "google_project" "main" {}
```

## Schema Registry Integration

```hcl
# schema.tf
# Define an Avro schema for message validation
resource "google_pubsub_schema" "order_event" {
  name       = "order-event-schema"
  type       = "AVRO"
  definition = jsonencode({
    type = "record"
    name = "OrderEvent"
    fields = [
      { name = "orderId",    type = "string" },
      { name = "userId",     type = "string" },
      { name = "eventType",  type = "string" },
      { name = "timestamp",  type = "long" },
      { name = "amount",     type = "double" }
    ]
  })
}

# Attach schema to topic
resource "google_pubsub_topic" "orders_validated" {
  name = "orders-validated"

  schema_settings {
    schema   = google_pubsub_schema.order_event.id
    encoding = "JSON"
  }
}
```

## Best Practices

- Consider configuring a dead letter policy on subscriptions that need bounded redelivery attempts.
- Grant Pub/Sub's service account publisher access on the DLQ topic and subscriber access on the source subscription - without these, dead-lettering won't work correctly.
- Use pull subscriptions with StreamingPull for maximum throughput and lowest latency; use push subscriptions when webhook-style delivery is a better fit.
- Set `message_retention_duration` based on your consumer's recovery time - if your consumer has a 1-hour outage window, retain messages for longer.
- Use schemas to enforce message contracts between publishers and subscribers, preventing silent data quality issues.
