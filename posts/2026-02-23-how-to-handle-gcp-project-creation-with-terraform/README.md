# How to Handle GCP Project Creation with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, GCP, Project Management, Resource Hierarchy, Infrastructure as Code

Description: Learn how to create and manage Google Cloud projects with Terraform including billing, APIs, default resources, and project factory patterns.

---

Every GCP resource lives inside a project. Projects are the fundamental unit of organization, billing, and access control. Creating projects through the console works for one or two, but when you need dozens or hundreds - one per team, one per environment, one per microservice - you need automation. Terraform handles project creation, billing association, API enablement, and default resource setup in a single, repeatable workflow.

This guide covers creating GCP projects with Terraform from scratch, including the tricky parts like billing accounts, default networks, and the project factory pattern for managing many projects at scale.

## Prerequisites

Creating projects requires specific permissions. Your Terraform service account needs:

- `roles/resourcemanager.projectCreator` on the organization or folder
- `roles/billing.user` on the billing account
- `roles/resourcemanager.folderAdmin` if you are creating projects inside folders

## Creating a Basic Project

```hcl
# Create a new GCP project
resource "google_project" "project" {
  name       = "My Application - ${var.environment}"
  project_id = "my-app-${var.environment}-${random_id.project_suffix.hex}"
  org_id     = var.org_id

  # Associate with a billing account
  billing_account = var.billing_account_id

  # Auto-create default network? Usually you want to disable this
  auto_create_network = false

  labels = {
    environment = var.environment
    team        = var.team_name
    managed_by  = "terraform"
  }
}

# Project IDs must be globally unique, so add a random suffix
resource "random_id" "project_suffix" {
  byte_length = 2
}
```

## Creating a Project in a Folder

Most organizations use folders to group projects by team, business unit, or environment.

```hcl
# Create a project inside a folder
resource "google_project" "team_project" {
  name       = "${var.team_name} - ${var.environment}"
  project_id = "${var.team_name}-${var.environment}-${random_id.project_suffix.hex}"

  # Use folder_id instead of org_id
  folder_id = var.folder_id

  billing_account     = var.billing_account_id
  auto_create_network = false

  labels = {
    environment = var.environment
    team        = var.team_name
    cost_center = var.cost_center
  }
}
```

## Enabling APIs

A fresh project has almost no APIs enabled. You need to enable the ones your resources will use.

```hcl
# Enable commonly needed APIs
locals {
  required_apis = [
    "compute.googleapis.com",
    "container.googleapis.com",
    "iam.googleapis.com",
    "logging.googleapis.com",
    "monitoring.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    "serviceusage.googleapis.com",
    "storage.googleapis.com",
    "secretmanager.googleapis.com",
    "cloudbuild.googleapis.com",
  ]
}

resource "google_project_service" "apis" {
  for_each = toset(local.required_apis)

  project = google_project.project.project_id
  service = each.value

  # Do not disable API if resource is removed
  disable_on_destroy = false

  # Wait for the project to be fully created
  depends_on = [google_project.project]
}
```

## Dealing with the Default Network

By default, GCP creates a default VPC network with subnets in every region and permissive firewall rules. This is a security concern. Set `auto_create_network = false` and create your own network.

```hcl
# The project already has auto_create_network = false
# Now create a proper VPC
resource "google_compute_network" "vpc" {
  name                    = "${var.team_name}-vpc"
  project                 = google_project.project.project_id
  auto_create_subnetworks = false
  routing_mode            = "REGIONAL"

  depends_on = [google_project_service.apis["compute.googleapis.com"]]
}

resource "google_compute_subnetwork" "subnet" {
  name          = "${var.team_name}-subnet-${var.region}"
  project       = google_project.project.project_id
  region        = var.region
  network       = google_compute_network.vpc.id
  ip_cidr_range = var.subnet_cidr

  private_ip_google_access = true

  log_config {
    aggregation_interval = "INTERVAL_5_SEC"
    flow_sampling        = 0.5
    metadata             = "INCLUDE_ALL_METADATA"
  }
}
```

## Setting Up Default IAM

Every new project should have a baseline IAM configuration.

```hcl
# Remove the default editor role from the default compute service account
# The default SA with editor role is a common security issue
resource "google_project_iam_member" "remove_default_sa_editor" {
  project = google_project.project.project_id
  role    = "roles/editor"
  member  = "serviceAccount:${google_project.project.number}-compute@developer.gserviceaccount.com"

  # This is a removal - use google_project_iam_binding or policy to remove
}

# Grant the team group access to the project
resource "google_project_iam_member" "team_access" {
  project = google_project.project.project_id
  role    = "roles/editor"
  member  = "group:${var.team_email}"
}

# Grant the security team viewer access
resource "google_project_iam_member" "security_viewer" {
  project = google_project.project.project_id
  role    = "roles/viewer"
  member  = "group:security-team@${var.org_domain}"
}

# Grant the billing admins access
resource "google_project_iam_member" "billing_viewer" {
  project = google_project.project.project_id
  role    = "roles/billing.viewer"
  member  = "group:billing-admins@${var.org_domain}"
}
```

