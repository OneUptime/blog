# How to Set Up GCP Serverless VPC Access Connectors with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Serverless, VPC Access, OpenTofu, Cloud Run, Cloud Function

Description: Learn how to create GCP Serverless VPC Access Connectors with OpenTofu to allow Cloud Run and Cloud Functions to communicate with resources in a VPC.

## Overview

Serverless VPC Access Connectors enable Cloud Run services and Cloud Functions to connect to resources in a VPC (like Cloud SQL, Memorystore, and private services) using internal IP addresses. OpenTofu manages connector creation and serverless service configuration.

## Step 1: Create a VPC Access Connector

```hcl
# main.tf - VPC Access Connector for serverless services

resource "google_vpc_access_connector" "serverless_connector" {
  name          = "serverless-vpc-connector"
  region        = "us-central1"
  network       = google_compute_network.vpc.name

  # Connector requires its own /28 CIDR not overlapping with any in-use range
  ip_cidr_range = "10.8.0.0/28"

  # Machine type for connector instances
  machine_type  = "e2-micro"

  # Min/max instances for throughput scaling
  min_instances = 2
  max_instances = 10
}
```

## Step 2: Subnet-Based Connector (Alternative)

```hcl
# Create a dedicated subnet for the connector
resource "google_compute_subnetwork" "connector_subnet" {
  name          = "serverless-connector-subnet"
  network       = google_compute_network.vpc.self_link
  region        = "us-central1"
  ip_cidr_range = "10.8.0.0/28"
}

# Connector using a dedicated subnet instead of CIDR range
resource "google_vpc_access_connector" "subnet_connector" {
  name    = "subnet-vpc-connector"
  region  = "us-central1"
  network = google_compute_network.vpc.name

  subnet {
    name = google_compute_subnetwork.connector_subnet.name
  }

  machine_type  = "e2-standard-4"
  min_instances = 2
  max_instances = 5
}
```

## Step 3: Configure Cloud Run to Use the Connector

```hcl
# Cloud Run service with VPC connector for private resource access
resource "google_cloud_run_v2_service" "api_service" {
  name     = "my-api-service"
  location = "us-central1"

  template {
    containers {
      image = "gcr.io/${var.project_id}/my-api:latest"

      env {
        name  = "DB_HOST"
        value = google_sql_database_instance.db.private_ip_address
      }
    }

    # Connect this Cloud Run service to the VPC connector
    vpc_access {
      connector = google_vpc_access_connector.serverless_connector.id
      # "ALL_TRAFFIC" routes all traffic through VPC
      # "PRIVATE_RANGES_ONLY" routes private/internal IP ranges through VPC
      egress = "PRIVATE_RANGES_ONLY"
    }

    scaling {
      min_instance_count = 1
      max_instance_count = 100
    }
  }
}
```

## Step 4: Cloud Functions with VPC Connector

```hcl
# Cloud Function using VPC connector
resource "google_cloudfunctions2_function" "data_processor" {
  name     = "data-processor-function"
  location = "us-central1"

  build_config {
    runtime     = "nodejs22"
    entry_point = "processData"
    source {
      storage_source {
        bucket = google_storage_bucket.function_source.name
        object = google_storage_bucket_object.function_zip.name
      }
    }
  }

  service_config {
    # Attach VPC connector for private resource access
    vpc_connector                  = google_vpc_access_connector.serverless_connector.id
    vpc_connector_egress_settings  = "PRIVATE_RANGES_ONLY"
    ingress_settings               = "ALLOW_ALL"
    min_instance_count             = 0
    max_instance_count             = 50
  }
}
```

## Summary

GCP Serverless VPC Access Connectors with OpenTofu bridge the gap between serverless compute and private VPC resources. By attaching a connector to Cloud Run or Cloud Functions, services can access Cloud SQL, Memorystore Redis, and internal APIs without exposing those resources to the internet or using complex VPN configurations.
