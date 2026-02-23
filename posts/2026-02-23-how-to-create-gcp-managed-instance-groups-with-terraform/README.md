# How to Create GCP Managed Instance Groups with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, GCP, Compute Engine, Managed Instance Groups, Infrastructure as Code, Auto Scaling

Description: Learn how to create and configure GCP Managed Instance Groups using Terraform, including auto-scaling, health checks, rolling updates, and named ports for load balancing.

---

Managed Instance Groups (MIGs) are one of the most powerful features in Google Cloud's Compute Engine. They let you run multiple identical VM instances as a single unit, with built-in support for auto-scaling, auto-healing, rolling updates, and load balancing integration. If you are running production workloads on GCP, chances are you will need MIGs at some point.

In this post, we will walk through creating Managed Instance Groups with Terraform from scratch. We will cover both zonal and regional MIGs, auto-scaling policies, health checks, and rolling update strategies.

## Prerequisites

Before you begin, make sure you have:

- A GCP project with billing enabled
- Terraform 1.0 or later installed
- The `gcloud` CLI authenticated with appropriate permissions
- An instance template ready (or we will create one inline)

## Setting Up the Provider

First, configure the Google Cloud provider in your Terraform configuration:

```hcl
# Configure the Google Cloud provider
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

# Define variables
variable "project_id" {
  description = "The GCP project ID"
  type        = string
}

variable "region" {
  description = "The GCP region for resources"
  type        = string
  default     = "us-central1"
}

variable "zone" {
  description = "The GCP zone for zonal resources"
  type        = string
  default     = "us-central1-a"
}
```

## Creating an Instance Template

Before creating a MIG, you need an instance template. This defines the configuration for every VM in the group:

```hcl
# Create an instance template for the MIG
resource "google_compute_instance_template" "web_server" {
  name_prefix  = "web-server-"
  machine_type = "e2-medium"
  region       = var.region

  # Use name_prefix with lifecycle create_before_destroy
  # so Terraform can create a new template before destroying the old one
  lifecycle {
    create_before_destroy = true
  }

  disk {
    source_image = "debian-cloud/debian-12"
    auto_delete  = true
    boot         = true
    disk_size_gb = 20
    disk_type    = "pd-standard"
  }

  network_interface {
    network    = "default"
    subnetwork = "default"

    # Remove access_config to keep instances private (no external IP)
  }

  # Startup script to install and start a web server
  metadata = {
    startup-script = <<-EOF
      #!/bin/bash
      apt-get update
      apt-get install -y nginx
      echo "Hello from $(hostname)" > /var/www/html/index.html
      systemctl start nginx
    EOF
  }

  # Apply a service account with minimal permissions
  service_account {
    scopes = ["cloud-platform"]
  }

  tags = ["http-server", "web"]
}
```

## Creating a Zonal Managed Instance Group

A zonal MIG runs all its instances in a single zone. This is simpler to set up but does not provide zone-level redundancy:

```hcl
# Create a zonal managed instance group
resource "google_compute_instance_group_manager" "web_mig" {
  name               = "web-server-mig"
  base_instance_name = "web"
  zone               = var.zone
  target_size        = 3

  version {
    instance_template = google_compute_instance_template.web_server.id
  }

  # Named port for load balancer integration
  named_port {
    name = "http"
    port = 80
  }

  # Auto-healing policy using a health check
  auto_healing_policies {
    health_check      = google_compute_health_check.web_health.id
    initial_delay_sec = 300
  }

  # Rolling update configuration
  update_policy {
    type                           = "PROACTIVE"
    minimal_action                 = "REPLACE"
    most_disruptive_allowed_action = "REPLACE"
    max_surge_fixed                = 3
    max_unavailable_fixed          = 0
  }
}
```

The `update_policy` block controls how updates are rolled out. Setting `type` to `PROACTIVE` means Terraform will immediately start replacing instances when the template changes. The `max_surge_fixed` and `max_unavailable_fixed` settings ensure zero-downtime deployments by creating new instances before removing old ones.

## Creating a Regional Managed Instance Group

For production workloads, regional MIGs are the way to go. They spread instances across multiple zones in a region, giving you zone-level fault tolerance:

```hcl
# Create a regional managed instance group for high availability
resource "google_compute_region_instance_group_manager" "web_regional_mig" {
  name               = "web-server-regional-mig"
  base_instance_name = "web-regional"
  region             = var.region
  target_size        = 6

  # Distribute instances across these zones
  distribution_policy_zones = [
    "us-central1-a",
    "us-central1-b",
    "us-central1-c",
  ]

  # Even distribution across zones
  distribution_policy_target_shape = "EVEN"

  version {
    instance_template = google_compute_instance_template.web_server.id
  }

  named_port {
    name = "http"
    port = 80
  }

  auto_healing_policies {
    health_check      = google_compute_health_check.web_health.id
    initial_delay_sec = 300
  }

  update_policy {
    type                           = "PROACTIVE"
    minimal_action                 = "REPLACE"
    most_disruptive_allowed_action = "REPLACE"
    max_surge_fixed                = 3
    max_unavailable_fixed          = 0
  }
}
```

