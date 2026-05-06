# How to Create Bigtable Instances with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Bigtable, NoSQL, OpenTofu, Analytics, Time Series

Description: Learn how to create and configure Google Cloud Bigtable instances with OpenTofu for wide-column NoSQL storage at massive scale for time-series and analytics workloads.

## Overview

Cloud Bigtable is a petabyte-scale, fully managed NoSQL database designed for high-throughput analytical and operational workloads. It powers Google Search, Gmail, and Maps. OpenTofu manages Bigtable instances, clusters, and table configurations.

## Step 1: Create a Bigtable Instance

```hcl
# main.tf - Production Bigtable instance with SSD storage

resource "google_bigtable_instance" "production" {
  name = "my-bigtable-instance"

  # Cluster for the instance (can have multiple for replication)
  cluster {
    cluster_id   = "us-central1-cluster"
    zone         = "us-central1-a"
    num_nodes    = 3  # Example fixed-size cluster size
    storage_type = "SSD"  # HDD is better suited to less latency-sensitive workloads
  }

  # DEVELOPMENT is deprecated; PRODUCTION is the default
  # instance_type = "DEVELOPMENT"

  deletion_protection = true

  labels = {
    environment = "production"
    team        = "data-platform"
  }
}
```

## Step 2: Multi-Cluster Replication for HA

```hcl
# Instance with multi-cluster replication for high availability
resource "google_bigtable_instance" "replicated" {
  name = "replicated-bigtable"

  # Primary cluster
  cluster {
    cluster_id   = "primary-cluster"
    zone         = "us-central1-a"
    num_nodes    = 3
    storage_type = "SSD"
  }

  # Replica cluster in different zone
  cluster {
    cluster_id   = "replica-cluster"
    zone         = "us-central1-b"
    num_nodes    = 3
    storage_type = "SSD"
  }
}
```

## Step 3: Create Tables

```hcl
# Create a table with column families
resource "google_bigtable_table" "metrics_table" {
  name          = "application-metrics"
  instance_name = google_bigtable_instance.production.name

  # Column family for time-series metrics
  column_family {
    family = "metrics"
  }

  # Column family for metadata
  column_family {
    family = "meta"
  }
}

# GC policy for automatic data expiry on the metrics family
resource "google_bigtable_gc_policy" "metrics_gc" {
  instance_name   = google_bigtable_instance.production.name
  table           = google_bigtable_table.metrics_table.name
  column_family   = "metrics"
  deletion_policy = "ABANDON"
  mode            = "INTERSECTION"

  max_age {
    duration = "168h"  # 7 days retention
  }

  max_version {
    number = 1  # Keep only the latest version of each cell
  }
}

# GC policy for the metadata family
resource "google_bigtable_gc_policy" "meta_gc" {
  instance_name   = google_bigtable_instance.production.name
  table           = google_bigtable_table.metrics_table.name
  column_family   = "meta"
  deletion_policy = "ABANDON"

  max_age {
    duration = "720h"  # 30 days retention
  }
}
```

## Step 4: IAM Access Control

```hcl
# Grant an application service account access to Bigtable
resource "google_bigtable_instance_iam_member" "app_reader" {
  project  = var.project_id
  instance = google_bigtable_instance.production.name
  role     = "roles/bigtable.reader"
  member   = "serviceAccount:${google_service_account.app_sa.email}"
}

resource "google_bigtable_instance_iam_member" "app_writer" {
  project  = var.project_id
  instance = google_bigtable_instance.production.name
  role     = "roles/bigtable.user"
  member   = "serviceAccount:${google_service_account.writer_sa.email}"
}
```

## Summary

Cloud Bigtable instances with OpenTofu provide a foundation for high-throughput time-series and analytical workloads. Multi-cluster replication can provide geographic distribution and HA. GC policies on column families automatically expire old data, keeping storage costs manageable as data volumes grow.
