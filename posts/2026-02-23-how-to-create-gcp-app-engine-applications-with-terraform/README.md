# How to Create GCP App Engine Applications with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, GCP, App Engine, Serverless, PaaS, Infrastructure as Code

Description: Learn how to create and configure Google Cloud App Engine applications and services using Terraform for managed application hosting on GCP.

---

App Engine is Google Cloud's original platform-as-a-service offering. It has been around since 2008, and while Cloud Run has taken over for many use cases, App Engine still has its place - especially for applications that need automatic scaling, traffic splitting, and managed SSL without any container knowledge. The Standard environment starts up in milliseconds and scales to zero, while the Flexible environment runs containers on managed VMs.

Managing App Engine with Terraform is a bit different from most GCP resources. The App Engine application itself is a singleton - you can only have one per project, and it cannot be deleted once created. The location is permanent too. This makes getting the Terraform configuration right the first time particularly important.

## Creating the App Engine Application

The `google_app_engine_application` resource creates the application. Remember, this is a one-way door.

```hcl
# Create the App Engine application
# WARNING: This cannot be deleted or moved once created
resource "google_app_engine_application" "app" {
  project     = var.project_id
  location_id = var.app_engine_location  # e.g., "us-central"

  # Optional: configure the serving status
  serving_status = "SERVING"  # or "USER_DISABLED" to stop serving

  # IAP configuration for identity-aware proxy
  iap {
    enabled              = true
    oauth2_client_id     = var.iap_client_id
    oauth2_client_secret = var.iap_client_secret
  }

  # Database type for Datastore
  database_type = "CLOUD_FIRESTORE"

  lifecycle {
    # Prevent accidental destruction since App Engine apps cannot be recreated
    prevent_destroy = true

    # Location cannot be changed after creation
    ignore_changes = [location_id]
  }
}
```

## App Engine Standard Service

Standard environment services are defined by their source code and an `app.yaml` configuration. In Terraform, you use `google_app_engine_standard_app_version`.

```hcl
# Deploy a Standard environment service
resource "google_app_engine_standard_app_version" "default_service" {
  project    = var.project_id
  service    = "default"
  version_id = "v1"
  runtime    = "python312"

  entrypoint {
    shell = "gunicorn -b :$PORT main:app"
  }

  deployment {
    zip {
      source_url = "https://storage.googleapis.com/${var.deployment_bucket}/app-${var.app_version}.zip"
    }
  }

  # Environment variables
  env_variables = {
    ENVIRONMENT = var.environment
    PROJECT_ID  = var.project_id
  }

  # Automatic scaling configuration
  automatic_scaling {
    max_concurrent_requests = 10
    min_idle_instances      = 0
    max_idle_instances      = 3
    min_pending_latency     = "1s"
    max_pending_latency     = "5s"

    standard_scheduler_settings {
      target_cpu_utilization        = 0.65
      target_throughput_utilization = 0.65
      min_instances                 = 0
      max_instances                 = 10
    }
  }

  # VPC access for connecting to private resources
  vpc_access_connector {
    name = var.vpc_connector_id
  }

  # Do not delete previous versions automatically
  noop_on_destroy = true
  delete_service_on_destroy = false

  depends_on = [google_app_engine_application.app]
}
```

## App Engine Flexible Service

The Flexible environment runs Docker containers on managed VMs. Use it when you need custom runtimes, longer request timeouts, or more CPU and memory.

```hcl
# Deploy a Flexible environment service
resource "google_app_engine_flexible_app_version" "api_service" {
  project    = var.project_id
  service    = "api"
  version_id = "v1"
  runtime    = "custom"

  deployment {
    container {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/app-images/api:${var.image_tag}"
    }
  }

  # Liveness and readiness checks
  liveness_check {
    path = "/health"
    check_interval = "30s"
    timeout        = "4s"
    failure_threshold = 3
    success_threshold = 1
  }

  readiness_check {
    path = "/ready"
    check_interval = "5s"
    timeout        = "4s"
    failure_threshold = 2
    success_threshold = 1
    app_start_timeout = "300s"
  }

  # Environment variables
  env_variables = {
    ENVIRONMENT = var.environment
    PROJECT_ID  = var.project_id
  }

  # Resource configuration
  resources {
    cpu       = 2
    memory_gb = 4
    disk_gb   = 20
  }

  # Automatic scaling
  automatic_scaling {
    min_total_instances = 1
    max_total_instances = 10
    cool_down_period    = "120s"

    cpu_utilization {
      target_utilization = 0.65
    }
  }

  # Network configuration
  network {
    name             = var.network_name
    subnetwork       = var.subnet_name
    forwarded_ports  = ["8080/tcp"]
  }

  noop_on_destroy = true
  delete_service_on_destroy = false
}
```

