# How to Create GCP Instance Groups with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, GCP, Instance Groups, Auto Scaling, Infrastructure as Code, Google Cloud, Load Balancing

Description: Learn how to create GCP managed and unmanaged instance groups with Terraform for auto-scaling, load balancing, and high availability of compute workloads.

---

Instance groups in GCP are collections of VM instances that you manage as a single entity. They are the building blocks for load balancing and auto-scaling. When you put instances behind a load balancer, you point the backend service at an instance group. When you want your fleet to scale up and down based on traffic, you use a managed instance group with an autoscaler.

This guide covers both managed and unmanaged instance groups in Terraform, along with instance templates, autoscaling policies, and integration with load balancers.

## Managed vs Unmanaged Instance Groups

**Unmanaged Instance Groups**: A collection of existing VMs that you manually add and remove. No auto-scaling, no auto-healing, no rolling updates. Use them when you have pre-existing VMs that need to be behind a load balancer.

**Managed Instance Groups (MIGs)**: GCP creates and manages the VMs based on an instance template. Supports auto-scaling, auto-healing, rolling updates, and canary deployments. This is what you should use for production workloads.

## Creating an Instance Template

Managed instance groups need an instance template that defines how to create VMs:

```hcl
# versions.tf
terraform {
  required_version = ">= 1.5.0"

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

# Service account for the instances
resource "google_service_account" "web" {
  account_id   = "sa-web-server"
  display_name = "Web Server Service Account"
}

# Instance template defines the VM configuration
resource "google_compute_instance_template" "web" {
  name_prefix  = "web-template-"
  machine_type = "e2-standard-2"
  region       = "us-central1"

  # Use name_prefix with create_before_destroy for zero-downtime template updates
  lifecycle {
    create_before_destroy = true
  }

  disk {
    source_image = "debian-cloud/debian-12"
    auto_delete  = true
    boot         = true
    disk_size_gb = 20
    disk_type    = "pd-ssd"
  }

  network_interface {
    network    = google_compute_network.main.name
    subnetwork = google_compute_subnetwork.web.name

    # No external IP - traffic comes through the load balancer
    # access_config {} # Uncomment to add an external IP
  }

  # Metadata startup script
  metadata = {
    startup-script = <<-EOF
      #!/bin/bash
      apt-get update
      apt-get install -y nginx
      echo "Hello from $(hostname)" > /var/www/html/index.html
      systemctl start nginx
    EOF
  }

  # Service account and scopes
  service_account {
    email  = google_service_account.web.email
    scopes = ["cloud-platform"]
  }

  # Network tags for firewall rules
  tags = ["web", "http-server"]

  labels = {
    environment = "production"
    role        = "web-server"
  }

  # Shielded VM configuration
  shielded_instance_config {
    enable_secure_boot          = true
    enable_vtpm                 = true
    enable_integrity_monitoring = true
  }
}
```

Using `name_prefix` instead of `name` along with `create_before_destroy = true` ensures that when you update the template, Terraform creates the new template before destroying the old one. This is necessary because managed instance groups reference templates, and you cannot delete a template that is in use.

## Creating a Regional Managed Instance Group

Regional MIGs spread instances across multiple zones for high availability:

```hcl
# Regional managed instance group (spans multiple zones)
resource "google_compute_region_instance_group_manager" "web" {
  name               = "mig-web-us-central1"
  base_instance_name = "vm-web"
  region             = "us-central1"

  # Reference the instance template
  version {
    instance_template = google_compute_instance_template.web.self_link_unique
  }

  # Target size - number of instances (overridden by autoscaler if present)
  target_size = 3

  # Distribute instances across these zones
  distribution_policy_zones = [
    "us-central1-a",
    "us-central1-b",
    "us-central1-c",
  ]

  # Even distribution across zones
  distribution_policy_target_shape = "EVEN"

  # Named port for load balancer health checks
  named_port {
    name = "http"
    port = 80
  }

  named_port {
    name = "https"
    port = 443
  }

  # Auto-healing policy
  auto_healing_policies {
    health_check      = google_compute_health_check.web.id
    initial_delay_sec = 300  # Give instances 5 minutes to start before checking health
  }

  # Update policy for rolling updates
  update_policy {
    type                           = "PROACTIVE"
    minimal_action                 = "REPLACE"
    most_disruptive_allowed_action = "REPLACE"
    max_surge_fixed                = 3
    max_unavailable_fixed          = 0
    replacement_method             = "SUBSTITUTE"
  }
}
```

