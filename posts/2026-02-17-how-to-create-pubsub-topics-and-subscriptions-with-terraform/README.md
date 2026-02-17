# How to Create Pub/Sub Topics and Subscriptions with Terraform

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Pub/Sub, Terraform, Infrastructure as Code, Messaging

Description: A practical guide to provisioning Google Cloud Pub/Sub topics and subscriptions using Terraform, including configurations for push, pull, and dead letter topics.

---

Google Cloud Pub/Sub is one of those services that shows up in almost every GCP architecture. Whether you are building event-driven microservices, streaming data into BigQuery, or triggering Cloud Functions, Pub/Sub is usually the glue in between. And if you are managing your infrastructure with Terraform, you will want to define your topics and subscriptions as code rather than clicking through the Console.

This guide walks through creating Pub/Sub topics and subscriptions with Terraform, covering the common configurations you will need in a real project.

## Setting Up the Provider

Before creating any Pub/Sub resources, make sure your Terraform configuration includes the Google provider:

```hcl
# Configure the Google provider with your project and region
terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

variable "project_id" {
  description = "The GCP project ID"
  type        = string
}

variable "region" {
  description = "The GCP region"
  type        = string
  default     = "us-central1"
}
```

## Creating a Basic Topic

The simplest Pub/Sub setup is a topic with a pull subscription. Here is how to create them:

```hcl
# Create a Pub/Sub topic for order events
resource "google_pubsub_topic" "order_events" {
  name = "order-events"

  labels = {
    environment = "production"
    team        = "commerce"
  }

  # Messages are retained for 7 days even after acknowledgement
  message_retention_duration = "604800s"
}

# Create a pull subscription for the order processing service
resource "google_pubsub_subscription" "order_processor" {
  name  = "order-processor-sub"
  topic = google_pubsub_topic.order_events.id

  # How long Pub/Sub waits for acknowledgement before redelivery
  ack_deadline_seconds = 60

  # Retain acknowledged messages for 3 days (useful for replay)
  retain_acked_messages = true
  message_retention_duration = "259200s"

  # How long the subscription persists without subscriber activity
  expiration_policy {
    ttl = ""  # Empty string means the subscription never expires
  }

  labels = {
    environment = "production"
    team        = "commerce"
  }
}
```

The `message_retention_duration` on the topic is separate from the subscription's retention. The topic-level retention keeps messages available even if no subscription exists yet, which is useful during deployments when subscriptions might be briefly deleted and recreated.

## Creating a Push Subscription

Push subscriptions are useful when you want Pub/Sub to deliver messages to an HTTP endpoint, like a Cloud Run service:

```hcl
# Push subscription that delivers messages to a Cloud Run endpoint
resource "google_pubsub_subscription" "order_webhook" {
  name  = "order-webhook-sub"
  topic = google_pubsub_topic.order_events.id

  ack_deadline_seconds = 30

  push_config {
    push_endpoint = "https://order-service-xyz.run.app/webhook/orders"

    # Use OIDC authentication so the endpoint can verify the request
    oidc_token {
      service_account_email = google_service_account.pubsub_invoker.email
      audience              = "https://order-service-xyz.run.app"
    }

    attributes = {
      x-goog-version = "v1"
    }
  }

  # Retry policy for failed deliveries
  retry_policy {
    minimum_backoff = "10s"
    maximum_backoff = "600s"
  }

  expiration_policy {
    ttl = ""
  }
}

# Service account for Pub/Sub to authenticate push requests
resource "google_service_account" "pubsub_invoker" {
  account_id   = "pubsub-invoker"
  display_name = "Pub/Sub Push Invoker"
}
```

The `oidc_token` block is important. Without it, your endpoint receives unauthenticated requests, which is a security risk. The receiving service should validate the OIDC token to ensure the request genuinely comes from Pub/Sub.

## Adding Dead Letter Topics

In production, you need a plan for messages that cannot be processed. A dead letter topic catches messages that have been delivered too many times without being acknowledged:

```hcl
# Dead letter topic for messages that repeatedly fail processing
resource "google_pubsub_topic" "order_events_dlq" {
  name = "order-events-dlq"

  labels = {
    environment = "production"
    purpose     = "dead-letter-queue"
  }
}

# Subscription on the dead letter topic for manual review
resource "google_pubsub_subscription" "order_events_dlq_sub" {
  name  = "order-events-dlq-sub"
  topic = google_pubsub_topic.order_events_dlq.id

  ack_deadline_seconds = 120
  message_retention_duration = "604800s"  # Keep DLQ messages for 7 days

  expiration_policy {
    ttl = ""
  }
}

# Update the main subscription to use the dead letter topic
resource "google_pubsub_subscription" "order_processor_with_dlq" {
  name  = "order-processor-sub"
  topic = google_pubsub_topic.order_events.id

  ack_deadline_seconds = 60

  dead_letter_policy {
    dead_letter_topic     = google_pubsub_topic.order_events_dlq.id
    max_delivery_attempts = 5  # Send to DLQ after 5 failed attempts
  }

  retry_policy {
    minimum_backoff = "10s"
    maximum_backoff = "300s"
  }

  expiration_policy {
    ttl = ""
  }
}
```