## Firewall Rules

App Engine has its own firewall that controls which IP addresses can access your application.

```hcl
# Default rule - deny all traffic
resource "google_app_engine_firewall_rule" "default_deny" {
  project      = var.project_id
  priority     = 2147483647  # Lowest priority (default rule)
  action       = "DENY"
  source_range = "*"
  description  = "Default deny all"
}

# Allow corporate network
resource "google_app_engine_firewall_rule" "allow_corporate" {
  project      = var.project_id
  priority     = 1000
  action       = "ALLOW"
  source_range = "203.0.113.0/24"
  description  = "Allow corporate network"
}

# Allow health checks from Google
resource "google_app_engine_firewall_rule" "allow_google_health" {
  project      = var.project_id
  priority     = 500
  action       = "ALLOW"
  source_range = "0.1.0.40/32"
  description  = "Allow Google health checks"
}

# Allow specific IP ranges
resource "google_app_engine_firewall_rule" "allow_partners" {
  project      = var.project_id
  priority     = 2000
  action       = "ALLOW"
  source_range = "198.51.100.0/24"
  description  = "Allow partner network access"
}
```

## Traffic Splitting

App Engine supports traffic splitting between versions, which is useful for canary deployments and A/B testing.

```hcl
# Split traffic between two versions
resource "google_app_engine_service_split_traffic" "default" {
  project = var.project_id
  service = "default"

  migrate_traffic = false

  split {
    # Split type: COOKIE, IP, or RANDOM
    shard_by = "COOKIE"

    allocations = {
      (google_app_engine_standard_app_version.default_service.version_id) = 0.9
      "v2" = 0.1  # 10% to the new version
    }
  }
}
```

## Domain Mapping

Map a custom domain to your App Engine application.

```hcl
# Map a custom domain to App Engine
resource "google_app_engine_domain_mapping" "custom_domain" {
  project     = var.project_id
  domain_name = "app.example.com"

  ssl_settings {
    ssl_management_type = "AUTOMATIC"
  }
}
```

## VPC Access Connector

App Engine needs a Serverless VPC Access connector to communicate with resources in your VPC.

```hcl
# Create a VPC connector for App Engine
resource "google_vpc_access_connector" "connector" {
  name          = "appengine-connector"
  project       = var.project_id
  region        = var.region
  network       = var.network_name
  ip_cidr_range = "10.8.0.0/28"

  min_instances = 2
  max_instances = 3
  machine_type  = "f1-micro"
}
```

## Dispatch Rules

Dispatch rules route requests to different App Engine services based on URL patterns.

```hcl
# Dispatch rules for routing to different services
resource "google_app_engine_application_url_dispatch_rules" "dispatch" {
  project = var.project_id

  dispatch_rules {
    domain  = "*"
    path    = "/api/*"
    service = "api"
  }

  dispatch_rules {
    domain  = "*"
    path    = "/admin/*"
    service = "admin"
  }

  dispatch_rules {
    domain  = "*"
    path    = "/*"
    service = "default"
  }
}
```

## Cron Jobs

App Engine has a built-in cron service for scheduling tasks.

```hcl
# Note: App Engine cron jobs are defined in cron.yaml and deployed with gcloud
# Terraform does not have a native resource for App Engine cron jobs
# However, you can use Cloud Scheduler as an alternative

resource "google_cloud_scheduler_job" "app_engine_task" {
  name      = "daily-cleanup"
  project   = var.project_id
  region    = var.region
  schedule  = "0 2 * * *"
  time_zone = "America/New_York"

  app_engine_http_target {
    http_method  = "POST"
    relative_uri = "/tasks/cleanup"

    app_engine_routing {
      service = "default"
      version = "v1"
    }
  }
}
```

## Practical Considerations

App Engine applications are tied to a project and cannot be moved or deleted. Choose the location carefully because it affects latency for your users and determines where your data is stored.

The Standard environment scales to zero and starts in milliseconds, but it has restrictions on the runtime environment. The Flexible environment runs real containers but has a minimum of one instance always running.

When using Terraform with App Engine versions, set `noop_on_destroy = true` on version resources. Without this, Terraform will try to delete the version when you update, which can cause downtime.

Traffic splitting requires at least two deployed versions. Deploy the new version first, then update the traffic split.

## Conclusion

App Engine remains a viable choice for applications that benefit from its built-in features - automatic SSL, traffic splitting, firewall rules, and dispatch routing. Terraform manages the application setup, firewall configuration, and domain mappings effectively. The version deployments are better handled through a CI/CD pipeline, but Terraform can bootstrap the initial deployment and manage the infrastructure around it.
