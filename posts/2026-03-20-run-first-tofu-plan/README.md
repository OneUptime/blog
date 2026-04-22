# How to Run Your First tofu plan

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Tofu plan, Getting Started, Infrastructure as Code, DevOps

Description: A guide to understanding and running the tofu plan command to preview infrastructure changes before applying them.

## Introduction

`tofu plan` is the command that shows you what OpenTofu will do before actually making any changes. It compares your desired state (defined in .tf files) with the current state of managed resources (recorded in the state file and refreshed from remote objects by default) and shows you the differences. Running a plan is like a dry run - it lets you review changes safely.

## Running a Basic Plan

```bash
# Navigate to your project directory

cd /path/to/your/project

# First, initialize if not already done
tofu init

# Run a plan
tofu plan

# Expected output:
# OpenTofu used the selected providers to generate the following execution plan.
# Resource actions are indicated with the following symbols:
#   + create
#   ~ update in-place
#   - destroy
#   -/+ destroy and then create as a replacement
#
# OpenTofu will perform the following actions:
#
#   # aws_instance.web_server will be created
#   + resource "aws_instance" "web_server" {
#       + id            = (known after apply)
#       + ami           = "ami-0c55b159cbfafe1f0"
#       + instance_type = "t2.micro"
#     }
#
# Plan: 1 to add, 0 to change, 0 to destroy.
```

## Understanding Plan Output Symbols

| Symbol | Meaning |
|--------|---------|
| `+` | Resource will be created |
| `-` | Resource will be destroyed |
| `~` | Resource will be updated in-place |
| `-/+` | Resource will be destroyed and recreated |
| `<=` | Data source will be read |

## Saving a Plan to a File

```bash
# Save the plan for later use (for automated pipelines)
tofu plan -out=my-plan.tfplan

# The plan file uses an opaque format and can contain sensitive values
ls -la my-plan.tfplan

# View the saved plan
tofu show -plan=my-plan.tfplan

# View as JSON for processing
tofu show -json -plan=my-plan.tfplan | jq .
```

## Common Plan Flags

```bash
# Plan with specific variable values
tofu plan -var="environment=prod"

# Plan using a variables file
tofu plan -var-file="prod.tfvars"

# Plan targeting specific resources
tofu plan -target=aws_instance.web_server

# Plan showing no color (for CI/CD logs)
tofu plan -no-color

# Plan for destroy (show what will be destroyed)
tofu plan -destroy

# Plan with detailed exit code
tofu plan -detailed-exitcode
# Exit code 0 = no changes
# Exit code 1 = error
# Exit code 2 = changes present
```

## Using Plan in CI/CD

```bash
#!/bin/bash
# ci-plan.sh - Run plan and fail if there's an error

set -e

tofu init -input=false

# Run plan with detailed exit code
set +e
tofu plan -detailed-exitcode -no-color -out=plan.tfplan
EXIT_CODE=$?
set -e

if [ $EXIT_CODE -eq 0 ]; then
  echo "No changes detected."
elif [ $EXIT_CODE -eq 2 ]; then
  echo "Changes detected. Review the plan above."
  exit 0  # Don't fail CI for planned changes
else
  echo "Error running plan!"
  exit 1
fi
```

## A Sample Configuration to Plan

```hcl
# main.tf
terraform {
  required_version = ">= 1.6.0"

  required_providers {
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

variable "pet_prefix" {
  type    = string
  default = "happy"
}

resource "random_pet" "server" {
  prefix    = var.pet_prefix
  length    = 2
  separator = "-"
}

output "server_name" {
  value = random_pet.server.id
}
```

```bash
# Initialize and plan
tofu init
tofu plan

# Output:
# random_pet.server will be created
# + resource "random_pet" "server" {
#     + id        = (known after apply)
#     + length    = 2
#     + prefix    = "happy"
#     + separator = "-"
#   }
#
# Plan: 1 to add, 0 to change, 0 to destroy.
```

## Conclusion

`tofu plan` is your safety net in infrastructure management. Always run a plan before applying changes, especially in production environments. Saving plans to files (`-out`) ensures that exactly what was reviewed gets applied, preventing surprises from state changes between plan and apply. Understanding plan output symbols helps you quickly assess the impact of your infrastructure changes.
