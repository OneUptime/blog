# How to Configure TFLint Rules for GCP

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, TFLint, GCP, Google Cloud, Linting, DevOps, Infrastructure as Code

Description: Learn how to configure TFLint with the Google Cloud ruleset to catch invalid machine types, misconfigured resources, and GCP-specific Terraform issues.

---

TFLint's Google Cloud plugin validates your Terraform configurations against GCP-specific constraints. It catches invalid machine types, wrong disk types, unsupported regions, and other mistakes that Terraform's built-in validation does not detect until apply time. If you are deploying to Google Cloud with Terraform, this plugin provides fast, local validation that saves you from wasted plan-apply cycles.

## Installing the Google Cloud Plugin

Create a `.tflint.hcl` file with the Google plugin configuration:

```hcl
# .tflint.hcl
plugin "google" {
  enabled = true
  version = "0.28.0"
  source  = "github.com/terraform-linters/tflint-ruleset-google"
}
```

Initialize TFLint to download the plugin:

```bash
# Download the Google Cloud plugin
tflint --init

# Verify it works
tflint
```

## What the Google Plugin Checks

The Google plugin includes rules for:

- **Compute Engine** - Machine types, disk types, image families
- **GKE** - Cluster versions, machine types, disk sizes
- **Cloud SQL** - Database versions, tier names
- **Cloud Storage** - Storage class names, location values
- **Networking** - Invalid protocol values, port ranges
- **IAM** - Role name validation
- **General** - Region and zone validation

## Plugin Configuration

The Google plugin is straightforward to configure:

```hcl
# .tflint.hcl
plugin "google" {
  enabled = true
  version = "0.28.0"
  source  = "github.com/terraform-linters/tflint-ruleset-google"

  # Deep checking queries the GCP API for validation
  # Requires valid GCP credentials
  deep_check = true

  # Specify the GCP project for API checks
  project = "my-project-id"
}
```

With `deep_check` enabled, TFLint queries the GCP API to validate things like whether a specific machine type is available in your chosen zone. Without it, validation uses a static list.

## Common GCP Rules

### Invalid Machine Types

```hcl
# TFLint catches invalid machine types immediately
resource "google_compute_instance" "bad" {
  name         = "bad-instance"
  machine_type = "n1-standard-999"  # ERROR: invalid machine type
  zone         = "us-central1-a"

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-12"
    }
  }
}
```

The `google_compute_instance_invalid_machine_type` rule validates against all known GCE machine types.

### Invalid Disk Types

```hcl
resource "google_compute_disk" "bad" {
  name = "bad-disk"
  type = "pd-superfast"  # ERROR: invalid disk type
  zone = "us-central1-a"
  size = 100
}
```

Valid disk types include `pd-standard`, `pd-balanced`, `pd-ssd`, and `pd-extreme`. TFLint catches any value outside this set.

### Invalid Cloud SQL Tier

```hcl
resource "google_sql_database_instance" "bad" {
  name             = "bad-sql"
  database_version = "POSTGRES_15"
  region           = "us-central1"

  settings {
    tier = "db-custom-99-999999"  # ERROR: invalid Cloud SQL tier
  }
}
```

### Invalid GKE Version

```hcl
resource "google_container_cluster" "bad" {
  name     = "bad-cluster"
  location = "us-central1"

  min_master_version = "1.99.0"  # ERROR: invalid GKE version

  node_config {
    machine_type = "e2-medium"
  }
}
```

### Invalid Region or Zone

```hcl
resource "google_compute_instance" "bad" {
  name         = "bad-instance"
  machine_type = "e2-micro"
  zone         = "us-central1-z"  # ERROR: invalid zone

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-12"
    }
  }
}
```

### Storage Class Validation

```hcl
resource "google_storage_bucket" "bad" {
  name          = "bad-bucket"
  location      = "US"
  storage_class = "SUPER_COLD"  # ERROR: invalid storage class
}
```

Valid storage classes are `STANDARD`, `NEARLINE`, `COLDLINE`, `ARCHIVE`, and `MULTI_REGIONAL`.

## Configuring Specific Rules

Enable, disable, or configure individual rules:

```hcl
# .tflint.hcl
plugin "google" {
  enabled = true
  version = "0.28.0"
  source  = "github.com/terraform-linters/tflint-ruleset-google"
}

# Disable a specific rule
rule "google_compute_instance_invalid_machine_type" {
  enabled = false  # We use custom machine types from variables
}

# Keep other validation rules active
rule "google_compute_disk_invalid_type" {
  enabled = true
}

rule "google_sql_database_instance_invalid_tier" {
  enabled = true
}
```

## Inline Rule Suppression

Suppress rules for specific resources using comments:

