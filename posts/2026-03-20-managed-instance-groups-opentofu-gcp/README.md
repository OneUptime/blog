# How to Use Managed Instance Groups with OpenTofu on GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, GCP, Managed Instance Group, Auto Scaling, Infrastructure as Code

Description: Learn how to create and manage Google Cloud Platform Managed Instance Groups (MIGs) with autoscaling and load balancing using OpenTofu.

## Introduction

Google Cloud Managed Instance Groups (MIGs) allow you to run identical VM instances as a managed group with autoscaling, auto-healing, and rolling update capabilities. Using OpenTofu to provision MIGs ensures your compute layer is reproducible and consistently configured.

## Prerequisites

- OpenTofu installed (v1.6+)
- Google Cloud SDK installed and configured
- A GCP project with Compute Engine API enabled

## Provider Configuration

```hcl
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
```

## Instance Template

```hcl
resource "google_compute_instance_template" "app" {
  name_prefix  = "app-template-"
  machine_type = "e2-standard-2"
  region       = var.region

  disk {
    source_image = "debian-cloud/debian-12"
    auto_delete  = true
    boot         = true
    disk_size_gb = 30
    disk_type    = "pd-ssd"
  }

  network_interface {
    network    = google_compute_network.vpc.id
    subnetwork = google_compute_subnetwork.private.id
  }

  metadata_startup_script = <<-EOF
    #!/bin/bash
    apt-get update
    apt-get install -y nginx
    systemctl enable nginx
    systemctl start nginx
    echo "Instance: $(hostname)" > /var/www/html/index.html
    echo "ok" > /var/www/html/health
  EOF

  service_account {
    email  = google_service_account.app.email
    scopes = ["cloud-platform"]
  }

  tags = ["app-server", "http-server"]

  lifecycle {
    create_before_destroy = true
  }
}
```

## Managed Instance Group

```hcl
resource "google_compute_region_instance_group_manager" "app" {
  name               = "app-mig"
  region             = var.region
  base_instance_name = "app"

  version {
    instance_template = google_compute_instance_template.app.id
    name              = "primary"
  }

  named_port {
    name = "http"
    port = 80
  }

  auto_healing_policies {
    health_check      = google_compute_health_check.app.id
    initial_delay_sec = 300
  }

  update_policy {
    type                    = "PROACTIVE"
    minimal_action          = "REPLACE"
    max_surge_fixed         = 3
    max_unavailable_fixed   = 0
  }
}
```

## Autoscaling Policy

```hcl
resource "google_compute_region_autoscaler" "app" {
  name   = "app-autoscaler"
  region = var.region
  target = google_compute_region_instance_group_manager.app.id

  autoscaling_policy {
    min_replicas    = 2
    max_replicas    = 10
    cooldown_period = 60

    cpu_utilization {
      target = 0.6
    }

    load_balancing_utilization {
      target = 0.8
    }
  }
}
```

## Health Check

```hcl
resource "google_compute_health_check" "app" {
  name                = "app-health-check"
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

## Load Balancer Integration

```hcl
resource "google_compute_backend_service" "app" {
  name                  = "app-backend"
  protocol              = "HTTP"
  port_name             = "http"
  load_balancing_scheme = "EXTERNAL"
  timeout_sec           = 30

  backend {
    group           = google_compute_region_instance_group_manager.app.instance_group
    balancing_mode  = "UTILIZATION"
    max_utilization = 0.8
  }

  health_checks = [google_compute_health_check.app.id]
}
```

## Rolling Updates

To deploy a new version without downtime, create a new instance template and update the MIG:

```hcl
resource "google_compute_instance_template" "app_v2" {
  name_prefix  = "app-template-v2-"
  # ... updated configuration ...
  lifecycle {
    create_before_destroy = true
  }
}

# Update the MIG to use the new template

resource "google_compute_region_instance_group_manager" "app" {
  version {
    instance_template = google_compute_instance_template.app_v2.id
    name              = "v2"
  }
  # ... rest of config ...
}
```

## Best Practices

- Always use `lifecycle { create_before_destroy = true }` on instance templates.
- Set `max_unavailable_fixed = 0` in update policies for zero-downtime deployments.
- Configure auto-healing with appropriate `initial_delay_sec` to allow startup time.
- Use regional MIGs for higher availability across multiple zones.
- Combine CPU and load balancing utilization autoscaling metrics for balanced performance.

## Conclusion

OpenTofu enables declarative management of GCP Managed Instance Groups with autoscaling, auto-healing, and rolling updates. This ensures your compute infrastructure is elastic, resilient, and consistently defined as code.
