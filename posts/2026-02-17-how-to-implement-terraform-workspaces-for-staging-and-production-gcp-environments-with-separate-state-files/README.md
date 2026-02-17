# How to Implement Terraform Workspaces for Staging and Production GCP Environments with Separate State Files

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Terraform, Workspaces, State Management, Infrastructure as Code

Description: Implement Terraform workspaces to manage staging and production GCP environments with separate state files, variable overrides, and environment-specific configurations.

---

When you manage multiple environments with Terraform, you need a strategy to keep them isolated. You do not want a `terraform apply` in staging to accidentally modify production resources. Terraform workspaces provide one approach to this problem - they let you use the same configuration with different state files for each environment.

That said, workspaces are a tool with trade-offs. Let me show you how to use them effectively for GCP environments, and also discuss when a directory-based approach might be better.

## How Workspaces Work

A Terraform workspace is essentially a named state file. When you switch workspaces, Terraform reads from and writes to a different state file. Your configuration stays the same, but the deployed resources are tracked separately.

```bash
# Create and switch to the staging workspace
terraform workspace new staging

# Create the production workspace
terraform workspace new production

# List all workspaces
terraform workspace list
# * production
#   staging
#   default

# Switch between workspaces
terraform workspace select staging
```

With a GCS backend, workspaces store state at different paths:

```
gs://terraform-state-bucket/
  env:/staging/terraform.tfstate
  env:/production/terraform.tfstate
```

## Backend Configuration

Set up the GCS backend to support workspaces:

```hcl
# backend.tf - GCS backend that supports workspaces

terraform {
  backend "gcs" {
    bucket = "my-org-terraform-state"
    prefix = "infrastructure/app"
  }

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}
```

The `prefix` defines the base path. Each workspace creates a subdirectory under this path. The default workspace uses `infrastructure/app/default.tfstate`, staging uses `infrastructure/app/env:/staging/default.tfstate`, and so on.

## Environment-Specific Variables

The core technique is using `terraform.workspace` to select different variable values per environment:

```hcl
# locals.tf - Environment-specific configuration using workspace name

locals {
  # Map of environment-specific values
  env_config = {
    staging = {
      project_id         = "my-org-staging"
      region             = "us-central1"
      gke_node_count     = 2
      gke_machine_type   = "e2-standard-4"
      cloud_sql_tier     = "db-custom-2-8192"
      min_replicas       = 1
      max_replicas       = 5
      enable_cdn         = false
      cloud_sql_ha       = false
      deletion_protection = false
    }
    production = {
      project_id         = "my-org-production"
      region             = "us-central1"
      gke_node_count     = 5
      gke_machine_type   = "e2-standard-8"
      cloud_sql_tier     = "db-custom-4-16384"
      min_replicas       = 3
      max_replicas       = 20
      enable_cdn         = true
      cloud_sql_ha       = true
      deletion_protection = true
    }
  }

  # Select the config for the current workspace
  config = local.env_config[terraform.workspace]

  # Common tags applied to all resources
  common_labels = {
    environment = terraform.workspace
    managed_by  = "terraform"
    workspace   = terraform.workspace
  }
}
```

## Using Workspace Config in Resources

Now reference `local.config` throughout your resources:

```hcl
# gke.tf - GKE cluster sized per environment

resource "google_container_cluster" "primary" {
  project  = local.config.project_id
  name     = "${terraform.workspace}-cluster"
  location = local.config.region

  # Remove default node pool
  remove_default_node_pool = true
  initial_node_count       = 1

  # Private cluster for all environments
  private_cluster_config {
    enable_private_nodes    = true
    enable_private_endpoint = false
    master_ipv4_cidr_block  = "172.16.0.0/28"
  }

  resource_labels = local.common_labels
}

resource "google_container_node_pool" "primary" {
  project    = local.config.project_id
  name       = "${terraform.workspace}-node-pool"
  location   = local.config.region
  cluster    = google_container_cluster.primary.name
  node_count = local.config.gke_node_count

  node_config {
    machine_type = local.config.gke_machine_type

    labels = local.common_labels

    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]
  }
}
```

