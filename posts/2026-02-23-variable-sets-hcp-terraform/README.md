# How to Use Variable Sets in HCP Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCP Terraform, Variable Sets, Configuration Management, DevOps

Description: Learn how to use variable sets in HCP Terraform to share common variables like credentials and tags across multiple workspaces without duplicating configuration.

---

When you have 20 workspaces and they all need the same AWS credentials, setting the same environment variables on each one individually is a chore. Variable sets solve this problem by letting you define a set of variables once and apply them to multiple workspaces or even your entire organization.

This guide covers creating variable sets, scoping them properly, and using them to keep your workspace configuration DRY.

## What Variable Sets Do

A variable set is a reusable collection of Terraform variables and environment variables. You create it once and attach it to:

- **All workspaces** in an organization (global scope)
- **Specific projects** (applies to all workspaces in those projects)
- **Specific workspaces** (selective scope)

Variables in a variable set behave exactly like workspace-specific variables. They are available during plans and applies, can be marked as sensitive, and support HCL types.

## Creating Variable Sets via the UI

1. Navigate to your organization's **Settings**
2. Click **Variable sets**
3. Click **Create variable set**
4. Configure the variable set:

```
Name: AWS Production Credentials
Description: AWS credentials for production workspaces
Scope: Specific workspaces and projects
```

5. Add variables to the set:

```
# Environment variable - AWS Access Key
Key: AWS_ACCESS_KEY_ID
Value: AKIA...
Category: Environment variable
Sensitive: Yes

# Environment variable - AWS Secret Key
Key: AWS_SECRET_ACCESS_KEY
Value: wJalr...
Category: Environment variable
Sensitive: Yes

# Environment variable - AWS Region
Key: AWS_DEFAULT_REGION
Value: us-east-1
Category: Environment variable
Sensitive: No
```

6. Select the workspaces or projects to apply it to
7. Click **Create variable set**

## Creating Variable Sets with the tfe Provider

```hcl
# Global variable set - applies to all workspaces
resource "tfe_variable_set" "global_tags" {
  name         = "Global Tags"
  description  = "Tags applied to all infrastructure"
  organization = var.organization
  global       = true  # Applies to every workspace
}

resource "tfe_variable" "tag_managed_by" {
  key             = "managed_by"
  value           = "terraform"
  category        = "terraform"
  variable_set_id = tfe_variable_set.global_tags.id
  description     = "Tag indicating Terraform management"
}

resource "tfe_variable" "tag_org" {
  key             = "organization"
  value           = "acme"
  category        = "terraform"
  variable_set_id = tfe_variable_set.global_tags.id
}
```

```hcl
# Scoped variable set - only for specific workspaces
resource "tfe_variable_set" "aws_prod_creds" {
  name         = "AWS Production Credentials"
  description  = "AWS credentials for production account"
  organization = var.organization
  global       = false
}

# Add credentials to the variable set
resource "tfe_variable" "aws_access_key" {
  key             = "AWS_ACCESS_KEY_ID"
  value           = var.prod_aws_access_key
  category        = "env"
  sensitive       = true
  variable_set_id = tfe_variable_set.aws_prod_creds.id
}

resource "tfe_variable" "aws_secret_key" {
  key             = "AWS_SECRET_ACCESS_KEY"
  value           = var.prod_aws_secret_key
  category        = "env"
  sensitive       = true
  variable_set_id = tfe_variable_set.aws_prod_creds.id
}

resource "tfe_variable" "aws_region" {
  key             = "AWS_DEFAULT_REGION"
  value           = "us-east-1"
  category        = "env"
  variable_set_id = tfe_variable_set.aws_prod_creds.id
}

# Attach to specific workspaces
resource "tfe_workspace_variable_set" "prod_networking" {
  workspace_id    = tfe_workspace.prod_networking.id
  variable_set_id = tfe_variable_set.aws_prod_creds.id
}

resource "tfe_workspace_variable_set" "prod_compute" {
  workspace_id    = tfe_workspace.prod_compute.id
  variable_set_id = tfe_variable_set.aws_prod_creds.id
}

resource "tfe_workspace_variable_set" "prod_database" {
  workspace_id    = tfe_workspace.prod_database.id
  variable_set_id = tfe_variable_set.aws_prod_creds.id
}
```

## Attaching Variable Sets to Projects

Projects provide a convenient scope for variable sets. All workspaces in a project automatically inherit the variable set:

```hcl
# Create a project
resource "tfe_project" "production" {
  name         = "Production"
  organization = var.organization
}

# Attach variable set to the project
resource "tfe_project_variable_set" "prod_creds" {
  project_id      = tfe_project.production.id
  variable_set_id = tfe_variable_set.aws_prod_creds.id
}

# Any workspace added to this project gets the credentials automatically
resource "tfe_workspace" "prod_new_service" {
  name         = "production-new-service"
  organization = var.organization
  project_id   = tfe_project.production.id
  # No need to attach credentials - they come from the project variable set
}
```

