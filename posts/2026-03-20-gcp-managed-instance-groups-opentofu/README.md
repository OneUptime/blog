# How to Create GCP Managed Instance Groups with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Compute Engine, Managed Instance Group, OpenTofu, Autoscaling, Infrastructure

Description: Learn how to create GCP Managed Instance Groups (MIGs) with OpenTofu for scalable, self-healing VM fleets with load balancing and rolling update support.

## Overview

GCP Managed Instance Groups (MIGs) create and manage identical VM instances from an instance template. They support autoscaling, auto-healing, and rolling updates. MIGs can be regional (multi-zone) or zonal for different availability requirements.

## Step 1: Create a Zonal MIG

```hcl
# main.tf - Zonal managed instance group

resource "google_compute_instance_group_manager" "web_mig" {
  name               = "web-server-mig"
  zone               = "us-central1-a"
  base_instance_name = "web-server"
  target_size        = 3

  version {
    name              = "v1"
    instance_template = google_compute_instance_template.web_template.self_link
  }

  # Named port for load balancer backend services
  named_port {
    name = "http"
    port = 80
  }

  # Auto-healing policy
  auto_healing_policies {
    health_check      = google_compute_health_check.http_health.id
    initial_delay_sec = 300  # Wait 300s before auto-healing new instances
  }
}
```

## Step 2: HTTP Health Check

```hcl
# Health check for auto-healing
resource "google_compute_health_check" "http_health" {
  name                = "web-http-health-check"
  check_interval_sec  = 10
  timeout_sec         = 5
  healthy_threshold   = 2
  unhealthy_threshold = 3

  http_health_check {
    port         = 80
    request_path = "/health"
  }
}
```

## Step 3: Regional MIG for High Availability

```hcl
# Regional MIG spreads instances across multiple zones
resource "google_compute_region_instance_group_manager" "regional_web_mig" {
  name               = "regional-web-mig"
  region             = "us-central1"
  base_instance_name = "web-server"
  target_size        = 6  # Distributed across zones automatically

  version {
    name              = "v1"
    instance_template = google_compute_instance_template.web_template.self_link
  }

  named_port {
    name = "http"
    port = 80
  }

  auto_healing_policies {
    health_check      = google_compute_health_check.http_health.id
    initial_delay_sec = 300
  }

  # Distribution policy for zone selection
  distribution_policy_zones = [
    "us-central1-a",
    "us-central1-b",
    "us-central1-c",
  ]
}
```

## Step 4: Rolling Update Configuration

```hcl
# MIG with rolling update policy for controlled deployments
resource "google_compute_region_instance_group_manager" "rolling_update_mig" {
  name               = "rolling-update-mig"
  region             = "us-central1"
  base_instance_name = "app-server"
  target_size        = 3

  version {
    name              = "v2"
    instance_template = google_compute_instance_template.web_template.self_link
  }

  update_policy {
    type                           = "PROACTIVE"       # Start update immediately
    minimal_action                 = "REPLACE"         # Replace instances on update
    max_surge_fixed                = 3                 # Allow 3 extra instances during update
    max_unavailable_fixed          = 1                 # Allow one instance to be unavailable during update
    replacement_method             = "SUBSTITUTE"
  }
}
```

## Step 5: Outputs

```hcl
output "mig_instance_group" {
  value       = google_compute_instance_group_manager.web_mig.instance_group
  description = "Instance group URL for backend service configuration"
}
```

## Summary

GCP Managed Instance Groups with OpenTofu provide scalable, self-healing VM fleets. Regional MIGs offer better availability by distributing instances across zones. Rolling update policies help reduce deployment disruption by controlling the pace of instance replacement during template updates.
