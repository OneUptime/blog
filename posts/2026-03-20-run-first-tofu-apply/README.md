# How to Run Your First tofu apply

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Tofu apply, Getting Started, Infrastructure as Code, DevOps

Description: A guide to using the tofu apply command to provision and modify infrastructure with OpenTofu.

## Introduction

`tofu apply` executes the infrastructure changes defined in your configuration files. It first generates a plan (unless you provide a saved plan), shows you the changes, and then executes them after confirmation. This is the command that actually creates, modifies, or destroys infrastructure.

## Running a Basic Apply

```bash
# Navigate to your project

cd /path/to/your/project

# Run apply (generates a plan and prompts for confirmation)
tofu apply

# OpenTofu shows the plan and asks:
# "Do you want to perform these actions?"
# "Only 'yes' will be accepted to approve."
# Enter 'yes' to proceed
```

## Apply with Auto-Approve

```bash
# Skip the confirmation prompt (useful for automation)
tofu apply -auto-approve

# WARNING: Always review the plan manually before using -auto-approve in production
```

## Apply from a Saved Plan

```bash
# Best practice: save plan first, then apply it
# This ensures exactly what you reviewed gets applied

# Step 1: Generate and save a plan
tofu plan -out=my-plan.tfplan

# Step 2: Review the saved plan
tofu show -plan=my-plan.tfplan

# Step 3: Apply the saved plan (no confirmation needed)
tofu apply my-plan.tfplan
```

## Common Apply Flags

```bash
# Apply with variable values
tofu apply -var="environment=production"

# Apply with a variable file
tofu apply -var-file="production.tfvars"

# Target a resource and its dependencies
tofu apply -target=aws_instance.web_server

# Apply with parallelism limit (default: 10)
tofu apply -parallelism=5

# Apply without color (for CI/CD logs)
tofu apply -no-color -auto-approve

# Disable interactive input (for automation)
tofu apply -input=false -auto-approve
```

## Sample Configuration to Apply

```hcl
# main.tf
terraform {
  required_version = ">= 1.6.0"

  required_providers {
    local = {
      source  = "hashicorp/local"
      version = "~> 2.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

variable "project_name" {
  type    = string
  default = "my-first-project"
}

resource "random_id" "project_suffix" {
  byte_length = 4
}

resource "local_file" "project_info" {
  content = <<-EOF
    Project: ${var.project_name}
    ID: ${random_id.project_suffix.hex}
    Created by: OpenTofu
  EOF
  filename = "${path.module}/project-info.txt"
}

output "project_id" {
  value = random_id.project_suffix.hex
}

output "project_file" {
  value = local_file.project_info.filename
}
```

```bash
# Initialize and apply
tofu init
tofu apply -auto-approve

# View the created file
cat project-info.txt

# View outputs
tofu output
tofu output -json
```

## Understanding Apply Output

```text
# Sample apply output:
random_id.project_suffix: Creating...
random_id.project_suffix: Creation complete after 0s [id=obLD1A]
local_file.project_info: Creating...
local_file.project_info: Creation complete after 0s [id=abc123...]

Apply complete! Resources: 2 added, 0 changed, 0 destroyed.

Outputs:

project_file = "./project-info.txt"
project_id = "a1b2c3d4"
```

## Applying in CI/CD Pipelines

```bash
#!/bin/bash
# deploy.sh

set -e

echo "Initializing..."
tofu init -input=false

echo "Planning..."
tofu plan -out=deploy.tfplan -input=false

echo "Applying..."
tofu apply -input=false deploy.tfplan

echo "Deployment complete!"
tofu output
```

## After Apply: Viewing State

```bash
# View all resources in state
tofu state list

# View details of a specific resource
tofu state show aws_instance.web_server

# View outputs
tofu output
tofu output project_id  # specific output
```

## Conclusion

`tofu apply` is where infrastructure changes happen. The plan-then-apply workflow with saved plans provides the highest level of safety, as you can be certain that exactly what was reviewed gets executed. For production environments, always use saved plans and require human approval before applying. For development environments, `-auto-approve` can speed up iteration cycles.