For the dead letter policy to work, the Pub/Sub service account needs publish permissions on the dead letter topic and subscribe permissions on the source subscription. Terraform can handle this:

```hcl
# Grant Pub/Sub service account permission to publish to the DLQ topic
resource "google_pubsub_topic_iam_member" "dlq_publisher" {
  topic  = google_pubsub_topic.order_events_dlq.name
  role   = "roles/pubsub.publisher"
  member = "serviceAccount:service-${data.google_project.current.number}@gcp-sa-pubsub.iam.gserviceaccount.com"
}

# Grant Pub/Sub service account permission to subscribe on the source subscription
resource "google_pubsub_subscription_iam_member" "dlq_subscriber" {
  subscription = google_pubsub_subscription.order_processor_with_dlq.name
  role         = "roles/pubsub.subscriber"
  member       = "serviceAccount:service-${data.google_project.current.number}@gcp-sa-pubsub.iam.gserviceaccount.com"
}

data "google_project" "current" {}
```

## Using Modules for Reusable Patterns

If you have many topics and subscriptions that follow similar patterns, wrap them in a Terraform module:

```hcl
# modules/pubsub-topic/main.tf - Reusable module for topic with DLQ
variable "topic_name" {
  type = string
}

variable "subscriptions" {
  type = map(object({
    ack_deadline        = number
    max_delivery_attempts = number
  }))
}

variable "labels" {
  type    = map(string)
  default = {}
}

resource "google_pubsub_topic" "main" {
  name   = var.topic_name
  labels = var.labels
  message_retention_duration = "604800s"
}

resource "google_pubsub_topic" "dlq" {
  name   = "${var.topic_name}-dlq"
  labels = merge(var.labels, { purpose = "dead-letter-queue" })
}

resource "google_pubsub_subscription" "subs" {
  for_each = var.subscriptions

  name                 = each.key
  topic                = google_pubsub_topic.main.id
  ack_deadline_seconds = each.value.ack_deadline

  dead_letter_policy {
    dead_letter_topic     = google_pubsub_topic.dlq.id
    max_delivery_attempts = each.value.max_delivery_attempts
  }

  expiration_policy {
    ttl = ""
  }
}
```

Then use it in your root configuration:

```hcl
# Create a topic with multiple subscriptions using the module
module "order_events" {
  source     = "./modules/pubsub-topic"
  topic_name = "order-events"

  subscriptions = {
    "order-processor-sub" = {
      ack_deadline          = 60
      max_delivery_attempts = 5
    }
    "order-analytics-sub" = {
      ack_deadline          = 120
      max_delivery_attempts = 10
    }
  }

  labels = {
    environment = "production"
    team        = "commerce"
  }
}
```

## Importing Existing Resources

If you already have Pub/Sub topics and subscriptions created through the Console or gcloud, you can import them into Terraform state:

```bash
# Import an existing topic into Terraform state
terraform import google_pubsub_topic.order_events projects/my-project/topics/order-events

# Import an existing subscription
terraform import google_pubsub_subscription.order_processor projects/my-project/subscriptions/order-processor-sub
```

After importing, run `terraform plan` to see if there are any differences between your configuration and the actual state. Adjust your Terraform code until the plan shows no changes.

## Common Pitfalls

A few things that trip people up when managing Pub/Sub with Terraform:

1. **Subscription expiration**: By default, subscriptions expire after 31 days of inactivity. If your subscription seems to disappear, set `expiration_policy { ttl = "" }` to disable expiration.

2. **Changing topic on a subscription**: You cannot change the topic of an existing subscription. Terraform will destroy and recreate it, which means you lose any unprocessed messages.

3. **IAM propagation delays**: After granting IAM roles, it can take a few minutes for the permissions to propagate. If dead letter publishing fails immediately after creation, wait and retry.

4. **Message ordering**: If you need ordered delivery, you must set `enable_message_ordering = true` on the subscription. This cannot be changed after creation without recreating the subscription.

## Wrapping Up

Terraform is the right way to manage Pub/Sub infrastructure in any serious GCP project. It gives you version control, peer review, and reproducibility for your messaging infrastructure. Start with simple topics and pull subscriptions, add dead letter topics for resilience, and use modules when patterns start repeating. The initial investment in writing Terraform code pays for itself the first time you need to replicate your setup in a new environment.