## Health Checks

Health checks determine whether instances are healthy and ready to receive traffic:

```hcl
# HTTP health check
resource "google_compute_health_check" "web" {
  name                = "hc-web-http"
  check_interval_sec  = 10
  timeout_sec         = 5
  healthy_threshold   = 2
  unhealthy_threshold = 3

  http_health_check {
    port         = 80
    request_path = "/healthz"
  }
}
```

## Autoscaling

Add an autoscaler to dynamically adjust the number of instances:

```hcl
# Autoscaler for the regional MIG
resource "google_compute_region_autoscaler" "web" {
  name   = "autoscaler-web-us-central1"
  region = "us-central1"
  target = google_compute_region_instance_group_manager.web.id

  autoscaling_policy {
    min_replicas    = 2
    max_replicas    = 20
    cooldown_period = 120  # Seconds to wait before collecting metrics from new instances

    # Scale based on CPU utilization
    cpu_utilization {
      target = 0.7  # Scale up when average CPU exceeds 70%
    }
  }
}
```

You can scale on multiple signals:

```hcl
resource "google_compute_region_autoscaler" "web_advanced" {
  name   = "autoscaler-web-advanced"
  region = "us-central1"
  target = google_compute_region_instance_group_manager.web.id

  autoscaling_policy {
    min_replicas    = 3
    max_replicas    = 50
    cooldown_period = 120

    # CPU-based scaling
    cpu_utilization {
      target = 0.7
    }

    # Load balancer utilization - scale based on backend usage
    load_balancing_utilization {
      target = 0.8
    }

    # Custom metric from Cloud Monitoring
    metric {
      name   = "compute.googleapis.com/instance/network/received_bytes_count"
      type   = "DELTA_PER_SECOND"
      target = 100000  # Scale up when receiving more than 100KB/s per instance
    }

    # Scale-in controls to prevent aggressive scaling down
    scale_in_control {
      max_scaled_in_replicas {
        fixed = 2  # Remove at most 2 instances at a time
      }
      time_window_sec = 600  # Over a 10-minute window
    }
  }
}
```

## Canary Deployments with Multiple Versions

Deploy a new version to a subset of instances before rolling it out fully:

