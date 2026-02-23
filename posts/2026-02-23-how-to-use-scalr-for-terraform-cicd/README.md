# How to Use Scalr for Terraform CI/CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Scalr, CI/CD, Infrastructure as Code, DevOps, Remote Operations

Description: Learn how to use Scalr for Terraform CI/CD with its hierarchical organization model, OPA policies, remote state management, cost estimation, and VCS-driven workflows.

---

Scalr is a Terraform automation and collaboration platform that positions itself as an alternative to Terraform Cloud with more flexibility around organizational structure and policy enforcement. It uses a hierarchical model of accounts, environments, and workspaces that maps well to enterprise organizations. This guide covers setting up Scalr for Terraform CI/CD and getting the most out of its features.

## Scalr's Organizational Model

Scalr uses a three-level hierarchy:

1. **Account** - The top level, representing your organization
2. **Environment** - Maps to a team, business unit, or deployment stage (dev, staging, production)
3. **Workspace** - A single Terraform configuration with its own state

This hierarchy lets you set policies and variables at any level, with inheritance flowing downward:

```
Account (MyCompany)
  |
  |-- Environment: Development
  |     |-- Workspace: dev-networking
  |     |-- Workspace: dev-compute
  |     |-- Workspace: dev-database
  |
  |-- Environment: Production
        |-- Workspace: prod-networking
        |-- Workspace: prod-compute
        |-- Workspace: prod-database
```

## Getting Started

### Connect Your VCS

1. Log into Scalr
2. Navigate to Account Settings > VCS Providers
3. Click "New VCS Provider" and select GitHub, GitLab, or Bitbucket

For GitHub:

```
Provider: GitHub
Name: github-myorg
OAuth Application ID: Ov23xxxxxxxxxx
OAuth Application Secret: xxxxxxxxxx
```

### Create an Environment

```
Account > New Environment

Name: production
Description: Production infrastructure
Cost estimation: Enabled
Policy groups: production-policies
```

### Create a Workspace

```
Environment: production > New Workspace

Name: prod-networking
VCS Provider: github-myorg
Repository: myorg/infrastructure
Branch: main
Terraform Working Directory: environments/production/networking
Terraform Version: 1.7.0

Execution mode: Remote
Auto queue runs: Yes (on VCS changes)
```

## VCS-Driven Workflow

When connected to a VCS provider, Scalr automatically triggers runs on commits and pull requests:

```
Workflow:
1. Developer pushes to feature branch and opens PR
2. Scalr triggers a speculative plan
3. Plan output appears as a PR status check
4. After merge to main, Scalr triggers a plan
5. Plan requires confirmation (or auto-applies based on settings)
6. Apply runs and results are logged
```

Configure the workspace for automatic or manual applies:

```hcl
# Using Scalr Terraform provider to manage workspaces
provider "scalr" {
  hostname = "mycompany.scalr.io"
  token    = var.scalr_token
}

resource "scalr_workspace" "prod_networking" {
  name           = "prod-networking"
  environment_id = scalr_environment.production.id

  vcs_provider_id = scalr_vcs_provider.github.id
  vcs_repo {
    identifier = "myorg/infrastructure"
    branch     = "main"
    path       = "environments/production/networking"
  }

  # Auto-apply after successful plan (disable for production)
  auto_apply = false

  # Terraform version
  terraform_version = "1.7.0"

  # Queue runs on VCS changes
  auto_queue_runs = "always"
}
```

## Cloud Credentials

Scalr manages cloud credentials at the environment or account level:

```hcl
# Create a provider configuration for AWS
resource "scalr_provider_configuration" "aws_production" {
  name       = "aws-production"
  account_id = scalr_account.main.id

  aws {
    account_type     = "regular"
    credentials_type = "role_delegation"
    role_arn         = "arn:aws:iam::123456789012:role/scalr-terraform"
    external_id      = "scalr-external-id"
  }
}

# Link provider configuration to an environment
resource "scalr_provider_configuration_default" "aws_prod" {
  environment_id           = scalr_environment.production.id
  provider_configuration_id = scalr_provider_configuration.aws_production.id
}
```

## Variables at Every Level

Set variables at account, environment, or workspace level:

```hcl
# Account-level variables (apply everywhere)
resource "scalr_variable" "company_name" {
  key          = "TF_VAR_company_name"
  value        = "MyCompany"
  category     = "terraform"
  account_id   = scalr_account.main.id
}

# Environment-level variables
resource "scalr_variable" "env_name" {
  key            = "TF_VAR_environment"
  value          = "production"
  category       = "terraform"
  environment_id = scalr_environment.production.id
}

# Workspace-level variables (most specific)
resource "scalr_variable" "vpc_cidr" {
  key          = "TF_VAR_vpc_cidr"
  value        = "10.0.0.0/16"
  category     = "terraform"
  workspace_id = scalr_workspace.prod_networking.id
}

# Sensitive variables
resource "scalr_variable" "db_password" {
  key          = "TF_VAR_db_password"
  value        = var.db_password
  category     = "terraform"
  sensitive    = true
  workspace_id = scalr_workspace.prod_database.id
}
```

