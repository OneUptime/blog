# How to Configure GCP Instance Group Autoscaler with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Autoscaling, Instance Groups, OpenTofu, Compute Engine, Infrastructure

Description: Learn how to configure GCP Instance Group Autoscaler with OpenTofu using CPU utilization, custom metrics, and scheduled scaling policies.

## Overview

GCP Autoscaler automatically adjusts the number of instances in a Managed Instance Group based on CPU utilization, HTTP load balancing utilization, or Cloud Monitoring metrics. OpenTofu configures autoscalers with fine-grained scaling policies.

## Step 1: CPU-Based Autoscaler

```hcl
# main.tf - Autoscaler based on CPU utilization

resource "google_compute_autoscaler" "web_autoscaler" {
  name   = "web-server-autoscaler"
  zone   = "us-central1-a"
  target = google_compute_instance_group_manager.web_mig.id

  autoscaling_policy {
    min_replicas    = 2
    max_replicas    = 20
    cooldown_period = 60  # Wait 60s before using metrics from new instances

    # Target 60% average CPU utilization
    cpu_utilization {
      target = 0.6  # 60% CPU utilization target
    }
  }
}
```

## Step 2: Regional Autoscaler

```hcl
# Regional autoscaler for a regional MIG
resource "google_compute_region_autoscaler" "regional_autoscaler" {
  name   = "regional-web-autoscaler"
  region = "us-central1"
  target = google_compute_region_instance_group_manager.regional_web_mig.id

  autoscaling_policy {
    min_replicas    = 3
    max_replicas    = 30
    cooldown_period = 120

    cpu_utilization {
      target = 0.65
    }

    # Scale based on HTTP load balancing utilization
    load_balancing_utilization {
      target = 0.8  # 80% of backend capacity
    }
  }
}
```

## Step 3: Cloud Monitoring Metric Autoscaler

```hcl
# Autoscaler using a Cloud Monitoring metric (e.g., queue depth)
resource "google_compute_autoscaler" "queue_autoscaler" {
  name   = "queue-worker-autoscaler"
  zone   = "us-central1-a"
  target = google_compute_instance_group_manager.worker_mig.id

  autoscaling_policy {
    min_replicas    = 1
    max_replicas    = 50
    cooldown_period = 60

    metric {
      # Pub/Sub queue depth metric from Cloud Monitoring
      name   = "pubsub.googleapis.com/subscription/num_undelivered_messages"
      single_instance_assignment = 100  # 100 messages per worker instance

      # Filter to specific subscription
      filter = "resource.type = \"pubsub_subscription\" AND resource.labels.subscription_id = \"my-subscription\""
    }
  }
}
```

## Step 4: Scale-In Control

```hcl
# Autoscaler with conservative scale-in to prevent flapping
resource "google_compute_autoscaler" "conservative_autoscaler" {
  name   = "conservative-autoscaler"
  zone   = "us-central1-a"
  target = google_compute_instance_group_manager.web_mig.id

  autoscaling_policy {
    min_replicas    = 2
    max_replicas    = 10
    cooldown_period = 60

    cpu_utilization {
      target = 0.6
    }

    # Prevent removing more than 1 instance per 10 minutes
    scale_in_control {
      max_scaled_in_replicas {
        fixed = 1
      }
      time_window_sec = 600
    }
  }
}
```

## Summary

GCP Autoscaler with OpenTofu provides automatic capacity management for Managed Instance Groups. Combining CPU utilization with Pub/Sub backlog metrics enables event-driven scaling for worker fleets. The scale-in control prevents aggressive downscaling that could impact application performance during brief traffic spikes.
