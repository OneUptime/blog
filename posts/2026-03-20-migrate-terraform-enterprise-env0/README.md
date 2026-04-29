# How to Migrate from Terraform Enterprise to env0 with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, env0, Terraform Enterprise, Migration, CI/CD, Infrastructure as Code

Description: Learn how to migrate your infrastructure workflows from Terraform Enterprise to env0 using OpenTofu as the deployment engine.

## Introduction

env0 is a self-service cloud management platform that supports OpenTofu natively. It provides features comparable to Terraform Enterprise - workspace management, variable management, approval workflows, RBAC, and cost estimation - while supporting open-source execution engines. Migrating to env0 with OpenTofu removes licensing costs and vendor lock-in.

## Phase 1: Map TFE Workspaces to env0 Environments

env0 uses "environments" where TFE uses "workspaces."

```bash
# Export TFE workspace inventory

curl -s -H "Authorization: Bearer $TFE_TOKEN" \
  "https://app.terraform.io/api/v2/organizations/$TFE_ORG/workspaces" | \
  jq -r '.data[] | [.attributes.name, .attributes["terraform-version"], .attributes["working-directory"]] | @csv'

# Example output:
# "app-production","1.5.7","environments/prod"
# "app-staging","1.5.7","environments/staging"
# "networking","1.5.7","modules/networking"
```

## Phase 2: Configure env0 Templates

Create env0 templates (equivalent to TFE workspace templates) via the env0 provider.

```hcl
# env0-config/main.tf
terraform {
  required_providers {
    env0 = {
      source  = "env0/env0"
      version = "~> 1.0"
    }
  }
}

resource "env0_template" "app_infra" {
  name        = "Application Infrastructure"
  description = "Deploys application infrastructure stack"

  repository   = "https://github.com/my-org/infrastructure"
  path         = "environments/"
  opentofu_version  = "1.10.0"
  type         = "opentofu"  # Use OpenTofu engine

  # Require plan approval before apply
  github_installation_id = var.github_installation_id
}
```

## Phase 3: Create env0 Projects and Environments

Organize environments under projects (similar to TFE organizations/projects).

```hcl
resource "env0_project" "app" {
  name        = "Application"
  description = "Application infrastructure environments"
}

resource "env0_environment" "app_prod" {
  name        = "app-production"
  project_id  = env0_project.app.id
  template_id = env0_template.app_infra.id

  # Equivalent to TFE workspace variables
  configuration {
    name  = "TF_VAR_environment"
    value = "prod"
  }

  configuration {
    name         = "AWS_ACCESS_KEY_ID"
    value        = var.aws_access_key_id
    is_sensitive = true
  }

  # Set workspace-specific path
  workspace = "environments/prod"
}
```

## Phase 4: Migrate State from TFE

Download state from TFE and configure a remote backend for env0.

```bash
# Download state from TFE workspace (two-step flow)
WORKSPACE_ID="ws-xxxxxxxxxxxxx"

# 1. Fetch the current state version metadata and extract the hosted download URL
DOWNLOAD_URL=$(curl -s -H "Authorization: Bearer $TFE_TOKEN" \
  -H "Content-Type: application/vnd.api+json" \
  "https://app.terraform.io/api/v2/workspaces/$WORKSPACE_ID/current-state-version" | \
  jq -r '.data.attributes."hosted-state-download-url"')

# 2. Download the raw state from the archivist URL
curl -s -H "Authorization: Bearer $TFE_TOKEN" "$DOWNLOAD_URL" -o terraform.tfstate

# Verify the state file
tofu state list -state=terraform.tfstate
```

```hcl
# Update backend to S3 (env0 uses your own backend)
terraform {
  backend "s3" {
    bucket       = "my-tofu-state"
    key          = "environments/prod/terraform.tfstate"
    region       = "us-east-1"
    encrypt      = true
    use_lockfile = true
  }
}
```

```bash
# Migrate state
tofu init -migrate-state
```

## Phase 5: Configure Approval Workflows

Set up approval policies in env0 to replace TFE run approvals.

```hcl
# env0 approval policies are OPA policies stored in a Git repository.
# The resource references the repo + path; rules live in the policy file there.
resource "env0_approval_policy" "prod_approval" {
  name       = "Production Approval Required"
  repository = "https://github.com/my-org/env0-policies"
  path       = "approval/production"
}

resource "env0_approval_policy_assignment" "prod" {
  scope        = "PROJECT"
  scope_id     = env0_project.app.id
  blueprint_id = env0_approval_policy.prod_approval.id
}
```

## Phase 6: Migrate RBAC Settings

Replicate TFE team permissions in env0.

```hcl
resource "env0_team" "infrastructure_team" {
  name = "Infrastructure Team"
}

resource "env0_project_policy" "app_policy" {
  project_id              = env0_project.app.id
  number_of_environments  = 10
  requires_approval_default = false
}

resource "env0_team_project_assignment" "infra_app" {
  team_id    = env0_team.infrastructure_team.id
  project_id = env0_project.app.id
  role       = "Deployer"
}
```

## Phase 7: Validate and Cut Over

```bash
# Trigger a test deployment in env0
# Verify plan output matches expectations

# Once validated, configure VCS webhooks to trigger env0 instead of TFE
# Lock TFE workspaces to prevent accidental applies
# Migrate remaining workspaces incrementally
```

## Summary

Migrating from Terraform Enterprise to env0 with OpenTofu involves creating env0 templates and environments matching your TFE workspaces, migrating state files from TFE's managed backend to your own S3 backend, and replicating approval workflows and RBAC configuration. env0's native OpenTofu support means you simply set `type = "opentofu"` on templates. Migrate incrementally - one environment at a time - to minimize risk and validate each migration before decommissioning TFE workspaces.
