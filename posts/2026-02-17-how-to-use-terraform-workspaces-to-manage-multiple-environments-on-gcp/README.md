# How to Use Terraform Workspaces to Manage Multiple Environments on GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Terraform, Workspaces, Environments, Infrastructure as Code

Description: Learn how to use Terraform workspaces to manage development, staging, and production environments on GCP with a single configuration and isolated state files.

---

Running the same infrastructure across development, staging, and production is one of the most common patterns in cloud engineering. You want the environments to look similar but not identical - production gets bigger machines, staging gets fewer replicas, and development gets the cheapest possible setup.

Terraform workspaces provide one way to handle this. They let you maintain a single set of Terraform configuration files while keeping separate state for each environment. Let me walk through how to use them effectively on GCP.

## What Are Terraform Workspaces

A Terraform workspace is essentially an isolated state file. When you switch workspaces, Terraform reads and writes to a different state file, so resources in one workspace are completely independent of resources in another.

Every Terraform configuration starts with a workspace called `default`. You can create additional workspaces for each environment.

```bash
# List current workspaces
terraform workspace list

# Create workspaces for each environment
terraform workspace new dev
terraform workspace new staging
terraform workspace new production

# Switch to a specific workspace
terraform workspace select dev

# Show the current workspace
terraform workspace show
```

## Setting Up Workspace-Aware Configuration

The key to using workspaces effectively is making your configuration aware of the current workspace. The `terraform.workspace` variable gives you the workspace name:

```hcl
# variables.tf - Environment-specific configuration using workspace names
locals {
  # Map workspace names to environment-specific settings
  environment_config = {
    dev = {
      project_id   = "myapp-dev"
      machine_type = "e2-small"
      instance_count = 1
      disk_size_gb = 20
      region       = "us-central1"
    }
    staging = {
      project_id   = "myapp-staging"
      machine_type = "e2-medium"
      instance_count = 2
      disk_size_gb = 50
      region       = "us-central1"
    }
    production = {
      project_id   = "myapp-production"
      machine_type = "e2-standard-4"
      instance_count = 3
      disk_size_gb = 100
      region       = "us-central1"
    }
  }

  # Get the config for the current workspace
  env = local.environment_config[terraform.workspace]
}
```

Now use `local.env` throughout your configuration:

```hcl
# provider.tf - Provider uses workspace-specific project
provider "google" {
  project = local.env.project_id
  region  = local.env.region
}
```

## Building the Infrastructure

Here is a complete example that creates environment-specific infrastructure:

```hcl
# main.tf - Infrastructure that scales based on the workspace

# VPC Network
resource "google_compute_network" "main" {
  name                    = "${terraform.workspace}-vpc"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "main" {
  name          = "${terraform.workspace}-subnet"
  ip_cidr_range = "10.0.0.0/24"
  region        = local.env.region
  network       = google_compute_network.main.id
}

# Compute instances - count varies by environment
resource "google_compute_instance" "app" {
  count = local.env.instance_count

  name         = "${terraform.workspace}-app-${count.index + 1}"
  machine_type = local.env.machine_type
  zone         = "${local.env.region}-a"

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-12"
      size  = local.env.disk_size_gb
    }
  }

  network_interface {
    network    = google_compute_network.main.id
    subnetwork = google_compute_subnetwork.main.id
  }

  labels = {
    environment = terraform.workspace
    managed_by  = "terraform"
  }
}

# Cloud SQL - only create in staging and production
resource "google_sql_database_instance" "main" {
  count = terraform.workspace != "dev" ? 1 : 0

  name             = "${terraform.workspace}-db"
  database_version = "POSTGRES_15"
  region           = local.env.region

  settings {
    tier = terraform.workspace == "production" ? "db-custom-4-16384" : "db-f1-micro"

    backup_configuration {
      enabled = terraform.workspace == "production" ? true : false
    }
  }

  deletion_protection = terraform.workspace == "production" ? true : false
}
```

## Remote State with Workspaces

When using a GCS backend, Terraform automatically organizes state files by workspace:

```hcl
# backend.tf - GCS backend with workspace support
terraform {
  backend "gcs" {
    bucket = "myapp-terraform-state"
    prefix = "infrastructure"
  }
}
```

With this configuration, Terraform stores state files at:
- `gs://myapp-terraform-state/infrastructure/default.tfstate`
- `gs://myapp-terraform-state/infrastructure/dev.tfstate`
- `gs://myapp-terraform-state/infrastructure/staging.tfstate`
- `gs://myapp-terraform-state/infrastructure/production.tfstate`

## Working with Workspaces in CI/CD

In your CI/CD pipeline, select the workspace based on the branch or deployment target:

```yaml
# .github/workflows/terraform.yml - CI/CD with workspace selection
name: Terraform Deploy

on:
  push:
    branches: [main, staging, develop]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3

      - name: Set workspace based on branch
        run: |
          if [ "${{ github.ref_name }}" = "main" ]; then
            echo "TF_WORKSPACE=production" >> $GITHUB_ENV
          elif [ "${{ github.ref_name }}" = "staging" ]; then
            echo "TF_WORKSPACE=staging" >> $GITHUB_ENV
          else
            echo "TF_WORKSPACE=dev" >> $GITHUB_ENV
          fi

      - name: Terraform Init
        run: terraform init

      - name: Terraform Plan
        run: terraform plan -out=tfplan

      - name: Terraform Apply
        if: github.ref_name == 'main' || github.ref_name == 'staging'
        run: terraform apply -auto-approve tfplan
```

## Using tfvars Files as an Alternative

Some teams prefer using workspace-specific `.tfvars` files instead of embedding the configuration map in HCL:

```hcl
# variables.tf - Variables without defaults
variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "machine_type" {
  description = "Machine type for instances"
  type        = string
}

variable "instance_count" {
  description = "Number of app instances"
  type        = number
}
```

Create a tfvars file for each workspace:

```hcl
# environments/dev.tfvars
project_id     = "myapp-dev"
machine_type   = "e2-small"
instance_count = 1
```

```hcl
# environments/production.tfvars
project_id     = "myapp-production"
machine_type   = "e2-standard-4"
instance_count = 3
```

Then use the workspace name to select the right file:

```bash
# Plan with the workspace-specific tfvars file
terraform plan -var-file="environments/$(terraform workspace show).tfvars"
```

## Workspace-Specific Resource Naming

Prefixing resource names with the workspace prevents naming conflicts when environments share a GCP project:

```hcl
# Use the workspace name as a prefix for all resource names
locals {
  name_prefix = terraform.workspace
}

resource "google_storage_bucket" "data" {
  name     = "${local.name_prefix}-data-${local.env.project_id}"
  location = local.env.region
}

resource "google_pubsub_topic" "events" {
  name = "${local.name_prefix}-events"
}
```

## Protecting Production

Add safeguards to prevent accidental production changes:

```hcl
# Prevent accidental deletion of production resources
resource "google_compute_instance" "app" {
  count = local.env.instance_count

  name         = "${terraform.workspace}-app-${count.index + 1}"
  machine_type = local.env.machine_type
  zone         = "${local.env.region}-a"

  # Only enable deletion protection in production
  deletion_protection = terraform.workspace == "production"

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-12"
    }
  }

  network_interface {
    network = google_compute_network.main.id
  }

  lifecycle {
    # Prevent destroy in production
    prevent_destroy = false  # Set to true in production module
  }
}
```

## Limitations of Workspaces

Workspaces are not perfect for every situation. Be aware of these limitations:

**Same backend for all workspaces.** All workspaces share the same backend configuration. If your environments need different backends (different state buckets, different permissions), workspaces will not work.

**No workspace-specific backend config.** You cannot have one workspace use a GCS bucket in us-central1 and another use a bucket in europe-west1.

**Risk of applying to the wrong workspace.** If someone forgets to switch workspaces, they could accidentally apply dev changes to production. Always verify with `terraform workspace show` before applying.

**All environments share one code base.** If your environments need fundamentally different configurations, not just different sizes, workspaces become awkward with lots of conditional logic.

## When to Use Workspaces vs Separate Directories

Use workspaces when:
- Environments differ only in scale (machine sizes, counts, disk sizes)
- You want a simple workflow with minimal tooling
- All environments use the same GCP APIs and resource types

Use separate directories when:
- Environments have fundamentally different architectures
- Different teams manage different environments
- You need different backend configurations per environment
- You want stricter isolation between environments

## Best Practices

1. **Never use the default workspace for real infrastructure.** Keep it empty and create explicit workspaces.
2. **Always verify your workspace before applying.** Make it a habit to run `terraform workspace show`.
3. **Use separate GCP projects per environment** when possible for blast radius containment.
4. **Prefix all resource names** with the workspace to avoid conflicts.
5. **Add workspace validation** to catch accidental use of undefined workspaces.
6. **Keep environment differences minimal.** The more conditional logic you add, the harder the code is to maintain.

## Wrapping Up

Terraform workspaces provide a straightforward way to manage multiple GCP environments from a single codebase. They work well when your environments are structurally similar and differ mainly in scale. For more complex scenarios with fundamentally different architectures per environment, consider separate directory structures instead. Choose the approach that matches your team's needs and keep your environment configurations as similar as possible to avoid drift.
