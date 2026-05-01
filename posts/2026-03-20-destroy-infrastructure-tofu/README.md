# How to Destroy Infrastructure with tofu destroy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Tofu destroy, Infrastructure Management, Infrastructure as Code, DevOps

Description: A guide to safely destroying OpenTofu-managed infrastructure using the tofu destroy command.

## Introduction

`tofu destroy` removes all infrastructure resources managed by your OpenTofu configuration. This is useful for tearing down temporary environments, cleaning up after testing, or decommissioning infrastructure. Understanding how to use it safely prevents accidental data loss.

## Basic Destroy

```bash
# Navigate to your project

cd /path/to/your/project

# Run destroy (shows plan and prompts for confirmation)
tofu destroy

# OpenTofu will show what will be destroyed and ask:
# "Do you really want to destroy all resources?"
# "There is no undo. Only 'yes' will be accepted to confirm."
# Type 'yes' to proceed
```

## Auto-Approve Destroy

```bash
# Skip confirmation (use with extreme caution!)
tofu destroy -auto-approve

# This permanently destroys all resources with no undo
# ONLY use in non-production or when you are absolutely certain
```

## Destroy Specific Resources

```bash
# Destroy only specific resources (using -target)
tofu destroy -target=aws_instance.web_server

# Destroy multiple targets
tofu destroy \
  -target=aws_instance.web_server \
  -target=aws_security_group.web_sg

# Run a plan to see what will be destroyed
tofu plan -destroy -target=aws_instance.web_server
```

## Preview Before Destroy

```bash
# Always preview before destroying
tofu plan -destroy

# Save the destroy plan
tofu plan -destroy -out=destroy-plan.tfplan

# Review the saved plan
tofu show destroy-plan.tfplan

# Apply the saved destroy plan
tofu apply destroy-plan.tfplan
```

## Destroying Environments

```bash
# Destroy resources in a specific workspace
tofu workspace select staging
tofu destroy -auto-approve
tofu workspace select default

# Destroy with variable files
tofu destroy -var-file="staging.tfvars" -auto-approve
```

## Sample Configuration

```hcl
# main.tf
terraform {
  required_version = ">= 1.6.0"

  required_providers {
    local = {
      source  = "hashicorp/local"
      version = "~> 2.0"
    }
  }
}

resource "local_file" "temp" {
  content  = "This is a temporary file"
  filename = "${path.module}/temp.txt"
}

resource "local_file" "config" {
  content  = "Configuration file"
  filename = "${path.module}/config.txt"
}

output "files_created" {
  value = [local_file.temp.filename, local_file.config.filename]
}
```

```bash
# Create the resources
tofu init && tofu apply -auto-approve

# Verify resources exist
find . -maxdepth 1 -name "*.txt"
tofu state list

# Destroy everything
tofu destroy -auto-approve

# Verify destruction
find . -maxdepth 1 -name "*.txt"  # Should show no files
tofu state list  # Should show empty state
```

## Protect Resources from Accidental Destruction

```hcl
# Use prevent_destroy to protect critical resources
resource "aws_rds_instance" "production_db" {
  identifier = "prod-database"
  # ... other config ...

  lifecycle {
    prevent_destroy = true
  }
}
```

```bash
# Attempting to destroy will fail:
# Error: Instance cannot be destroyed
# because "prevent_destroy" is set to true
```

## Destroy in CI/CD (Cleanup Pipelines)

```yaml
# .github/workflows/destroy.yml
name: Destroy Infrastructure

on:
  workflow_dispatch:  # Manual trigger only
    inputs:
      confirm:
        description: 'Type DESTROY to confirm'
        required: true

jobs:
  destroy:
    runs-on: ubuntu-latest
    if: github.event.inputs.confirm == 'DESTROY'
    steps:
      - uses: actions/checkout@v4

      - name: Setup OpenTofu
        uses: opentofu/setup-opentofu@v2
        with:
          tofu_version: "1.9.0"

      - name: Destroy
        run: |
          tofu init
          tofu destroy -auto-approve
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

## Removing Individual Resources from State

```bash
# Remove from state without destroying (useful for resources you want to unmanage)
tofu state rm aws_instance.web_server

# The resource still exists in the cloud but OpenTofu no longer manages it
```

## Conclusion

`tofu destroy` is a powerful but destructive operation that should be used with care. Always preview the destroy plan before executing, use `prevent_destroy` lifecycle rules for critical resources, and require manual approval in CI/CD workflows. For production environments, consider requiring a specific input string to confirm destruction, adding an extra layer of protection against accidental deletions.
