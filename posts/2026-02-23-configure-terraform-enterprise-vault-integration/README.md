# How to Configure Terraform Enterprise with Vault Integration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Terraform Enterprise, Vault, HashiCorp Vault, Secrets, Security

Description: Learn how to integrate Terraform Enterprise with HashiCorp Vault for dynamic credentials, secrets injection, and secure secret management in your Terraform workflows.

---

Terraform configurations frequently need access to secrets - cloud provider credentials, database passwords, API keys, and certificates. Hardcoding these in workspace variables is a security risk, even when marked as sensitive. HashiCorp Vault provides a much better approach: dynamic, short-lived credentials that are generated on demand and automatically revoked when no longer needed.

This guide covers integrating Terraform Enterprise with Vault to eliminate static secrets from your workflows.

## Integration Options

There are several ways to use Vault with TFE:

1. **Vault-backed dynamic credentials**: TFE generates dynamic cloud credentials through Vault at run time (recommended)
2. **Vault provider in Terraform code**: Use the Vault provider to read secrets during plan/apply
3. **Vault agent sidecar**: Inject secrets into the TFE runtime environment

Each approach has different tradeoffs. Dynamic credentials through TFE's native integration is the cleanest option for cloud provider authentication. The Vault provider works well for application-level secrets.

## Setting Up Vault for TFE Integration

### Prerequisites

- HashiCorp Vault instance (self-hosted or HCP Vault)
- Network connectivity between TFE and Vault
- Vault admin access to create policies and auth methods

### Step 1: Enable the JWT Auth Method in Vault

TFE authenticates to Vault using JWT tokens. Configure Vault to trust TFE's JWT issuer:

```bash
# Enable the JWT auth backend for TFE
vault auth enable -path=tfe jwt

# Configure the JWT auth method with TFE's OIDC discovery URL
vault write auth/tfe/config \
  oidc_discovery_url="https://tfe.example.com" \
  bound_issuer="https://tfe.example.com"
```

### Step 2: Create Vault Policies

```hcl
# tfe-aws-policy.hcl
# Policy for generating dynamic AWS credentials
path "aws/creds/tfe-role" {
  capabilities = ["read"]
}

path "aws/sts/tfe-role" {
  capabilities = ["create", "update"]
}

# Policy for reading KV secrets
path "secret/data/tfe/*" {
  capabilities = ["read", "list"]
}

# Policy for database credentials
path "database/creds/tfe-readonly" {
  capabilities = ["read"]
}
```

```bash
# Write the policy to Vault
vault policy write tfe-aws tfe-aws-policy.hcl
```

### Step 3: Create a JWT Auth Role

```bash
# Create a role that maps TFE workspaces to Vault policies
vault write auth/tfe/role/aws-production \
  role_type="jwt" \
  policies="tfe-aws" \
  user_claim="terraform_workspace_id" \
  bound_audiences="vault.workload.identity" \
  bound_claims_type="glob" \
  bound_claims='{"sub":"organization:my-org:project:*:workspace:*:run_phase:*"}' \
  token_ttl="20m" \
  token_max_ttl="1h"

# A more restrictive role for production only
vault write auth/tfe/role/aws-production-restricted \
  role_type="jwt" \
  policies="tfe-aws" \
  user_claim="terraform_workspace_id" \
  bound_audiences="vault.workload.identity" \
  bound_claims='{"sub":"organization:my-org:project:production:workspace:*:run_phase:apply"}' \
  token_ttl="20m" \
  token_max_ttl="30m"
```

### Step 4: Configure Dynamic AWS Credentials in Vault

```bash
# Enable the AWS secrets engine
vault secrets enable aws

# Configure AWS access for Vault
vault write aws/config/root \
  access_key=AKIA... \
  secret_key=... \
  region=us-east-1

# Create a role that generates STS credentials
vault write aws/roles/tfe-role \
  credential_type=assumed_role \
  role_arns="arn:aws:iam::123456789012:role/TerraformExecutionRole" \
  default_sts_ttl="1h" \
  max_sts_ttl="2h"
```

## Configuring TFE Workspaces for Vault

### Vault-Backed Dynamic Credentials

Configure a workspace to use Vault for cloud credentials:

