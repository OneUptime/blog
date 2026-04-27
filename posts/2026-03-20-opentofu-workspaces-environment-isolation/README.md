# How to Use Workspaces for Environment Isolation in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Infrastructure as Code, Workspaces

Description: Learn how to use OpenTofu workspaces to isolate state between environments like development, staging, and production from a single configuration.

## Introduction

Workspaces provide a lightweight mechanism for environment isolation. Each workspace maintains its own state, so resources in `staging` are tracked independently from resources in `production`. The same configuration files manage all environments, with workspace-specific differences handled through variables and the `terraform.workspace` expression.

## Workspace-Per-Environment Pattern

```bash
# Create workspaces for each environment

tofu workspace new development
tofu workspace new staging
tofu workspace new production
```

```hcl
# main.tf - single configuration for all environments
resource "aws_instance" "web" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = local.instance_type

  tags = {
    Name        = "web-${terraform.workspace}"
    Environment = terraform.workspace
  }
}

locals {
  instance_type = {
    development = "t3.micro"
    staging     = "t3.small"
    production  = "t3.large"
  }[terraform.workspace]
}
```

## Environment-Specific Variable Files

```hcl
# variables.tf
variable "instance_count" { type = number }
variable "domain_name"    { type = string }
```

```hcl
# environments/development.tfvars
instance_count = 1
domain_name    = "dev.acme-corp.com"
```

```hcl
# environments/production.tfvars
instance_count = 5
domain_name    = "acme-corp.com"
```

```bash
# Apply per environment
tofu workspace select development
tofu apply -var-file=environments/development.tfvars

tofu workspace select production
tofu apply -var-file=environments/production.tfvars
```

## Conditional Resources per Environment

```hcl
# Only create monitoring in production
resource "aws_cloudwatch_metric_alarm" "high_cpu" {
  count = terraform.workspace == "production" ? 1 : 0

  alarm_name  = "high-cpu-utilization"
  metric_name = "CPUUtilization"
  # ...
}
```

## Separate State per Environment in S3

```text
s3://acme-tofu-state/
├── infrastructure/terraform.tfstate                   (default workspace)
└── env:/
    ├── development/infrastructure/terraform.tfstate
    ├── staging/infrastructure/terraform.tfstate
    └── production/infrastructure/terraform.tfstate
```

## Workspace Validation

```hcl
# Prevent accidental runs on unknown workspaces
locals {
  allowed_workspaces = toset(["development", "staging", "production"])
}

resource "null_resource" "workspace_check" {
  lifecycle {
    precondition {
      condition     = contains(local.allowed_workspaces, terraform.workspace)
      error_message = "Unknown workspace: ${terraform.workspace}. Must be one of: ${join(", ", local.allowed_workspaces)}"
    }
  }
}
```

## CI/CD Deployment Pipeline

```yaml
# GitHub Actions - deploy to environment based on branch
on:
  push:
    branches: [main, staging, develop]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set workspace
        run: |
          if [ "${{ github.ref_name }}" = "main" ]; then
            echo "WORKSPACE=production" >> $GITHUB_ENV
          elif [ "${{ github.ref_name }}" = "staging" ]; then
            echo "WORKSPACE=staging" >> $GITHUB_ENV
          else
            echo "WORKSPACE=development" >> $GITHUB_ENV
          fi

      - name: Deploy
        run: |
          tofu init
          tofu workspace select -or-create $WORKSPACE
          tofu apply -auto-approve \
            -var-file=environments/${WORKSPACE}.tfvars
```

## Conclusion

Workspaces are best suited for environments that share the same configuration structure but differ in size, count, or naming. Use `terraform.workspace` for dynamic values, environment-specific `.tfvars` files for different settings, and conditional `count` expressions for resources that only exist in certain environments. For environments with fundamentally different architectures, consider separate configuration directories instead.
