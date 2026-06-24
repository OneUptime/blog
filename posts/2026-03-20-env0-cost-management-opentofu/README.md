# How to Use env0 for Cost Management with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, env0, Cost Management, FinOps, Infrastructure as Code, DevOps

Description: Learn how to configure env0 to run OpenTofu deployments and leverage its built-in cost estimation and budget enforcement features to keep cloud spend under control.

## Introduction

env0 is a self-service infrastructure automation platform that natively supports OpenTofu. Its cost management features surface Infracost estimates on deployment plans, including pull request plans when enabled, and let platform teams combine project budgets with approval policies to keep cloud spend under control.

## Connecting Your Repository to env0

Create an env0 project and environment via the env0 provider:

```hcl
# env0.tf

terraform {
  required_providers {
    env0 = {
      source  = "env0/env0"
      version = "~> 1.0"
    }
  }
}

provider "env0" {
  # API credentials can be provided with ENV0_API_KEY and ENV0_API_SECRET
}

# Create a project
resource "env0_project" "platform" {
  name = "platform-infrastructure"
}

resource "env0_template_project_assignment" "platform_vpc" {
  project_id  = env0_project.platform.id
  template_id = env0_template.vpc.id
}

# Create an environment that uses OpenTofu
resource "env0_environment" "production" {
  name                       = "production"
  project_id                 = env0_project.platform.id
  template_id                = env0_template.vpc.id
  revision                   = "main"
  approve_plan_automatically = false
  run_plan_on_pull_requests  = true

  depends_on = [env0_template_project_assignment.platform_vpc]
}
```

## Registering an OpenTofu Template

```hcl
resource "env0_template" "vpc" {
  name                   = "aws-vpc"
  type                   = "opentofu"
  repository             = "https://github.com/my-org/infra-repo"
  path                   = "modules/vpc"
  revision               = "main"
  github_installation_id = 12345678 # Replace with your env0 GitHub App installation ID

  # Resolve the OpenTofu version from the template's required_version constraint
  opentofu_version = "RESOLVE_FROM_CODE"
}
```

## Setting Up Cost Estimation

env0 integrates Infracost under the hood. First create an `INFRACOST_API_KEY` secret environment variable in env0, then enable cost estimation at the project level:

```hcl
resource "env0_project_policy" "platform" {
  project_id              = env0_project.platform.id
  include_cost_estimation = true
}
```

Each deployment plan, including pull request plans when enabled, will now include a cost estimate similar to:

```text
Monthly cost estimate: $142.50
  aws_instance.web (t3.medium): $30.22/month
  aws_db_instance.main (db.t3.small): $27.60/month
  aws_nat_gateway.main: $32.40/month
  ...
```

## Budget Policies

Track actual spend with project budgets, and use approval policies if you want to gate deployments based on estimated cost:

```hcl
resource "env0_aws_cost_credentials" "aws" {
  name       = "aws-cost-creds"
  arn        = "arn:aws:iam::123456789012:role/env0-billing-role"
  duration   = 3600
  project_id = env0_project.platform.id
}

resource "env0_project_budget" "platform" {
  project_id = env0_project.platform.id
  amount     = 500
  timeframe  = "MONTHLY"
  thresholds = [80, 100]
}
```

For pre-deployment guardrails, env0 approval policies can inspect `costEstimation.totalMonthlyCost` or `costEstimation.monthlyCostDiff` and deny or pause an apply when a plan exceeds your limit.

## Variable Management for Cost Optimization

Use env0 variable sets to define cost-saving instance types by environment, then assign the relevant set to each environment:

```hcl
resource "env0_variable_set" "dev_cost_controls" {
  name        = "dev-cost-controls"
  description = "Smaller default sizes for development"
  scope       = "project"
  scope_id    = env0_project.platform.id

  variable {
    name   = "instance_type"
    value  = "t3.micro"
    type   = "terraform"
    format = "text"
  }
  variable {
    name   = "rds_instance_class"
    value  = "db.t3.micro"
    type   = "terraform"
    format = "text"
  }
}

resource "env0_variable_set" "prod_cost_controls" {
  name        = "prod-cost-controls"
  description = "Larger default sizes for production"
  scope       = "project"
  scope_id    = env0_project.platform.id

  variable {
    name   = "instance_type"
    value  = "m5.large"
    type   = "terraform"
    format = "text"
  }
  variable {
    name   = "rds_instance_class"
    value  = "db.r5.large"
    type   = "terraform"
    format = "text"
  }
}

resource "env0_variable_set_assignment" "prod_cost_controls" {
  scope    = "environment"
  scope_id = env0_environment.production.id
  set_ids  = [env0_variable_set.prod_cost_controls.id]
}
```

## TTL-Based Auto-Destroy for Ephemeral Environments

Auto-destroying short-lived environments is one of the most effective cost controls. Because env0 expects an absolute TTL timestamp, set it when the environment is created and ignore later TTL drift:

```hcl
resource "env0_environment" "feature_branch" {
  name        = "feature-review"
  project_id  = env0_project.platform.id
  template_id = env0_template.vpc.id
  revision    = "main"

  # Automatically destroy 8 hours from creation time
  ttl = timeadd(timestamp(), "8h")

  lifecycle {
    ignore_changes = [ttl]
  }

  depends_on = [env0_template_project_assignment.platform_vpc]
}
```

## Conclusion

env0 makes cost management a first-class concern in your OpenTofu workflow. Cost estimates surface on every deployment plan, project budgets help track actual spend, approval policies can gate costly changes before apply, and TTL-based auto-destroy keeps ephemeral environments from accumulating idle cloud costs.