```hcl
# New version of the instance template
resource "google_compute_instance_template" "web_v2" {
  name_prefix  = "web-template-v2-"
  machine_type = "e2-standard-2"
  region       = "us-central1"

  lifecycle {
    create_before_destroy = true
  }

  disk {
    source_image = "debian-cloud/debian-12"
    auto_delete  = true
    boot         = true
    disk_size_gb = 20
    disk_type    = "pd-ssd"
  }

  network_interface {
    network    = google_compute_network.main.name
    subnetwork = google_compute_subnetwork.web.name
  }

  metadata = {
    startup-script = <<-EOF
      #!/bin/bash
      apt-get update
      apt-get install -y nginx
      echo "Hello from v2 on $(hostname)" > /var/www/html/index.html
      systemctl start nginx
    EOF
  }

  service_account {
    email  = google_service_account.web.email
    scopes = ["cloud-platform"]
  }

  tags = ["web", "http-server"]
}

# MIG with canary deployment - 80% on v1, 20% on v2
resource "google_compute_region_instance_group_manager" "web_canary" {
  name               = "mig-web-canary"
  base_instance_name = "vm-web"
  region             = "us-central1"

  # Primary version - 80% of instances
  version {
    instance_template = google_compute_instance_template.web.self_link_unique
  }

  # Canary version - 20% of instances
  version {
    instance_template  = google_compute_instance_template.web_v2.self_link_unique
    target_size {
      fixed = 2  # Exactly 2 instances running v2
    }
  }

  target_size = 10

  named_port {
    name = "http"
    port = 80
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

## Unmanaged Instance Groups

For cases where you have existing VMs that need to be behind a load balancer:

```hcl
# Unmanaged instance group
resource "google_compute_instance_group" "legacy" {
  name    = "ig-legacy-web"
  zone    = "us-central1-a"
  network = google_compute_network.main.self_link

  # Add existing instances
  instances = [
    google_compute_instance.legacy_web_1.self_link,
    google_compute_instance.legacy_web_2.self_link,
  ]

  named_port {
    name = "http"
    port = 8080
  }
}
```

## Connecting to a Load Balancer

Instance groups serve as backends for GCP load balancers:

```hcl
# Backend service using the managed instance group
resource "google_compute_backend_service" "web" {
  name                  = "backend-web"
  protocol              = "HTTP"
  port_name             = "http"
  timeout_sec           = 30
  health_checks         = [google_compute_health_check.web.id]
  load_balancing_scheme = "EXTERNAL_MANAGED"

  backend {
    group           = google_compute_region_instance_group_manager.web.instance_group
    balancing_mode  = "UTILIZATION"
    max_utilization = 0.8
    capacity_scaler = 1.0
  }

  # Connection draining - wait for existing requests to complete
  connection_draining_timeout_sec = 300

  # Logging
  log_config {
    enable      = true
    sample_rate = 1.0
  }
}
```

## Zonal vs Regional MIG

Zonal MIGs are simpler but offer no zone-level redundancy:

```hcl
# Zonal managed instance group (single zone)
resource "google_compute_instance_group_manager" "web_zonal" {
  name               = "mig-web-us-central1-a"
  base_instance_name = "vm-web"
  zone               = "us-central1-a"

  version {
    instance_template = google_compute_instance_template.web.self_link_unique
  }

  target_size = 3

  named_port {
    name = "http"
    port = 80
  }

  auto_healing_policies {
    health_check      = google_compute_health_check.web.id
    initial_delay_sec = 300
  }
}
```

Use regional MIGs for production (zone redundancy) and zonal MIGs for development or cost-sensitive workloads.

## Outputs

```hcl
output "instance_group_url" {
  description = "URL of the managed instance group"
  value       = google_compute_region_instance_group_manager.web.instance_group
}

output "instance_template_id" {
  description = "ID of the current instance template"
  value       = google_compute_instance_template.web.id
}

output "autoscaler_id" {
  description = "ID of the autoscaler"
  value       = google_compute_region_autoscaler.web.id
}
```

## Best Practices

**Use regional MIGs for production.** A single zone failure should not take down your service. Regional MIGs distribute instances across zones automatically.

**Set conservative auto-healing delays.** Applications need time to start and become healthy. Set `initial_delay_sec` high enough that instances are not flagged as unhealthy before they finish starting.

**Use scale-in controls.** Without scale-in controls, the autoscaler can remove many instances at once during traffic drops, causing a capacity shortfall if traffic returns quickly.

**Use name_prefix with create_before_destroy.** This pattern ensures zero-downtime template updates. The new template is created before the old one is destroyed.

**Configure connection draining.** When instances are removed during scale-down or updates, connection draining gives existing requests time to complete before the instance is terminated.

**Test updates in non-production.** Rolling updates and canary deployments should be tested in staging before applying to production. A bad instance template can take down your entire service.

## Wrapping Up

GCP instance groups with Terraform provide a solid foundation for scalable, self-healing compute workloads. Managed instance groups handle the VM lifecycle - creating, health-checking, auto-scaling, and rolling updates - while Terraform manages the configuration as code. Start with a well-defined instance template, use regional MIGs for production availability, configure autoscaling based on your actual traffic patterns, and use canary deployments for safe rollouts. The combination gives you a production-grade compute platform that scales automatically and recovers from failures without manual intervention.
