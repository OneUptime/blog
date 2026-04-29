# How to Configure GCP Managed Instance Groups with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, GCP, Managed Instance Group, MIG, Infrastructure as Code, Compute

Description: Learn how to configure GCP Managed Instance Groups with OpenTofu - including instance templates, autoscaling policies, health checks, and rolling updates for regional compute fleets.

## Introduction

GCP Managed Instance Groups (MIGs) run identical VMs from an instance template, with built-in autoscaling, autohealing, and rolling update support. OpenTofu manages the instance template, regional or zonal MIG, autoscaler, and health check - all as declarative code.

## Instance Template

```hcl
resource "google_compute_instance_template" "app" {
  name_prefix  = "${var.environment}-app-"
  machine_type = var.machine_type
  region       = var.region

  disk {
    source_image = "projects/debian-cloud/global/images/family/debian-11"
    auto_delete  = true
    boot         = true
    disk_size_gb = 30
    disk_type    = "pd-ssd"
  }

  network_interface {
    subnetwork = google_compute_subnetwork.app.id
    # No access_config = no external IP (private only)
  }

  service_account {
    email  = google_service_account.app.email
    scopes = ["cloud-platform"]
  }

  metadata = {
    enable-oslogin = "TRUE"
    startup-script = templatefile("${path.module}/startup.sh.tftpl", {
      environment = var.environment
      project_id  = var.project_id
    })
  }

  shielded_instance_config {
    enable_secure_boot          = true
    enable_vtpm                 = true
    enable_integrity_monitoring = true
  }

  tags = ["app-server", var.environment]

  lifecycle {
    create_before_destroy = true
  }
}
```

## Regional Managed Instance Group

```hcl
resource "google_compute_region_instance_group_manager" "app" {
  name               = "${var.environment}-app-mig"
  base_instance_name = "${var.environment}-app"
  region             = var.region

  version {
    instance_template = google_compute_instance_template.app.id
  }

  target_size = var.instance_count

  lifecycle {
    ignore_changes = [target_size] # Let the autoscaler manage steady-state size
  }

  named_port {
    name = "http"
    port = 8080
  }

  auto_healing_policies {
    health_check      = google_compute_health_check.app.id
    initial_delay_sec = 300  # Wait 5 minutes before autohealing
  }

  update_policy {
    type                         = "PROACTIVE"
    minimal_action               = "REPLACE"
    max_surge_fixed              = 3
    max_unavailable_fixed        = 0
    replacement_method           = "SUBSTITUTE"
  }
}
```

## Health Check

```hcl
resource "google_compute_health_check" "app" {
  name                = "${var.environment}-app-health-check"
  check_interval_sec  = 15
  timeout_sec         = 5
  healthy_threshold   = 2
  unhealthy_threshold = 3

  http_health_check {
    port         = 8080
    request_path = "/health"
  }
}
```

## Autoscaler

```hcl
resource "google_compute_region_autoscaler" "app" {
  name   = "${var.environment}-app-autoscaler"
  region = var.region
  target = google_compute_region_instance_group_manager.app.id

  autoscaling_policy {
    max_replicas    = 20
    min_replicas    = 2
    cooldown_period = 60

    cpu_utilization {
      target = 0.6  # 60% CPU target
    }

    # Scale on a per-group custom Cloud Monitoring metric
    metric {
      name                       = "custom.googleapis.com/app/queue_depth"
      single_instance_assignment = 10
      filter                     = "metric.labels.group_name = \"${var.environment}-app-mig\" AND resource.type = \"global\""
    }

    scale_in_control {
      max_scaled_in_replicas {
        fixed = 2  # Remove at most 2 instances per scale-in
      }
      time_window_sec = 600
    }
  }
}
```

## Load Balancer Backend Integration

```hcl
resource "google_compute_backend_service" "app" {
  name          = "${var.environment}-app-backend"
  protocol      = "HTTP"
  port_name     = "http"
  timeout_sec   = 30
  health_checks = [google_compute_health_check.app.id]

  backend {
    group           = google_compute_region_instance_group_manager.app.instance_group
    balancing_mode  = "UTILIZATION"
    capacity_scaler = 1.0
  }

  log_config {
    enable      = true
    sample_rate = 1.0
  }
}
```

## Canary Deployment with Two Versions

```hcl
resource "google_compute_instance_template" "app_canary" {
  name_prefix  = "${var.environment}-app-canary-"
  machine_type = var.machine_type
  region       = var.region

  disk {
    source_image = var.canary_image  # New version image
    auto_delete  = true
    boot         = true
  }

  network_interface {
    subnetwork = google_compute_subnetwork.app.id
  }

  service_account {
    email  = google_service_account.app.email
    scopes = ["cloud-platform"]
  }

  lifecycle {
    create_before_destroy = true
  }
}

# MIG with a canary instance rollout

resource "google_compute_region_instance_group_manager" "app_with_canary" {
  name               = "${var.environment}-app-mig-canary"
  base_instance_name = "${var.environment}-app"
  region             = var.region

  # Stable version - remaining instances
  version {
    name              = "stable"
    instance_template = google_compute_instance_template.app.id
  }

  # Canary version - 10% of instances
  version {
    name              = "canary"
    instance_template = google_compute_instance_template.app_canary.id
    # Percentage target sizes require a MIG with at least 10 instances.
    target_size {
      percent = 10
    }
  }
}
```

## Conclusion

GCP Managed Instance Groups with OpenTofu provide regional compute fleets with built-in autohealing and autoscaling. Use `auto_healing_policies` with a health check so GCP automatically replaces unhealthy instances. When you attach an autoscaler, let it own the steady-state size of the group instead of reconciling `target_size` on every apply. The `update_policy` with `max_surge_fixed` and `max_unavailable_fixed = 0` supports rolling replacements without reducing the intended group size during the rollout. Use two `version` blocks for canary deployments that roll out the new template to a percentage of instances before promoting it to 100%.
