# How to Handle API Keys in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, API Keys, Security, Secrets, IaC, DevOps

Description: Learn the best practices for handling API keys in Terraform configurations, including secure storage, retrieval from secret managers, rotation strategies, and common anti-patterns to avoid.

---

API keys are everywhere in infrastructure configurations. You need them for third-party services like monitoring tools, DNS providers, CDN configurations, and notification systems. Terraform often needs these keys to create and manage resources, which creates a security challenge. This guide covers how to handle API keys safely throughout the Terraform lifecycle.

## Why API Keys Are Tricky in Terraform

API keys present specific challenges compared to other secrets:

- They are often long-lived (unlike database passwords that can be rotated easily)
- They may have broad permissions across an entire service
- Multiple teams may need the same key
- Some providers require the key in the provider configuration itself, not just in resources
- Revoking a key can break multiple systems simultaneously

## Anti-Patterns to Avoid

Let us get the obvious mistakes out of the way:

```hcl
# NEVER: Hardcoded API key in configuration
provider "datadog" {
  api_key = "abc123def456"  # This will end up in version control
  app_key = "xyz789uvw012"
}

# NEVER: API key in a committed tfvars file
# terraform.tfvars (if committed to git)
# datadog_api_key = "abc123def456"

# NEVER: API key in a Terraform output without sensitive flag
output "api_key" {
  value = var.api_key  # Visible in plan output and state
}
```

## Pattern 1: Environment Variables

The simplest secure approach is passing API keys via environment variables:

```bash
# Set the API key in your environment
export TF_VAR_datadog_api_key="abc123def456"
export TF_VAR_datadog_app_key="xyz789uvw012"

# Some providers read their own environment variables directly
export DATADOG_API_KEY="abc123def456"
export DATADOG_APP_KEY="xyz789uvw012"
```

```hcl
# Variable declaration (no default value)
variable "datadog_api_key" {
  type        = string
  description = "Datadog API key"
  sensitive   = true
}

variable "datadog_app_key" {
  type        = string
  description = "Datadog application key"
  sensitive   = true
}

provider "datadog" {
  api_key = var.datadog_api_key
  app_key = var.datadog_app_key
}
```

Many Terraform providers support their own environment variables for authentication, which keeps the keys entirely out of the Terraform configuration:

```bash
# Provider-specific environment variables
export DATADOG_API_KEY="..."     # Datadog
export CLOUDFLARE_API_TOKEN="..."  # Cloudflare
export PAGERDUTY_TOKEN="..."     # PagerDuty
export GITHUB_TOKEN="..."        # GitHub
export NEW_RELIC_API_KEY="..."   # New Relic
```

```hcl
# Provider with no explicit credential configuration
# (reads from environment variables automatically)
provider "datadog" {}
provider "cloudflare" {}
provider "pagerduty" {}
```

## Pattern 2: Secret Manager Retrieval

Fetch API keys from your secret store at plan/apply time:

```hcl
# AWS Secrets Manager
data "aws_secretsmanager_secret_version" "datadog" {
  secret_id = "production/datadog/api-keys"
}

locals {
  datadog_keys = jsondecode(data.aws_secretsmanager_secret_version.datadog.secret_string)
}

provider "datadog" {
  api_key = local.datadog_keys["api_key"]
  app_key = local.datadog_keys["app_key"]
}
```

```hcl
# HashiCorp Vault
data "vault_kv_secret_v2" "datadog" {
  mount = "secret"
  name  = "production/datadog"
}

provider "datadog" {
  api_key = data.vault_kv_secret_v2.datadog.data["api_key"]
  app_key = data.vault_kv_secret_v2.datadog.data["app_key"]
}
```

```hcl
# Azure Key Vault
data "azurerm_key_vault_secret" "datadog_api_key" {
  name         = "datadog-api-key"
  key_vault_id = data.azurerm_key_vault.main.id
}

data "azurerm_key_vault_secret" "datadog_app_key" {
  name         = "datadog-app-key"
  key_vault_id = data.azurerm_key_vault.main.id
}

provider "datadog" {
  api_key = data.azurerm_key_vault_secret.datadog_api_key.value
  app_key = data.azurerm_key_vault_secret.datadog_app_key.value
}
```

## Pattern 3: Managing API Keys as Resources

Sometimes Terraform creates API keys as part of infrastructure provisioning:

```hcl
# Create a Datadog API key
resource "datadog_api_key" "terraform" {
  name = "terraform-managed"
}

# Create a Cloudflare API token with specific permissions
resource "cloudflare_api_token" "terraform" {
  name = "terraform-dns-management"

  policy {
    permission_groups = [
      data.cloudflare_api_token_permission_groups.all.zone["DNS Write"],
      data.cloudflare_api_token_permission_groups.all.zone["Zone Read"]
    ]
    resources = {
      "com.cloudflare.api.account.zone.*" = "*"
    }
  }
}

# Store the created API key in a secret manager
resource "aws_secretsmanager_secret" "cloudflare_token" {
  name = "production/cloudflare/terraform-token"
}

resource "aws_secretsmanager_secret_version" "cloudflare_token" {
  secret_id     = aws_secretsmanager_secret.cloudflare_token.id
  secret_string = cloudflare_api_token.terraform.value
}
```

