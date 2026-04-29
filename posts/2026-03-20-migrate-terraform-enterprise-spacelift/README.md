# How to Migrate from Terraform Enterprise to Spacelift with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Spacelift, Terraform Enterprise, Migration, CI/CD, Infrastructure as Code

Description: Learn how to migrate your infrastructure workflows from Terraform Enterprise to Spacelift using OpenTofu as the underlying execution engine.

## Introduction

Spacelift is a CI/CD platform purpose-built for IaC that supports OpenTofu natively. Migrating from Terraform Enterprise (TFE) to Spacelift with OpenTofu gives you open-source execution, flexible runner configuration, and powerful policy controls without HashiCorp's licensing constraints.

## Phase 1: Audit Terraform Enterprise Configuration

Inventory what you need to migrate.

```bash
# Using the TFE API

TFE_TOKEN="your-token"
TFE_ORG="your-org"
TFE_URL="https://app.terraform.io"

# List all workspaces
curl -s -H "Authorization: Bearer $TFE_TOKEN" \
  "$TFE_URL/api/v2/organizations/$TFE_ORG/workspaces" | \
  jq '.data[].attributes.name'

# Get workspace details including VCS settings
curl -s -H "Authorization: Bearer $TFE_TOKEN" \
  "$TFE_URL/api/v2/organizations/$TFE_ORG/workspaces/my-workspace" | \
  jq '.data.attributes | {name, "terraform-version", "working-directory", "auto-apply"}'
```

## Phase 2: Configure Spacelift Stacks

Create Spacelift stacks corresponding to your TFE workspaces.

```hcl
# spacelift-config/main.tf (manage Spacelift via OpenTofu)
terraform {
  required_providers {
    spacelift = {
      source  = "spacelift-io/spacelift"
      version = "~> 1.0"
    }
  }
}

resource "spacelift_stack" "app_prod" {
  name        = "app-production"
  description = "Production application infrastructure"

  # Point to your Git repository
  repository   = "my-org/infrastructure"
  branch       = "main"
  project_root = "environments/prod"

  # Use OpenTofu instead of Terraform
  terraform_workflow_tool = "OPEN_TOFU"
  terraform_version       = "1.10.0"

  # Equivalent to TFE auto-apply
  autodeploy = false  # require review first

  labels = ["production", "app"]
}
```

## Phase 3: Migrate Workspace Variables

Export variables from TFE and create them in Spacelift.

```bash
# Export TFE workspace variables
curl -s -H "Authorization: Bearer $TFE_TOKEN" \
  "$TFE_URL/api/v2/workspaces/my-workspace-id/vars" | \
  jq '.data[] | {key: .attributes.key, sensitive: .attributes.sensitive, category: .attributes.category}'
```

```hcl
# Create environment variables in Spacelift
resource "spacelift_environment_variable" "aws_region" {
  stack_id = spacelift_stack.app_prod.id
  name     = "AWS_DEFAULT_REGION"
  value    = "us-east-1"
}

# Create sensitive variables (like TFE sensitive vars)
resource "spacelift_environment_variable" "db_password" {
  stack_id  = spacelift_stack.app_prod.id
  name      = "TF_VAR_db_password"
  value     = var.db_password
  write_only = true  # sensitive
}
```

## Phase 4: Migrate State Files

Move state from TFE's managed backend to your own S3 backend.

```bash
# Download state from TFE - first fetch the state version metadata
# to get the hosted download URL, then download the state file.
STATE_URL=$(curl -s -H "Authorization: Bearer $TFE_TOKEN" \
  "$TFE_URL/api/v2/workspaces/my-workspace-id/current-state-version" | \
  jq -r '.data.attributes."hosted-state-download-url"')

curl -s -H "Authorization: Bearer $TFE_TOKEN" "$STATE_URL" \
  -o terraform.tfstate

# Update backend configuration to S3
cat > backend.tf << 'EOF'
terraform {
  backend "s3" {
    bucket  = "my-tofu-state"
    key     = "environments/prod/terraform.tfstate"
    region  = "us-east-1"
    encrypt = true
    use_lockfile = true
  }
}
EOF

# Migrate state to S3
tofu init -migrate-state
```

## Phase 5: Set Up Spacelift Policies

Spacelift uses OPA (Open Policy Agent) for policy-as-code, replacing TFE Sentinel.

```rego
# spacelift/policies/no-destroy.rego
package spacelift

# Deny plans that destroy production resources
deny[sprintf("Destroying %s is not allowed in production", [resource.address])] {
  resource := input.terraform.resource_changes[_]
  resource.change.actions[_] == "delete"
  input.spacelift.stack.labels[_] == "production"
}
```

```hcl
resource "spacelift_policy" "no_destroy_prod" {
  name = "no-destroy-production"
  type = "PLAN"
  body = file("./policies/no-destroy.rego")
}

resource "spacelift_policy_attachment" "no_destroy_prod" {
  policy_id = spacelift_policy.no_destroy_prod.id
  stack_id  = spacelift_stack.app_prod.id
}
```

## Phase 6: Validate and Cut Over

```bash
# Test a plan in Spacelift to verify configuration
# Trigger via Spacelift UI or API

# Once validated, update VCS webhooks to point to Spacelift
# Archive your TFE workspace (don't delete immediately)
```

## Summary

Migrating from Terraform Enterprise to Spacelift with OpenTofu involves creating Spacelift stacks for each TFE workspace, migrating variables and state to your own backends, and replacing TFE Sentinel policies with OPA policies. Spacelift's native OpenTofu support means you can specify OpenTofu versions directly on each stack. The migration can be done incrementally - migrate one workspace at a time and validate before decommissioning TFE workspaces.
