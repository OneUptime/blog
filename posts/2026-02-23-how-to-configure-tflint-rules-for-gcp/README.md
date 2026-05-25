# How to Configure TFLint Rules for GCP

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, TFLint, GCP, Google Cloud, Linting, DevOps, Infrastructure as Code

Description: Learn how to configure TFLint with the Google Cloud ruleset to catch invalid machine types, misconfigured resources, and GCP-specific Terraform issues.

---

TFLint's Google Cloud plugin validates your Terraform configurations against GCP-specific constraints. It catches invalid machine types, invalid IAM member values, invalid enum values generated from the Google provider schema, and disabled APIs when deep checking is enabled. If you are deploying to Google Cloud with Terraform, this plugin provides fast, local validation that saves you from wasted plan-apply cycles.

## Installing the Google Cloud Plugin

Create a `.tflint.hcl` file with the Google plugin configuration:

```hcl
# .tflint.hcl

plugin "google" {
  enabled = true
  version = "0.39.0"
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

- **Compute Engine** - Machine types and generated enum/name validation rules
- **GKE** - Cluster and node pool machine types
- **Networking** - Invalid protocol, load balancing scheme, network tier, and related enum values
- **IAM** - IAM member value validation
- **Google provider resources** - Generated validation rules from the provider schema
- **Deep checking** - Disabled API detection through the Google Cloud API

## Plugin Configuration

The Google plugin is straightforward to configure:

```hcl
# .tflint.hcl
plugin "google" {
  enabled = true
  version = "0.39.0"
  source  = "github.com/terraform-linters/tflint-ruleset-google"

  # Deep checking queries the GCP API for validation
  # Requires valid GCP credentials
  deep_check = true
}
```

In your Terraform configuration, set the Google provider project for deep checks:

```hcl
provider "google" {
  # TFLint reads the project attribute for deep checks
  project = "my-project-id"
}
```

With `deep_check` enabled, TFLint queries the GCP API to validate things like whether the APIs required by your resources are enabled in the configured project. Without it, the Google plugin runs its static rules only.

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

  network_interface {
    network = "default"
  }
}
```

The `google_compute_instance_invalid_machine_type` rule validates against known GCE machine types. Custom machine types are treated as valid when they use supported custom machine type prefixes.

### Invalid IAM Members

```hcl
resource "google_project_iam_member" "bad" {
  project = "my-project-id"
  role    = "roles/viewer"
  member  = "not-a-valid-member"  # ERROR: invalid IAM member
}
```

IAM member values must use supported member prefixes such as `user:`, `group:`, `serviceAccount:`, or `domain:`. TFLint catches invalid member strings before they reach the Google Cloud API.

### Invalid Network Tier

```hcl
resource "google_compute_address" "bad" {
  name         = "bad-address"
  region       = "us-central1"
  network_tier = "ULTRA"  # ERROR: invalid network tier
}
```

Valid network tiers are `PREMIUM` and `STANDARD`.

### Invalid GKE Machine Type

```hcl
resource "google_container_cluster" "bad" {
  name               = "bad-cluster"
  location           = "us-central1"
  initial_node_count = 1

  node_config {
    machine_type = "e2-standard-999"  # ERROR: invalid machine type
  }
}
```

### Disabled API Deep Check

```hcl
resource "google_compute_network" "bad" {
  name                    = "bad-network"
  auto_create_subnetworks = false
}
```

With `deep_check = true`, the `google_disabled_api` rule can report when the Compute Engine API or another required Google Cloud API is disabled in the configured project.

### Protocol Validation

```hcl
resource "google_compute_forwarding_rule" "bad" {
  name        = "bad-forwarding-rule"
  region      = "us-central1"
  ip_protocol = "HTTP"  # ERROR: invalid IP protocol
}
```

Valid forwarding rule IP protocol values include `TCP`, `UDP`, `ESP`, `AH`, `SCTP`, `ICMP`, and `L3_DEFAULT`.

## Configuring Specific Rules

Enable, disable, or configure individual rules:

```hcl
# .tflint.hcl
plugin "google" {
  enabled = true
  version = "0.39.0"
  source  = "github.com/terraform-linters/tflint-ruleset-google"
}

# Disable a specific rule
rule "google_compute_instance_invalid_machine_type" {
  enabled = false  # We use custom machine types from variables
}

# Keep other validation rules active
rule "google_project_iam_member_invalid_member" {
  enabled = true
}

rule "google_compute_forwarding_rule_invalid_ip_protocol" {
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

  network_interface {
    network = "default"
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
  version = "0.39.0"
  source  = "github.com/terraform-linters/tflint-ruleset-google"
}
```

```bash
# Lint all modules using the root config
tflint --recursive --config "$(pwd)/.tflint.hcl"
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

      - uses: terraform-linters/setup-tflint@v6
        with:
          tflint_version: latest

      - name: Init TFLint
        run: tflint --init

      - name: Run TFLint
        run: tflint --recursive --config "$(pwd)/.tflint.hcl" --format compact
```

### With Deep Check in CI

```yaml
      - uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: ${{ secrets.GCP_WORKLOAD_IDENTITY }}
          service_account: ${{ secrets.GCP_SA_EMAIL }}

      - name: Run TFLint with Deep Check
        run: tflint --recursive --config "$(pwd)/.tflint.hcl"
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
        tflint --recursive --config "$(pwd)/.tflint.hcl" --format compact --minimum-failure-severity error
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
  version = "0.39.0"
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
tflint --recursive --config "$(pwd)/.tflint.hcl" --minimum-failure-severity error

echo "=== Security Scan ==="
trivy config --severity HIGH,CRITICAL --exit-code 1 .

echo "All checks passed"
```

## Available Rule Categories

Here is a summary of the rule categories available in the Google plugin:

| Category | Example Rules | What They Check |
|----------|--------------|-----------------|
| Compute | `google_compute_instance_invalid_machine_type` | VM machine types |
| GKE | `google_container_cluster_invalid_machine_type` | Cluster and node pool machine types |
| IAM | `google_project_iam_member_invalid_member` | IAM member strings |
| Networking | `google_compute_forwarding_rule_invalid_ip_protocol` | Protocol and networking enum values |
| Generated provider rules | `google_compute_address_invalid_network_tier` | Invalid enum and name values generated from provider schema |
| Deep checking | `google_disabled_api` | Required Google Cloud APIs that are disabled |

## Summary

TFLint's Google Cloud plugin is a quick win for GCP Terraform projects. It validates machine types, IAM member values, networking enum values, and many generated provider-schema constraints. The static checks run in milliseconds, and deep checks with the GCP API catch disabled APIs in the configured project. Configure it once, add it to CI, and eliminate a whole class of deployment failures.

For other cloud providers, see [How to Configure TFLint Rules for AWS](https://oneuptime.com/blog/post/2026-02-23-how-to-configure-tflint-rules-for-aws/view) and [How to Configure TFLint Rules for Azure](https://oneuptime.com/blog/post/2026-02-23-how-to-configure-tflint-rules-for-azure/view). For custom rules, see [How to Write Custom TFLint Rules](https://oneuptime.com/blog/post/2026-02-23-how-to-write-custom-tflint-rules/view).