## OPA Policies

Scalr uses Open Policy Agent for policy enforcement:

```rego
# policies/mandatory-tags.rego
# Ensure all resources have required tags

package terraform

import input.tfplan as tfplan

# Required tags for all resources
required_tags := {"Environment", "Team", "ManagedBy"}

# Check that taggable resources have all required tags
deny[reason] {
  resource := tfplan.resource_changes[_]
  resource.change.actions[_] != "delete"

  # Get the tags from the planned state
  tags := object.get(resource.change.after, "tags", {})
  missing := required_tags - {key | tags[key]}
  count(missing) > 0

  reason := sprintf("%s is missing required tags: %v", [resource.address, missing])
}
```

```rego
# policies/cost-control.rego
# Prevent expensive resource types in non-production environments

package terraform

deny[reason] {
  resource := input.tfplan.resource_changes[_]
  resource.type == "aws_instance"
  resource.change.after.instance_type == "r6g.16xlarge"

  not input.scalr.environment.name == "production"

  reason := sprintf("Instance type r6g.16xlarge is only allowed in production. Found in %s", [resource.address])
}
```

Register policies as a policy group:

```hcl
# Create a policy group
resource "scalr_policy_group" "production" {
  name       = "production-policies"
  account_id = scalr_account.main.id

  vcs_provider_id = scalr_vcs_provider.github.id
  vcs_repo {
    identifier = "myorg/terraform-policies"
    branch     = "main"
    path       = "policies/production"
  }
}

# Link to environment
resource "scalr_policy_group_linkage" "prod_policies" {
  environment_id  = scalr_environment.production.id
  policy_group_id = scalr_policy_group.production.id
}
```

## Remote State Sharing

Scalr manages state files and enables cross-workspace state sharing:

```hcl
# In the networking workspace - output the VPC ID
output "vpc_id" {
  value = aws_vpc.main.id
}

# In the compute workspace - reference networking state
data "terraform_remote_state" "networking" {
  backend = "remote"

  config = {
    hostname     = "mycompany.scalr.io"
    organization = "production"
    workspaces = {
      name = "prod-networking"
    }
  }
}

resource "aws_instance" "web" {
  subnet_id = data.terraform_remote_state.networking.outputs.subnet_ids[0]
  # ...
}
```

## Run Triggers

Chain workspace runs so that changes cascade through dependencies:

```hcl
# When networking changes, automatically trigger compute
resource "scalr_workspace" "prod_compute" {
  name           = "prod-compute"
  environment_id = scalr_environment.production.id

  # Trigger a run when networking workspace completes
  run_triggers = [scalr_workspace.prod_networking.id]

  # ... rest of config
}
```

## Module Registry

Scalr includes a private module registry:

```hcl
# Publish a module from VCS
resource "scalr_module" "vpc" {
  account_id      = scalr_account.main.id
  vcs_provider_id = scalr_vcs_provider.github.id

  vcs_repo {
    identifier = "myorg/terraform-aws-vpc"
  }
}
```

Teams can then reference shared modules:

```hcl
# Use a module from the private registry
module "vpc" {
  source  = "mycompany.scalr.io/myorg/vpc/aws"
  version = "~> 2.0"

  cidr_block = var.vpc_cidr
  environment = var.environment
}
```

## CLI-Driven Workflow

Scalr also supports running Terraform from the CLI with remote execution:

```hcl
# backend.tf - Use Scalr as a remote backend
terraform {
  backend "remote" {
    hostname     = "mycompany.scalr.io"
    organization = "production"

    workspaces {
      name = "prod-networking"
    }
  }
}
```

```bash
# Authenticate with Scalr
terraform login mycompany.scalr.io

# Run plan (executes remotely on Scalr)
terraform plan

# Apply (executes remotely on Scalr)
terraform apply
```

## Cost Estimation

Scalr provides cost estimation for plans:

```
Run #42 - prod-compute

Plan: 3 to add, 0 to change, 0 to destroy

Cost estimation:
  Monthly cost: $245.00
  Previous cost: $180.00
  Delta: +$65.00

  Breakdown:
    aws_instance.web (3x t3.large): $196.00/mo
    aws_ebs_volume.data (3x 100GB): $30.00/mo
    aws_eip.web (3x): $10.80/mo
    aws_lb.main: $8.20/mo
```

## Summary

Scalr provides a well-structured platform for Terraform CI/CD with its hierarchical organization model. The ability to set variables and policies at account, environment, and workspace levels makes it particularly suited for larger organizations with multiple teams. The OPA policy engine, cost estimation, and run triggers give you the building blocks for a governance-first approach to infrastructure automation.

For alternative platforms, see our guides on [Spacelift for Terraform CI/CD](https://oneuptime.com/blog/post/2026-02-23-how-to-use-spacelift-for-terraform-cicd/view) and [env0 for Terraform CI/CD](https://oneuptime.com/blog/post/2026-02-23-how-to-use-env0-for-terraform-cicd/view).
