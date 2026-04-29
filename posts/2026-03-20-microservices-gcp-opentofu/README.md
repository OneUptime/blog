# How to Build a Microservices Architecture with OpenTofu on GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Microservice, Architecture, OpenTofu, GKE, Cloud Endpoints, Pub/Sub

Description: Learn how to build a production-ready microservices architecture on GCP using OpenTofu with GKE, Cloud Endpoints, Pub/Sub event messaging, and Workload Identity.

## Overview

Microservices on GCP use GKE for container orchestration, Cloud Endpoints or API Gateway for external access, Pub/Sub for event-driven communication, and Workload Identity Federation for GKE to grant Google Cloud access to Kubernetes workloads, either directly or by linking Kubernetes service accounts to IAM service accounts.

## Step 1: GKE Cluster

```hcl
# main.tf - GKE cluster for microservices
# Assumes an existing VPC and subnetwork with pod-range and service-range secondary ranges.

resource "google_container_cluster" "microservices" {
  name     = "microservices-cluster"
  location = "us-central1"

  remove_default_node_pool = true
  initial_node_count       = 1

  network    = google_compute_network.vpc.name
  subnetwork = google_compute_subnetwork.gke.name

  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }

  enable_intranode_visibility = true

  gateway_api_config {
    channel = "CHANNEL_STANDARD"
  }

  release_channel {
    channel = "REGULAR"
  }

  ip_allocation_policy {
    cluster_secondary_range_name  = "pod-range"
    services_secondary_range_name = "service-range"
  }
}

resource "google_container_node_pool" "workloads" {
  name       = "workloads"
  cluster    = google_container_cluster.microservices.id
  initial_node_count = 1  # one node per zone in this regional cluster

  autoscaling {
    total_min_node_count = 3
    total_max_node_count = 20
  }

  node_config {
    machine_type = "e2-standard-4"
    disk_type    = "pd-balanced"

    workload_metadata_config {
      mode = "GKE_METADATA"
    }
  }
}
```

## Step 2: Link a Kubernetes ServiceAccount to an IAM Service Account

```hcl
# IAM service account per microservice
resource "google_service_account" "order_service" {
  account_id   = "order-service"
  display_name = "Order Service"
}

# Bind K8s service account to IAM service account
resource "google_service_account_iam_binding" "order_workload_identity" {
  service_account_id = google_service_account.order_service.name
  role               = "roles/iam.workloadIdentityUser"

  members = [
    "serviceAccount:${var.project_id}.svc.id.goog[orders/order-service]"
  ]
}

# Grant permissions to the service
resource "google_pubsub_topic_iam_member" "order_service_publish" {
  topic  = google_pubsub_topic.order_events.id
  role   = "roles/pubsub.publisher"
  member = "serviceAccount:${google_service_account.order_service.email}"
}

# Kubernetes service account annotation
resource "kubernetes_service_account" "order_service" {
  metadata {
    name      = "order-service"
    namespace = "orders"
    annotations = {
      "iam.gke.io/gcp-service-account" = google_service_account.order_service.email
    }
  }
}
```

## Step 3: Pub/Sub for Event-Driven Microservices

```hcl
data "google_project" "current" {
  project_id = var.project_id
}

# IAM service account for the payment service
resource "google_service_account" "payment_service" {
  account_id   = "payment-service"
  display_name = "Payment Service"
}

# Pub/Sub topics for domain events
resource "google_pubsub_topic" "order_events" {
  name = "order-events"

  message_retention_duration = "604800s"  # 7 days
}

resource "google_pubsub_topic" "dead_letter" {
  name = "order-events-dlq"
}

resource "google_pubsub_subscription" "dead_letter" {
  name  = "order-events-dlq-sub"
  topic = google_pubsub_topic.dead_letter.id
}

resource "google_pubsub_subscription" "payment_service" {
  name  = "payment-service-orders"
  topic = google_pubsub_topic.order_events.id

  ack_deadline_seconds       = 30
  message_retention_duration = "604800s"

  retry_policy {
    minimum_backoff = "10s"
    maximum_backoff = "600s"
  }

  dead_letter_policy {
    dead_letter_topic     = google_pubsub_topic.dead_letter.id
    max_delivery_attempts = 5
  }
}

resource "google_pubsub_subscription_iam_member" "payment_consume" {
  subscription = google_pubsub_subscription.payment_service.id
  role         = "roles/pubsub.subscriber"
  member       = "serviceAccount:${google_service_account.payment_service.email}"
}

resource "google_pubsub_topic_iam_member" "pubsub_dead_letter_publish" {
  topic  = google_pubsub_topic.dead_letter.id
  role   = "roles/pubsub.publisher"
  member = "serviceAccount:service-${data.google_project.current.number}@gcp-sa-pubsub.iam.gserviceaccount.com"
}

resource "google_pubsub_subscription_iam_member" "pubsub_dead_letter_ack" {
  subscription = google_pubsub_subscription.payment_service.id
  role         = "roles/pubsub.subscriber"
  member       = "serviceAccount:service-${data.google_project.current.number}@gcp-sa-pubsub.iam.gserviceaccount.com"
}
```

## Step 4: Cloud Endpoints Service Configuration

```hcl
# Cloud Endpoints service configuration for ESPv2
resource "google_endpoints_service" "api" {
  service_name         = "api.endpoints.${var.project_id}.cloud.goog"
  project              = var.project_id
  grpc_config          = file("${path.module}/api-config.yaml")
  protoc_output_base64 = filebase64("${path.module}/api_descriptor.pb")
}
```

This resource deploys the Endpoints service configuration; you still run ESPv2 in front of your GKE service to expose the API externally.

## Summary

Microservices on GCP built with OpenTofu can use Workload Identity Federation for GKE to grant Google Cloud access to Kubernetes workloads, including the option to link a Kubernetes service account to an IAM service account without static credentials. Pub/Sub provides durable event delivery, and dead-letter topics require IAM for the Pub/Sub service agent to publish failed messages. The GKE Gateway API standard channel enables the standard Gateway API CRDs and GKE Gateway controller for Kubernetes-native traffic management.
