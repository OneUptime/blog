# How to Understand the OpenTofu Write-Plan-Apply Workflow

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Workflow, Best Practice, Infrastructure as Code, DevOps

Description: A comprehensive guide to the core OpenTofu workflow: write configuration, plan changes, and apply them safely.

## Introduction

The Write-Plan-Apply workflow is the foundation of working with OpenTofu. Understanding each phase helps you build reliable infrastructure automation pipelines and prevents costly mistakes in production.

## The Three Core Phases

### Phase 1: Write

You write HCL configuration describing your desired infrastructure state.

```hcl
# main.tf - Write phase: describe what you want

terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket = "my-tofu-state"
    key    = "production/terraform.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "instance_type" {
  type    = string
  default = "t3.micro"
}

resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"

  tags = {
    Name      = "main-vpc"
    ManagedBy = "OpenTofu"
  }
}

resource "aws_subnet" "public" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = "${var.aws_region}a"

  tags = {
    Name = "public-subnet"
  }
}
```

### Phase 2: Plan

OpenTofu compares your desired state with the current state and shows you what changes will be made.

```bash
# Initialize providers and modules
tofu init

# Generate the plan
tofu plan

# Save the plan to a file for safe apply
tofu plan -out=infra.tfplan
```

Plan output shows:
```text
+ aws_vpc.main will be created
+ aws_subnet.public will be created

Plan: 2 to add, 0 to change, 0 to destroy.
```

### Phase 3: Apply

Execute the planned changes to create/modify/destroy infrastructure.

```bash
# Apply the saved plan (most safe)
tofu apply infra.tfplan

# Or apply with plan generation + confirmation
tofu apply
```

## The Complete Workflow in Practice

```bash
# Complete workflow script
#!/bin/bash
set -e

PROJECT_DIR="/path/to/infrastructure"
ENV="${1:-dev}"

echo "=== OpenTofu Workflow ==="
echo "Environment: $ENV"
echo ""

# Step 1: Change to project directory
cd "$PROJECT_DIR"

# Step 2: Write phase (already done)
echo "Write phase: Configurations ready"

# Step 3: Initialize
echo "Initializing..."
tofu init -input=false

# Step 4: Validate syntax
echo "Validating..."
tofu validate

# Step 5: Format check
echo "Checking formatting..."
tofu fmt -check -recursive

# Step 6: Plan
echo "Planning..."
tofu plan \
  -var-file="${ENV}.tfvars" \
  -out="${ENV}.tfplan" \
  -input=false

# Step 7: Review (in production, this is a manual step)
echo "Plan saved to ${ENV}.tfplan"
echo "Review the plan above before applying."

# Step 8: Apply (in production, requires approval)
read -p "Apply changes? (yes/no): " CONFIRM
if [ "$CONFIRM" = "yes" ]; then
  tofu apply "${ENV}.tfplan"
  echo "Apply complete!"
else
  echo "Apply cancelled."
  rm "${ENV}.tfplan"
fi
```

## Workflow in CI/CD

```yaml
# .github/workflows/infrastructure.yml
name: Infrastructure Workflow

on:
  push:
    branches: [main]

jobs:
  write-and-validate:
    name: Write & Validate
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: opentofu/setup-opentofu@v1
        with:
          tofu_version: "1.11.6"
      - run: tofu fmt -check -recursive
      - run: tofu init
      - run: tofu validate

  plan:
    name: Plan
    needs: write-and-validate
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: opentofu/setup-opentofu@v1
      - run: tofu init
      - run: tofu plan -out=plan.tfplan
      - uses: actions/upload-artifact@v4
        with:
          name: tfplan
          path: plan.tfplan

  apply:
    name: Apply
    needs: plan
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment: production  # Requires approval in GitHub
    steps:
      - uses: actions/checkout@v4
      - uses: opentofu/setup-opentofu@v1
      - uses: actions/download-artifact@v4
        with:
          name: tfplan
      - run: tofu init
      - run: tofu apply plan.tfplan
```

## State: The Fourth Component

```bash
# State tracks what OpenTofu has created
cat terraform.tfstate

# View state in human-readable format
tofu state list

# View specific resource
tofu state show aws_vpc.main

# State is what makes the plan possible
# (compares desired state with actual state)
```

## Conclusion

The Write-Plan-Apply workflow is the heart of infrastructure as code. Writing configurations declaratively, planning to preview changes, and applying with confidence form a repeatable, auditable process. By saving plans to files and requiring approval in CI/CD, you create a robust process that protects your infrastructure from accidental changes while enabling fast, reliable deployments.