## Pattern 4: SOPS for Encrypted Files

If your team prefers file-based secret management, SOPS encrypts files that can be committed to version control:

```bash
# Create a secrets file
cat > api-keys.json << 'EOF'
{
    "datadog_api_key": "abc123def456",
    "datadog_app_key": "xyz789uvw012",
    "cloudflare_token": "cf-token-value"
}
EOF

# Encrypt with SOPS
sops --encrypt api-keys.json > api-keys.enc.json
rm api-keys.json

# Commit the encrypted file
git add api-keys.enc.json
```

```hcl
# Use the SOPS provider to decrypt at runtime
data "sops_file" "api_keys" {
  source_file = "api-keys.enc.json"
}

provider "datadog" {
  api_key = data.sops_file.api_keys.data["datadog_api_key"]
  app_key = data.sops_file.api_keys.data["datadog_app_key"]
}
```

## Scoping API Keys

Apply the principle of least privilege to API keys:

```hcl
# BAD: Using an admin API key for a specific task
provider "github" {
  token = var.github_admin_token  # Full admin access
}

# GOOD: Create a scoped token for the specific use case
provider "github" {
  token = var.github_repo_token  # Only repo access
}
```

When creating API keys through Terraform, scope them to the minimum required permissions:

```hcl
# Create a scoped service account key for GCP
resource "google_service_account" "terraform" {
  account_id   = "terraform-deployer"
  display_name = "Terraform Deployer"
}

# Only grant the permissions Terraform needs
resource "google_project_iam_member" "terraform_roles" {
  for_each = toset([
    "roles/compute.admin",
    "roles/storage.admin",
    # Only the roles you actually need
  ])

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.terraform.email}"
}
```

## Rotating API Keys

API key rotation requires coordination. Here is a pattern that avoids downtime:

```hcl
# Step 1: Create a new key alongside the old one
resource "datadog_api_key" "current" {
  name = "terraform-current"
}

resource "datadog_api_key" "previous" {
  name = "terraform-previous"

  lifecycle {
    create_before_destroy = true
  }
}

# Step 2: Update applications to use the new key
resource "aws_secretsmanager_secret_version" "datadog_key" {
  secret_id     = aws_secretsmanager_secret.datadog.id
  secret_string = datadog_api_key.current.key
}

# Step 3: After confirming applications work, the old key can be removed
```

For CI/CD-driven rotation:

```bash
#!/bin/bash
# scripts/rotate-api-key.sh

# Create a new API key
NEW_KEY=$(curl -s -X POST "https://api.datadoghq.com/api/v2/api_keys" \
  -H "DD-API-KEY: ${CURRENT_API_KEY}" \
  -H "DD-APPLICATION-KEY: ${APP_KEY}" \
  -d '{"data":{"type":"api_keys","attributes":{"name":"terraform-rotated"}}}' | jq -r '.data.attributes.key')

# Update the secret store
aws secretsmanager put-secret-value \
  --secret-id production/datadog/api-key \
  --secret-string "$NEW_KEY"

# Wait for applications to pick up the new key
sleep 60

# Revoke the old key
curl -s -X DELETE "https://api.datadoghq.com/api/v2/api_keys/${OLD_KEY_ID}" \
  -H "DD-API-KEY: ${NEW_KEY}" \
  -H "DD-APPLICATION-KEY: ${APP_KEY}"
```

## CI/CD Integration

```yaml
# GitHub Actions with API keys from secrets
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3

      - name: Terraform Apply
        run: terraform apply -auto-approve
        env:
          # Pass API keys as provider-specific env vars
          DATADOG_API_KEY: ${{ secrets.DATADOG_API_KEY }}
          DATADOG_APP_KEY: ${{ secrets.DATADOG_APP_KEY }}
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          # Or as TF_VAR_ variables
          TF_VAR_pagerduty_token: ${{ secrets.PAGERDUTY_TOKEN }}
```

## Auditing API Key Usage

Track which API keys are in use and where:

```hcl
# Tag resources with the API key identifier (not the value)
locals {
  api_key_metadata = {
    key_id     = "terraform-deploy-key"
    created_by = "terraform"
    rotation   = "quarterly"
  }
}

# Include metadata in resource tags for tracking
resource "aws_instance" "web" {
  # ...
  tags = merge(var.common_tags, {
    managed_api_keys = "datadog,cloudflare"
  })
}
```

## Monitoring Your Services

API keys often connect your infrastructure to monitoring and alerting services. [OneUptime](https://oneuptime.com) provides uptime monitoring and incident management that does not require complex API key management - it monitors your endpoints externally, giving you visibility without the credential overhead.

## Conclusion

Handling API keys in Terraform comes down to a few principles: never hardcode them, use environment variables or secret managers, scope them to minimum permissions, and plan for rotation. The specific approach depends on your tooling and team size, but even the simplest pattern - environment variables with the `sensitive` flag - is vastly better than hardcoded values.

For more on Terraform security, see our guides on [handling TLS certificates](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-tls-certificates-in-terraform/view) and [using OIDC for provider authentication](https://oneuptime.com/blog/post/2026-02-23-how-to-use-oidc-for-provider-authentication-in-terraform/view).