## Adding a Health Check

Health checks are critical for auto-healing. If an instance fails the health check, the MIG automatically recreates it:

```hcl
# Health check for auto-healing and load balancing
resource "google_compute_health_check" "web_health" {
  name                = "web-server-health-check"
  check_interval_sec  = 10
  timeout_sec         = 5
  healthy_threshold   = 2
  unhealthy_threshold = 3

  http_health_check {
    port         = 80
    request_path = "/"
  }
}
```

## Configuring Auto-scaling

Auto-scaling is where MIGs really shine. You can scale based on CPU utilization, load balancing capacity, custom metrics, or schedules:

```hcl
# Autoscaler for the zonal MIG
resource "google_compute_autoscaler" "web_autoscaler" {
  name   = "web-server-autoscaler"
  zone   = var.zone
  target = google_compute_instance_group_manager.web_mig.id

  autoscaling_policy {
    min_replicas    = 2
    max_replicas    = 10
    cooldown_period = 60

    # Scale based on CPU utilization
    cpu_utilization {
      target = 0.6
    }
  }
}

# Autoscaler for the regional MIG
resource "google_compute_region_autoscaler" "web_regional_autoscaler" {
  name   = "web-regional-autoscaler"
  region = var.region
  target = google_compute_region_instance_group_manager.web_regional_mig.id

  autoscaling_policy {
    min_replicas    = 3
    max_replicas    = 15
    cooldown_period = 60

    # Scale based on multiple signals
    cpu_utilization {
      target = 0.6
    }

    # Scale-in controls to prevent aggressive scale-down
    scale_in_control {
      max_scaled_in_replicas {
        fixed = 2
      }
      time_window_sec = 600
    }
  }
}
```

The `scale_in_control` block prevents the autoscaler from removing too many instances too quickly. In this example, it will remove at most 2 instances within any 10-minute window.

## Canary Deployments with Multiple Versions

MIGs support canary deployments by running two versions of an instance template simultaneously:

```hcl
# MIG with canary deployment - 80% stable, 20% canary
resource "google_compute_instance_group_manager" "web_canary_mig" {
  name               = "web-canary-mig"
  base_instance_name = "web-canary"
  zone               = var.zone
  target_size        = 10

  # Stable version gets 80% of instances
  version {
    instance_template = google_compute_instance_template.web_server.id
    name              = "stable"

    target_size {
      fixed = 8
    }
  }

  # Canary version gets 20% of instances
  version {
    instance_template = google_compute_instance_template.web_server_canary.id
    name              = "canary"

    target_size {
      fixed = 2
    }
  }

  named_port {
    name = "http"
    port = 80
  }

  update_policy {
    type                           = "PROACTIVE"
    minimal_action                 = "REPLACE"
    most_disruptive_allowed_action = "REPLACE"
    max_surge_fixed                = 2
    max_unavailable_fixed          = 0
  }
}
```

## Outputs

Export useful information about your MIG:

```hcl
# Output the instance group URL for load balancer backend
output "instance_group" {
  value = google_compute_instance_group_manager.web_mig.instance_group
}

output "regional_instance_group" {
  value = google_compute_region_instance_group_manager.web_regional_mig.instance_group
}

output "autoscaler_status" {
  value = google_compute_autoscaler.web_autoscaler.id
}
```

## Applying the Configuration

Run the standard Terraform workflow:

```bash
# Initialize Terraform
terraform init

# Preview the changes
terraform plan

# Apply the configuration
terraform apply
```

## Tips and Best Practices

**Use `name_prefix` instead of `name` for instance templates.** Combined with `create_before_destroy`, this lets Terraform create a new template before destroying the old one, which is required for zero-downtime updates.

**Set appropriate `initial_delay_sec` for auto-healing.** If your application takes 5 minutes to boot, set the initial delay to at least 300 seconds. Otherwise, the MIG will keep killing and recreating instances that have not finished starting.

**Use regional MIGs for production.** The extra zone redundancy is worth the slightly more complex configuration. If a zone goes down, your regional MIG keeps running.

**Start with conservative autoscaling limits.** Set `min_replicas` to handle your baseline traffic and increase `max_replicas` gradually as you understand your scaling patterns.

**Use `max_unavailable_fixed = 0` for zero-downtime updates.** Combined with a reasonable `max_surge_fixed`, this ensures new instances are healthy before old ones are removed.

## Conclusion

Managed Instance Groups are a fundamental building block for running scalable, resilient workloads on GCP. With Terraform, you can define your entire MIG configuration as code, making it reproducible and version-controlled. We covered zonal and regional MIGs, auto-scaling, auto-healing, rolling updates, and canary deployments.

For related topics, check out our posts on [creating instance templates with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-gcp-instance-templates-with-terraform/view) and [configuring internal load balancers](https://oneuptime.com/blog/post/2026-02-23-how-to-create-gcp-internal-load-balancers-with-terraform/view).