## Creating Variable Sets via the API

```bash
# Create a variable set
curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  --data '{
    "data": {
      "type": "varsets",
      "attributes": {
        "name": "AWS Staging Credentials",
        "description": "AWS credentials for staging workspaces",
        "global": false
      },
      "relationships": {
        "workspaces": {
          "data": [
            {"type": "workspaces", "id": "ws-abc123"},
            {"type": "workspaces", "id": "ws-def456"}
          ]
        }
      }
    }
  }' \
  "https://app.terraform.io/api/v2/organizations/acme-infrastructure/varsets"
```

## Common Variable Set Patterns

### Per-Account Credential Sets

Create one variable set per cloud account:

```hcl
# Production AWS account credentials
resource "tfe_variable_set" "aws_prod" {
  name         = "AWS Production (Account 111111111111)"
  organization = var.organization
}

# Staging AWS account credentials
resource "tfe_variable_set" "aws_staging" {
  name         = "AWS Staging (Account 222222222222)"
  organization = var.organization
}

# Dev AWS account credentials
resource "tfe_variable_set" "aws_dev" {
  name         = "AWS Dev (Account 333333333333)"
  organization = var.organization
}
```

Each workspace connects to the right account by being attached to the right variable set.

### Shared Configuration Values

```hcl
# Organization-wide configuration
resource "tfe_variable_set" "org_config" {
  name         = "Organization Configuration"
  organization = var.organization
  global       = true
}

resource "tfe_variable" "org_name" {
  key             = "org_name"
  value           = "acme"
  category        = "terraform"
  variable_set_id = tfe_variable_set.org_config.id
}

resource "tfe_variable" "cost_center" {
  key             = "cost_center"
  value           = "CC-1234"
  category        = "terraform"
  variable_set_id = tfe_variable_set.org_config.id
}

resource "tfe_variable" "default_tags" {
  key   = "default_tags"
  value = jsonencode({
    Company   = "Acme Corp"
    ManagedBy = "terraform"
  })
  category        = "terraform"
  hcl             = true
  variable_set_id = tfe_variable_set.org_config.id
}
```

### Provider-Specific Configuration

```hcl
# Datadog monitoring credentials (shared across all monitoring workspaces)
resource "tfe_variable_set" "datadog" {
  name         = "Datadog Credentials"
  organization = var.organization
}

resource "tfe_variable" "dd_api_key" {
  key             = "DATADOG_API_KEY"
  value           = var.datadog_api_key
  category        = "env"
  sensitive       = true
  variable_set_id = tfe_variable_set.datadog.id
}

resource "tfe_variable" "dd_app_key" {
  key             = "DATADOG_APP_KEY"
  value           = var.datadog_app_key
  category        = "env"
  sensitive       = true
  variable_set_id = tfe_variable_set.datadog.id
}
```

## Variable Precedence with Variable Sets

When a variable is defined in multiple places, workspace-specific variables take priority over variable set values:

```
Priority (highest to lowest):
1. Workspace-specific variables
2. Variable sets applied to workspace directly
3. Variable sets applied via project
4. Global variable sets
5. terraform.auto.tfvars files
6. Variable defaults in configuration
```

This means you can set a default in a global variable set and override it on specific workspaces:

```
# Global variable set: instance_type = "t3.micro"
# Production workspace variable: instance_type = "t3.large"
# Result for production workspace: instance_type = "t3.large"
# Result for other workspaces: instance_type = "t3.micro"
```

## Managing Variable Set Membership

List workspaces attached to a variable set:

```bash
curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  "https://app.terraform.io/api/v2/varsets/varset-abc123/relationships/workspaces"
```

Add a workspace to a variable set:

```bash
curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  --data '{
    "data": [
      {"type": "workspaces", "id": "ws-new123"}
    ]
  }' \
  "https://app.terraform.io/api/v2/varsets/varset-abc123/relationships/workspaces"
```

Remove a workspace from a variable set:

```bash
curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request DELETE \
  --data '{
    "data": [
      {"type": "workspaces", "id": "ws-old456"}
    ]
  }' \
  "https://app.terraform.io/api/v2/varsets/varset-abc123/relationships/workspaces"
```

## Wrapping Up

Variable sets eliminate the repetitive work of setting the same variables across multiple workspaces. Use global variable sets for organization-wide values, project-scoped sets for environment-specific credentials, and workspace-specific variables for overrides. The layered precedence system means you can set sensible defaults globally and override them where needed. For most organizations, three to five variable sets cover the majority of use cases: one per cloud account for credentials, one for organization-wide tags, and one for shared monitoring credentials.
