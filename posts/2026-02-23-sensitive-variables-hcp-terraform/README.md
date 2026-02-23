# How to Use Sensitive Variables in HCP Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCP Terraform, Security, Secrets Management, DevOps

Description: Learn how to handle sensitive variables in HCP Terraform securely, including write-only behavior, integration with secrets managers, and best practices for credential management.

---

Every Terraform deployment needs secrets - API keys, database passwords, private keys, access tokens. HCP Terraform provides a built-in mechanism for handling these through sensitive variables. When you mark a variable as sensitive, it becomes write-only: you can set it, update it, or delete it, but you can never read the value back through the UI or API. The value is only available during plan and apply execution.

This guide covers how to use sensitive variables effectively and how to integrate them with external secrets managers.

## Marking Variables as Sensitive

### Through the UI

When adding or editing a variable in the workspace Variables tab:

1. Click "Add variable"
2. Enter the key and value
3. Check the "Sensitive" checkbox
4. Save

Once saved as sensitive, the value shows as "(sensitive)" in the UI. You cannot reveal it. To change it, you enter a new value and save again.

### Through the tfe Provider

```hcl
resource "tfe_variable" "db_password" {
  key          = "db_password"
  value        = var.database_password
  category     = "terraform"
  sensitive    = true
  workspace_id = tfe_workspace.production.id
  description  = "Database master password"
}

resource "tfe_variable" "aws_secret" {
  key          = "AWS_SECRET_ACCESS_KEY"
  value        = var.aws_secret_key
  category     = "env"
  sensitive    = true
  workspace_id = tfe_workspace.production.id
  description  = "AWS secret access key for production account"
}
```

### Through the API

```bash
curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  --data '{
    "data": {
      "type": "vars",
      "attributes": {
        "key": "database_password",
        "value": "SuperSecretP@ssw0rd!",
        "category": "terraform",
        "sensitive": true,
        "description": "RDS master password"
      }
    }
  }' \
  "https://app.terraform.io/api/v2/workspaces/ws-WORKSPACE_ID/vars"
```

## What Happens During Execution

During a plan or apply, sensitive variables are injected into the execution environment just like regular variables. The difference is in how they appear in output:

```
# Plan output
Terraform will perform the following actions:

  # aws_db_instance.main will be created
  + resource "aws_db_instance" "main" {
      + allocated_storage    = 100
      + engine               = "postgres"
      + engine_version       = "15"
      + instance_class       = "db.r5.large"
      + password             = (sensitive value)
      + username             = "admin"
    }
```

Terraform redacts sensitive values in plan output, state display, and logs. The value `(sensitive value)` appears instead of the actual secret.

## Sensitive Variables in Configuration

Terraform has its own `sensitive` flag on variables, which works alongside HCP Terraform's sensitive marking:

```hcl
variable "db_password" {
  description = "Database master password"
  type        = string
  sensitive   = true  # Terraform-level sensitivity
}

variable "api_key" {
  description = "Third-party API key"
  type        = string
  sensitive   = true
}

resource "aws_db_instance" "main" {
  allocated_storage = 100
  engine            = "postgres"
  engine_version    = "15"
  instance_class    = "db.r5.large"
  username          = "admin"
  password          = var.db_password  # Value is redacted in plan output
}
```

Mark variables as `sensitive = true` in your configuration AND mark them as sensitive in HCP Terraform. The configuration-level flag ensures Terraform redacts the value in plan output, while the HCP Terraform flag ensures the value is write-only in the platform.

## Common Sensitive Variable Patterns

### Cloud Provider Credentials

```hcl
# AWS credentials
resource "tfe_variable" "aws_access_key" {
  key          = "AWS_ACCESS_KEY_ID"
  value        = var.aws_access_key
  category     = "env"
  sensitive    = true
  workspace_id = tfe_workspace.main.id
}

resource "tfe_variable" "aws_secret_key" {
  key          = "AWS_SECRET_ACCESS_KEY"
  value        = var.aws_secret_key
  category     = "env"
  sensitive    = true
  workspace_id = tfe_workspace.main.id
}
```

```hcl
# Azure credentials
resource "tfe_variable" "arm_client_secret" {
  key          = "ARM_CLIENT_SECRET"
  value        = var.azure_client_secret
  category     = "env"
  sensitive    = true
  workspace_id = tfe_workspace.main.id
}

resource "tfe_variable" "arm_client_id" {
  key          = "ARM_CLIENT_ID"
  value        = var.azure_client_id
  category     = "env"
  sensitive    = true
  workspace_id = tfe_workspace.main.id
}
```

```hcl
# GCP credentials
resource "tfe_variable" "google_credentials" {
  key          = "GOOGLE_CREDENTIALS"
  value        = var.gcp_credentials_json
  category     = "env"
  sensitive    = true
  workspace_id = tfe_workspace.main.id
}
```

### Database Passwords

```hcl
resource "tfe_variable" "db_master_password" {
  key          = "db_master_password"
  value        = random_password.db.result
  category     = "terraform"
  sensitive    = true
  workspace_id = tfe_workspace.main.id
}
```

### API Tokens