```hcl
# tflint-ignore: google_compute_instance_invalid_machine_type
resource "google_compute_instance" "custom" {
  name         = "custom-instance"
  machine_type = var.custom_machine_type  # Dynamic value from variable
  zone         = var.zone

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-12"
    }
  }
}
```

## Running TFLint for GCP Projects

```bash
# Run TFLint with default settings
tflint

# Run recursively across all modules
tflint --recursive

# Output as JSON for CI
tflint --format json

# Show only errors, skip warnings
tflint --minimum-failure-severity error

# Run on a specific directory
tflint --chdir modules/compute
```

## Multi-Module Configuration

For projects with multiple GCP modules:

```hcl
# .tflint.hcl
config {
  # Inspect local modules for issues
  call_module_type = "local"
}

plugin "google" {
  enabled = true
  version = "0.28.0"
  source  = "github.com/terraform-linters/tflint-ruleset-google"
}
```

```bash
# Lint all modules from the root
tflint --recursive
```

## CI Pipeline Integration

### GitHub Actions

```yaml
# .github/workflows/tflint-gcp.yml
name: TFLint GCP

on:
  pull_request:
    paths:
      - '**/*.tf'

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: terraform-linters/setup-tflint@v4
        with:
          tflint_version: latest

      - name: Init TFLint
        run: tflint --init

      - name: Run TFLint
        run: tflint --recursive --format compact
```

### With Deep Check in CI

```yaml
      - uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: ${{ secrets.GCP_WORKLOAD_IDENTITY }}
          service_account: ${{ secrets.GCP_SA_EMAIL }}

      - name: Run TFLint with Deep Check
        run: tflint --recursive
```

### Cloud Build

```yaml
# cloudbuild.yaml
steps:
  - name: 'ghcr.io/terraform-linters/tflint:latest'
    entrypoint: 'sh'
    args:
      - '-c'
      - |
        tflint --init
        tflint --recursive --format compact --minimum-failure-severity error
```

## Complete Production Configuration

A comprehensive `.tflint.hcl` for GCP projects:

```hcl
# .tflint.hcl
# TFLint configuration for Google Cloud infrastructure

config {
  call_module_type = "local"
}

# Google Cloud plugin
plugin "google" {
  enabled = true
  version = "0.28.0"
  source  = "github.com/terraform-linters/tflint-ruleset-google"
}

# Terraform best practices
rule "terraform_naming_convention" {
  enabled = true
  format  = "snake_case"
}

rule "terraform_documented_variables" {
  enabled = true
}

rule "terraform_documented_outputs" {
  enabled = true
}

rule "terraform_unused_declarations" {
  enabled = true
}

rule "terraform_typed_variables" {
  enabled = true
}

rule "terraform_standard_module_structure" {
  enabled = true
}

# Require consistent formatting
rule "terraform_comment_syntax" {
  enabled = true
}
```

## Combining with Other GCP Validation Tools

TFLint catches configuration issues, but combine it with security scanners for full coverage:

```bash
#!/bin/bash
# gcp-validate.sh
# Full validation pipeline for GCP Terraform

set -e

echo "=== Format Check ==="
terraform fmt -check -recursive

echo "=== Terraform Validate ==="
terraform init -backend=false
terraform validate

echo "=== TFLint ==="
tflint --init
tflint --recursive --minimum-failure-severity error

echo "=== Security Scan ==="
trivy config --severity HIGH,CRITICAL --exit-code 1 .

echo "All checks passed"
```

## Available Rule Categories

Here is a summary of the rule categories available in the Google plugin:

| Category | Example Rules | What They Check |
|----------|--------------|-----------------|
| Compute | `google_compute_instance_invalid_machine_type` | VM sizes, disk types |
| GKE | `google_container_cluster_invalid_version` | Cluster versions, node config |
| Cloud SQL | `google_sql_database_instance_invalid_tier` | Database tiers, versions |
| Storage | `google_storage_bucket_invalid_storage_class` | Storage classes |
| Networking | `google_compute_firewall_invalid_protocol` | Protocols, port ranges |
| General | `google_project_invalid_name` | Project names, regions, zones |

## Summary

TFLint's Google Cloud plugin is a quick win for GCP Terraform projects. It validates machine types, disk types, Cloud SQL tiers, GKE versions, storage classes, and more against GCP's actual constraints. The static checks run in milliseconds, and deep checks with the GCP API catch region-specific issues. Configure it once, add it to CI, and eliminate a whole class of deployment failures.

For other cloud providers, see [How to Configure TFLint Rules for AWS](https://oneuptime.com/blog/post/2026-02-23-how-to-configure-tflint-rules-for-aws/view) and [How to Configure TFLint Rules for Azure](https://oneuptime.com/blog/post/2026-02-23-how-to-configure-tflint-rules-for-azure/view). For custom rules, see [How to Write Custom TFLint Rules](https://oneuptime.com/blog/post/2026-02-23-how-to-write-custom-tflint-rules/view).