```hcl
# cloud-sql.tf - Database sized per environment

resource "google_sql_database_instance" "primary" {
  project          = local.config.project_id
  name             = "${terraform.workspace}-db"
  database_version = "POSTGRES_15"
  region           = local.config.region

  deletion_protection = local.config.deletion_protection

  settings {
    tier              = local.config.cloud_sql_tier
    availability_type = local.config.cloud_sql_ha ? "REGIONAL" : "ZONAL"

    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.vpc.id
    }

    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = true
      start_time                     = "03:00"
    }

    user_labels = local.common_labels
  }
}
```

## Variable Files Per Environment

For more complex configurations, use `.tfvars` files per environment:

```hcl
# staging.tfvars
extra_firewall_rules = [
  {
    name        = "allow-debug-access"
    source_ranges = ["10.0.0.0/8"]
    ports       = ["8080", "9090"]
  }
]

alert_notification_emails = ["staging-alerts@myorg.com"]
enable_detailed_logging   = true
```

```hcl
# production.tfvars
extra_firewall_rules = []

alert_notification_emails = [
  "prod-alerts@myorg.com",
  "oncall@myorg.com"
]

enable_detailed_logging = false
```

Apply with the right vars file:

```bash
# Apply staging
terraform workspace select staging
terraform apply -var-file="staging.tfvars"

# Apply production
terraform workspace select production
terraform apply -var-file="production.tfvars"
```

## Safety Guards

Prevent accidental cross-environment modifications by adding validation:

```hcl
# validation.tf - Safety checks to prevent workspace mistakes

# Validate that the workspace name is expected
resource "null_resource" "workspace_check" {
  lifecycle {
    precondition {
      condition     = contains(keys(local.env_config), terraform.workspace)
      error_message = "Invalid workspace '${terraform.workspace}'. Must be one of: ${join(", ", keys(local.env_config))}"
    }
  }
}

# Verify we are targeting the right project
data "google_project" "current" {
  project_id = local.config.project_id
}

resource "null_resource" "project_check" {
  lifecycle {
    precondition {
      condition     = data.google_project.current.project_id == local.config.project_id
      error_message = "Workspace '${terraform.workspace}' should target project '${local.config.project_id}' but current credentials target '${data.google_project.current.project_id}'"
    }
  }
}
```

## CI/CD Integration

Automate workspace selection in your CI/CD pipeline:

```yaml
# .github/workflows/terraform.yml
name: Terraform Deploy

on:
  push:
    branches:
      - main
      - staging

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3

      - name: Set environment
        id: env
        run: |
          if [ "${{ github.ref }}" = "refs/heads/main" ]; then
            echo "workspace=production" >> $GITHUB_OUTPUT
            echo "vars_file=production.tfvars" >> $GITHUB_OUTPUT
          else
            echo "workspace=staging" >> $GITHUB_OUTPUT
            echo "vars_file=staging.tfvars" >> $GITHUB_OUTPUT
          fi

      - name: Terraform Init
        run: terraform init

      - name: Select Workspace
        run: terraform workspace select ${{ steps.env.outputs.workspace }}

      - name: Terraform Plan
        run: terraform plan -var-file=${{ steps.env.outputs.vars_file }} -out=tfplan

      - name: Terraform Apply
        if: github.event_name == 'push'
        run: terraform apply tfplan
```

## When Not to Use Workspaces

Workspaces work well when environments are structurally identical and differ only in scale and configuration values. They are a poor fit when:

- Environments have fundamentally different resources (prod has CDN, staging does not)
- Different teams manage different environments with different permissions
- You need different provider configurations per environment
- The blast radius concern is high - a workspace mix-up could affect production

For those cases, separate directories per environment with their own state files and configurations are safer:

```
infrastructure/
  modules/          # Shared modules
  environments/
    staging/
      main.tf       # Uses shared modules
      backend.tf    # Points to staging state
    production/
      main.tf       # Uses shared modules
      backend.tf    # Points to production state
```

## Migrating Between Approaches

If you start with workspaces and later need to split into directories:

```bash
# Export state from a workspace
terraform workspace select staging
terraform state pull > staging.tfstate

# In the new staging directory, import the state
cd environments/staging
terraform init
terraform state push ../staging.tfstate
```

## Summary

Terraform workspaces provide a lightweight way to manage staging and production GCP environments from a single codebase. They work best when environments are structurally similar and differ mainly in sizing and configuration. Use locals maps to centralize per-environment configuration, tfvars files for complex overrides, and validation checks to prevent workspace mix-ups. For environments that diverge significantly, consider a directory-based approach instead. The right choice depends on your team size, risk tolerance, and how similar your environments actually are.