```hcl
resource "tfe_variable" "github_token" {
  key          = "github_token"
  value        = var.github_token
  category     = "terraform"
  sensitive    = true
  workspace_id = tfe_workspace.main.id
}
```

## Integrating with External Secrets Managers

For organizations that manage secrets in tools like HashiCorp Vault, AWS Secrets Manager, or Azure Key Vault, you have two options:

### Option 1: Fetch Secrets During Terraform Execution

Reference secrets directly in your Terraform configuration using data sources:

```hcl
# Fetch from AWS Secrets Manager during plan/apply
data "aws_secretsmanager_secret_version" "db_password" {
  secret_id = "production/database/master-password"
}

resource "aws_db_instance" "main" {
  engine   = "postgres"
  password = data.aws_secretsmanager_secret_version.db_password.secret_string
}
```

```hcl
# Fetch from HashiCorp Vault
data "vault_generic_secret" "db" {
  path = "secret/production/database"
}

resource "aws_db_instance" "main" {
  engine   = "postgres"
  password = data.vault_generic_secret.db.data["password"]
}
```

This approach means HCP Terraform never stores the secret - it is fetched at runtime. You still need credentials to access the secrets manager, which go in HCP Terraform as sensitive environment variables.

### Option 2: Sync Secrets to HCP Terraform Variables

Use a pipeline to pull secrets from your vault and set them as HCP Terraform variables:

```bash
#!/bin/bash
# sync-secrets.sh - Sync secrets from Vault to HCP Terraform

# Fetch from Vault
DB_PASSWORD=$(vault kv get -field=password secret/production/database)

# Find the variable ID
VAR_ID=$(curl -s \
  --header "Authorization: Bearer $TFC_TOKEN" \
  "https://app.terraform.io/api/v2/workspaces/$WORKSPACE_ID/vars" \
  | jq -r '.data[] | select(.attributes.key == "db_password") | .id')

# Update the variable
curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request PATCH \
  --data "{
    \"data\": {
      \"type\": \"vars\",
      \"attributes\": {
        \"value\": \"$DB_PASSWORD\"
      }
    }
  }" \
  "https://app.terraform.io/api/v2/workspaces/$WORKSPACE_ID/vars/$VAR_ID"
```

Run this script on a schedule to keep HCP Terraform in sync with your secrets manager.

## Dynamic Provider Credentials

HCP Terraform supports dynamic provider credentials that eliminate the need for long-lived secrets entirely:

```hcl
# Configure workload identity for AWS
resource "tfe_workspace" "production" {
  name = "production-app"
  # ... other settings

  # Enable dynamic credentials
}

# Set the role ARN that HCP Terraform will assume
resource "tfe_variable" "tfc_aws_role_arn" {
  key          = "TFC_AWS_PROVIDER_AUTH"
  value        = "true"
  category     = "env"
  workspace_id = tfe_workspace.production.id
}

resource "tfe_variable" "aws_role_arn" {
  key          = "TFC_AWS_RUN_ROLE_ARN"
  value        = "arn:aws:iam::111111111111:role/tfc-production-role"
  category     = "env"
  workspace_id = tfe_workspace.production.id
}
```

With dynamic credentials, HCP Terraform gets short-lived tokens for each run through OIDC federation. No access keys are stored anywhere.

## Sensitive Variables in Variable Sets

Sensitive variables work in variable sets too:

```hcl
resource "tfe_variable_set" "aws_prod" {
  name         = "AWS Production Credentials"
  organization = var.organization
}

resource "tfe_variable" "prod_access_key" {
  key             = "AWS_ACCESS_KEY_ID"
  value           = var.prod_aws_access_key
  category        = "env"
  sensitive       = true
  variable_set_id = tfe_variable_set.aws_prod.id
}

# Applied to all production workspaces
resource "tfe_project_variable_set" "prod" {
  project_id      = tfe_project.production.id
  variable_set_id = tfe_variable_set.aws_prod.id
}
```

## Best Practices

1. **Mark everything that is secret as sensitive.** API keys, passwords, tokens, private keys, connection strings - if it should not be visible, mark it sensitive.

2. **Use dynamic credentials when possible.** They eliminate stored secrets entirely and are the most secure option.

3. **Rotate secrets regularly.** Update sensitive variables when you rotate credentials. Automate this with a script that pulls from your secrets manager.

4. **Audit variable access.** HCP Terraform's audit logs show who modified variables. Review these periodically.

5. **Do not put secrets in `.tfvars` files** committed to version control. Use workspace variables or variable sets instead.

6. **Use variable sets for shared credentials** rather than duplicating the same secret across multiple workspaces.

7. **Set `sensitive = true` on the Terraform variable definition** too, not just in HCP Terraform. This ensures the value is redacted in plan output regardless of where Terraform runs.

## Wrapping Up

Sensitive variables in HCP Terraform provide a straightforward way to handle secrets. The write-only behavior means credentials cannot be extracted through the UI or API. For stronger security, integrate with external secrets managers or use dynamic provider credentials to eliminate stored secrets entirely. The key principle is to minimize where secrets exist and for how long. Start with sensitive variables, graduate to dynamic credentials, and automate rotation for anything in between.