```bash
# Set the workspace to use dynamic credentials via Vault
WS_ID="ws-abc123"

# Enable workload identity for the workspace
curl -s \
  --header "Authorization: Bearer ${TFE_TOKEN}" \
  --header "Content-Type: application/vnd.api+json" \
  --request PATCH \
  "${TFE_URL}/api/v2/workspaces/${WS_ID}" \
  --data '{
    "data": {
      "type": "workspaces",
      "attributes": {
        "setting-overwrites": {
          "execution-mode": false
        }
      }
    }
  }'

# Set Vault-related environment variables on the workspace
# These tell TFE how to authenticate to Vault

# Vault address
curl -s \
  --header "Authorization: Bearer ${TFE_TOKEN}" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  "${TFE_URL}/api/v2/workspaces/${WS_ID}/vars" \
  --data '{
    "data": {
      "type": "vars",
      "attributes": {
        "key": "TFC_VAULT_PROVIDER_AUTH",
        "value": "true",
        "category": "env",
        "sensitive": false
      }
    }
  }'

curl -s \
  --header "Authorization: Bearer ${TFE_TOKEN}" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  "${TFE_URL}/api/v2/workspaces/${WS_ID}/vars" \
  --data '{
    "data": {
      "type": "vars",
      "attributes": {
        "key": "TFC_VAULT_ADDR",
        "value": "https://vault.example.com",
        "category": "env",
        "sensitive": false
      }
    }
  }'

curl -s \
  --header "Authorization: Bearer ${TFE_TOKEN}" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  "${TFE_URL}/api/v2/workspaces/${WS_ID}/vars" \
  --data '{
    "data": {
      "type": "vars",
      "attributes": {
        "key": "TFC_VAULT_RUN_ROLE",
        "value": "aws-production",
        "category": "env",
        "sensitive": false
      }
    }
  }'

curl -s \
  --header "Authorization: Bearer ${TFE_TOKEN}" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  "${TFE_URL}/api/v2/workspaces/${WS_ID}/vars" \
  --data '{
    "data": {
      "type": "vars",
      "attributes": {
        "key": "TFC_VAULT_BACKED_AWS_AUTH",
        "value": "true",
        "category": "env",
        "sensitive": false
      }
    }
  }'

curl -s \
  --header "Authorization: Bearer ${TFE_TOKEN}" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  "${TFE_URL}/api/v2/workspaces/${WS_ID}/vars" \
  --data '{
    "data": {
      "type": "vars",
      "attributes": {
        "key": "TFC_VAULT_BACKED_AWS_RUN_VAULT_ROLE",
        "value": "aws/creds/tfe-role",
        "category": "env",
        "sensitive": false
      }
    }
  }'
```

### Using the Vault Provider Directly

For reading application secrets from Vault in your Terraform code:

```hcl
# Configure the Vault provider
provider "vault" {
  address = var.vault_address
  # Authentication is handled through workspace environment variables
}

# Read a secret from Vault KV
data "vault_kv_secret_v2" "database" {
  mount = "secret"
  name  = "tfe/database-credentials"
}

# Use the secret in your configuration
resource "aws_db_instance" "app" {
  identifier     = "app-database"
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.r6g.large"

  username = data.vault_kv_secret_v2.database.data["username"]
  password = data.vault_kv_secret_v2.database.data["password"]

  # ... other configuration
}

# Generate dynamic database credentials
data "vault_database_credentials" "app_db" {
  backend = "database"
  role    = "tfe-readonly"
}
```

## Using Variable Sets for Vault Configuration

Apply Vault settings across multiple workspaces with a variable set:

```bash
# Create a variable set for Vault configuration
VARSET_ID=$(curl -s \
  --header "Authorization: Bearer ${TFE_TOKEN}" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  "${TFE_URL}/api/v2/organizations/my-org/varsets" \
  --data '{
    "data": {
      "type": "varsets",
      "attributes": {
        "name": "vault-aws-dynamic-credentials",
        "description": "Vault-backed AWS dynamic credentials for all workspaces"
      }
    }
  }' | jq -r '.data.id')

# Add variables to the variable set
for VAR in "TFC_VAULT_PROVIDER_AUTH:true" "TFC_VAULT_ADDR:https://vault.example.com" "TFC_VAULT_BACKED_AWS_AUTH:true"; do
  KEY="${VAR%%:*}"
  VALUE="${VAR##*:}"

  curl -s \
    --header "Authorization: Bearer ${TFE_TOKEN}" \
    --header "Content-Type: application/vnd.api+json" \
    --request POST \
    "${TFE_URL}/api/v2/varsets/${VARSET_ID}/relationships/vars" \
    --data "{
      \"data\": {
        \"type\": \"vars\",
        \"attributes\": {
          \"key\": \"${KEY}\",
          \"value\": \"${VALUE}\",
          \"category\": \"env\",
          \"sensitive\": false
        }
      }
    }" > /dev/null
done

echo "Variable set ${VARSET_ID} created with Vault configuration"
```

## Verifying the Integration

```bash
# Trigger a test run and check for Vault authentication in the logs
# The plan output should show Vault being used for credential generation

# Check Vault audit logs for TFE authentication
vault audit list
vault read sys/audit

# Look for JWT auth entries from TFE
vault read auth/tfe/role/aws-production
```

## Troubleshooting

**"Permission denied" from Vault**: The Vault policy does not grant the required capabilities. Check the policy attached to the JWT auth role.

**"JWT validation failed"**: The Vault JWT auth configuration does not match TFE. Verify the `oidc_discovery_url` and `bound_issuer` are correct.

**"Connection refused"**: TFE cannot reach Vault. Check network connectivity and firewall rules. If Vault uses a private CA, add it to TFE's CA bundle.

**Credentials expired during a long apply**: Increase the `token_ttl` and `default_sts_ttl` for long-running operations. Some infrastructure changes take 30+ minutes.

## Summary

Integrating Vault with Terraform Enterprise eliminates the need for static secrets in your workspaces. Dynamic credentials generated through Vault are short-lived, automatically rotated, and audited. The setup requires configuring JWT authentication in Vault, creating appropriate policies and roles, and setting workspace environment variables in TFE. Once configured, every Terraform run gets fresh credentials that expire after the run completes - a significant security improvement over storing long-lived access keys in workspace variables.