## Budget Alerts

Set up billing budgets to avoid surprise costs.

```hcl
# Create a billing budget for the project
resource "google_billing_budget" "project_budget" {
  billing_account = var.billing_account_id
  display_name    = "Budget for ${google_project.project.name}"

  budget_filter {
    projects = ["projects/${google_project.project.number}"]
  }

  amount {
    specified_amount {
      currency_code = "USD"
      units         = var.monthly_budget
    }
  }

  # Alert thresholds
  threshold_rules {
    threshold_percent = 0.5
    spend_basis       = "CURRENT_SPEND"
  }

  threshold_rules {
    threshold_percent = 0.8
    spend_basis       = "CURRENT_SPEND"
  }

  threshold_rules {
    threshold_percent = 1.0
    spend_basis       = "CURRENT_SPEND"
  }

  # Send alerts to Pub/Sub for automation
  all_updates_rule {
    pubsub_topic = var.budget_alerts_topic
    monitoring_notification_channels = var.notification_channels
  }
}
```

## The Project Factory Pattern

When you need to create many similar projects, use a module to standardize the configuration.

```hcl
# modules/project-factory/main.tf
variable "project_name" { type = string }
variable "folder_id" { type = string }
variable "billing_account_id" { type = string }
variable "team_email" { type = string }
variable "environment" { type = string }
variable "region" { type = string }
variable "apis" { type = list(string) }
variable "subnet_cidr" { type = string }
variable "monthly_budget" { type = number }

resource "random_id" "suffix" {
  byte_length = 2
}

resource "google_project" "project" {
  name                = "${var.project_name} - ${var.environment}"
  project_id          = "${var.project_name}-${var.environment}-${random_id.suffix.hex}"
  folder_id           = var.folder_id
  billing_account     = var.billing_account_id
  auto_create_network = false

  labels = {
    environment = var.environment
    managed_by  = "terraform"
  }
}

resource "google_project_service" "apis" {
  for_each = toset(var.apis)

  project            = google_project.project.project_id
  service            = each.value
  disable_on_destroy = false
}

# ... VPC, IAM, budget resources ...

output "project_id" {
  value = google_project.project.project_id
}

output "project_number" {
  value = google_project.project.number
}
```

Then use the module:

```hcl
# Create projects for multiple teams
module "team_alpha_dev" {
  source = "./modules/project-factory"

  project_name       = "alpha"
  folder_id          = var.dev_folder_id
  billing_account_id = var.billing_account_id
  team_email         = "team-alpha@example.com"
  environment        = "dev"
  region             = "us-central1"
  subnet_cidr        = "10.1.0.0/24"
  monthly_budget     = 500

  apis = [
    "compute.googleapis.com",
    "container.googleapis.com",
    "iam.googleapis.com",
    "logging.googleapis.com",
    "monitoring.googleapis.com",
  ]
}

module "team_alpha_prod" {
  source = "./modules/project-factory"

  project_name       = "alpha"
  folder_id          = var.prod_folder_id
  billing_account_id = var.billing_account_id
  team_email         = "team-alpha@example.com"
  environment        = "prod"
  region             = "us-central1"
  subnet_cidr        = "10.2.0.0/24"
  monthly_budget     = 5000

  apis = [
    "compute.googleapis.com",
    "container.googleapis.com",
    "iam.googleapis.com",
    "logging.googleapis.com",
    "monitoring.googleapis.com",
    "secretmanager.googleapis.com",
  ]
}
```

## Importing Existing Projects

If you have projects that were created outside Terraform, you can import them.

```bash
# Import an existing project
terraform import google_project.project projects/existing-project-id
```

After importing, make sure to set `auto_create_network = false` and add any existing configuration to your Terraform files. Run `terraform plan` to check that Terraform's state matches reality.

## Project Deletion

Deleting a project is a big deal - all resources inside it are destroyed. Terraform supports this, but protect against accidents.

```hcl
resource "google_project" "critical_project" {
  name                = "Critical Production"
  project_id          = "critical-prod-${random_id.suffix.hex}"
  org_id              = var.org_id
  billing_account     = var.billing_account_id
  auto_create_network = false

  lifecycle {
    prevent_destroy = true
  }
}
```

## Practical Tips

Project IDs are globally unique and permanent. Once a project ID is used and deleted, it cannot be reused for 30 days. Use a naming convention that includes a random suffix to avoid collisions.

Some APIs take time to enable. If a resource creation fails immediately after enabling the API, add a time_sleep or use explicit depends_on.

Keep your billing account ID out of version control if you consider it sensitive. Pass it as a variable or use a data source.

## Conclusion

Project creation is often the first step in any GCP infrastructure setup. Terraform makes it repeatable, auditable, and scalable. The project factory pattern is particularly powerful for organizations that create projects frequently - each new project comes with the right APIs enabled, the right IAM configured, the right network setup, and budget alerts from day one.

For related topics, see our guide on [handling GCP folder and organization management in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-gcp-folder-and-organization-management-in-terraform/view).
