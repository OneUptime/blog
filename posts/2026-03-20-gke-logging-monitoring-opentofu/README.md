# How to Configure GKE Logging and Monitoring with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GKE, Logging, Monitoring, OpenTofu, Observability, GCP

Description: Learn how to configure GKE cluster logging and monitoring with OpenTofu including Cloud Logging, Cloud Monitoring, and managed Prometheus integration.

## Overview

GKE integrates with Cloud Logging and Cloud Monitoring to provide comprehensive observability. OpenTofu configures logging service, monitoring service, managed Prometheus, and log-based metrics for complete cluster observability.

## Step 1: Configure Logging and Monitoring on Cluster

```hcl
# main.tf - GKE cluster with logging and monitoring

resource "google_container_cluster" "monitored_cluster" {
  name     = "monitored-gke-cluster"
  location = "us-central1"

  remove_default_node_pool = true
  initial_node_count       = 1

  network    = google_compute_network.vpc.name
  subnetwork = google_compute_subnetwork.subnet.name

  # Logging service
  logging_service = "logging.googleapis.com/kubernetes"

  # Monitoring service
  monitoring_service = "monitoring.googleapis.com/kubernetes"

  # Configure what to log
  logging_config {
    enable_components = [
      "SYSTEM_COMPONENTS",   # kube-system workloads and node-level system logs
      "WORKLOADS",           # Application container logs
      "APISERVER",           # Kubernetes API server logs
      "SCHEDULER",           # Kubernetes scheduler logs
      "CONTROLLER_MANAGER",  # Kubernetes controller manager logs
    ]
  }

  # Configure what to monitor
  monitoring_config {
    enable_components = [
      "SYSTEM_COMPONENTS",
      "APISERVER",
      "SCHEDULER",
      "CONTROLLER_MANAGER",
      "STORAGE",
      "HPA",
      "POD",
      "DAEMONSET",
      "DEPLOYMENT",
      "STATEFULSET",
    ]

    # Enable Managed Service for Prometheus managed collection
    # Scrape targets still require PodMonitoring or ClusterPodMonitoring resources.
    managed_prometheus {
      enabled = true
    }
  }
}
```

## Step 2: Log-Based Metrics for Alerting

```hcl
# Create a log-based metric for container error logs
resource "google_logging_metric" "error_rate_metric" {
  name        = "gke-container-errors"
  description = "Count of container error logs in GKE"
  project     = var.project_id

  filter = <<-FILTER
    resource.type="k8s_container"
    resource.labels.cluster_name="${google_container_cluster.monitored_cluster.name}"
    severity>=ERROR
  FILTER

  metric_descriptor {
    metric_kind = "DELTA"
    value_type  = "INT64"
    unit        = "1"
    display_name = "GKE Container Errors"
  }
}
```

## Step 3: Alerting Policies

```hcl
# Alert when container error count exceeds 50 over five minutes
resource "google_monitoring_alert_policy" "high_error_rate" {
  display_name = "GKE High Container Error Log Volume"
  combiner     = "OR"

  conditions {
    display_name = "Container error log volume too high"

    condition_threshold {
      filter     = "metric.type=\"logging.googleapis.com/user/gke-container-errors\" AND resource.type=\"k8s_container\""
      duration   = "300s"
      comparison = "COMPARISON_GT"
      threshold_value = 50

      aggregations {
        alignment_period   = "300s"
        per_series_aligner = "ALIGN_DELTA"
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.email.name]
}

resource "google_monitoring_notification_channel" "email" {
  display_name = "Ops Email Alert"
  type         = "email"

  labels = {
    email_address = "ops@example.com"
  }
}
```

## Step 4: Dashboard for GKE Cluster

```hcl
resource "google_monitoring_dashboard" "gke_dashboard" {
  dashboard_json = jsonencode({
    displayName = "GKE Cluster Overview"
    gridLayout = {
      columns = "2"
      widgets = [
        {
          title = "Container CPU Requests"
          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "metric.type=\"kubernetes.io/container/cpu/request_cores\" AND resource.type=\"k8s_container\""
                }
              },
              plotType = "LINE"
            }]
          }
        }
      ]
    }
  })
}
```

## Summary

GKE logging and monitoring configured with OpenTofu provides comprehensive observability from the start. Managed Prometheus provides managed collection for Prometheus-compatible workload metrics after you configure PodMonitoring or ClusterPodMonitoring resources, Cloud Logging captures container logs, and log-based metrics bridge the gap between logs and alerting. This approach eliminates the need to self-manage Prometheus infrastructure or node-level logging agents.
