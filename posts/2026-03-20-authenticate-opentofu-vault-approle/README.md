# How to Authenticate OpenTofu with Vault Using AppRole

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Vault, AppRole, Authentication, Security

Description: Learn how to configure OpenTofu to authenticate with HashiCorp Vault using the AppRole auth method for non-human CI/CD pipelines and automated deployments.

## Introduction

AppRole is Vault's machine-to-machine auth method designed for automated systems. OpenTofu uses a Role ID (non-secret) and Secret ID (secret, typically short-lived) to authenticate and receive a Vault token. This is ideal for CI/CD pipelines where you cannot use human-interactive auth methods.

## Setting Up AppRole in Vault

```hcl
# Configure the AppRole auth method in Vault using OpenTofu

resource "vault_auth_backend" "approle" {
  type = "approle"
  path = "approle"
}

resource "vault_approle_auth_backend_role" "opentofu_cicd" {
  backend               = vault_auth_backend.approle.path
  role_name             = "opentofu-cicd"
  token_policies        = ["opentofu-policy"]
  token_ttl             = 3600   # 1 hour
  token_max_ttl         = 14400  # 4 hours
  secret_id_ttl         = 600    # Secret ID valid for 10 minutes
  secret_id_num_uses    = 1      # Single use
  bind_secret_id        = true
}

# Create a policy for OpenTofu
resource "vault_policy" "opentofu_policy" {
  name = "opentofu-policy"
  policy = <<EOT
path "secret/data/prod/*" {
  capabilities = ["read"]
}
path "aws/creds/opentofu-role" {
  capabilities = ["read"]
}
EOT
}
```

## Configuring OpenTofu to Use AppRole

```hcl
# provider.tf
provider "vault" {
  address = "https://vault.example.com:8200"

  auth_login {
    path = "auth/approle/login"

    parameters = {
      role_id   = var.vault_role_id
      secret_id = var.vault_secret_id
    }
  }
}

variable "vault_role_id" {
  type        = string
  description = "Vault AppRole Role ID"
}

variable "vault_secret_id" {
  type        = string
  sensitive   = true
  description = "Vault AppRole Secret ID"
}
```

## CI/CD Pipeline Integration

```bash
#!/bin/bash
# ci/deploy.sh - Authenticate and run OpenTofu

# Role ID is non-secret, stored in CI/CD environment
VAULT_ROLE_ID="${VAULT_ROLE_ID}"

# Request a fresh Secret ID from Vault (requires separate Vault token)
VAULT_SECRET_ID=$(vault write -force -field=secret_id \
  auth/approle/role/opentofu-cicd/secret-id)

# Run OpenTofu with AppRole credentials
tofu apply \
  -var="vault_role_id=${VAULT_ROLE_ID}" \
  -var="vault_secret_id=${VAULT_SECRET_ID}" \
  -auto-approve

# The Secret ID is now consumed (num_uses = 1)
```

## GitHub Actions Integration

```yaml
# .github/workflows/deploy.yml
name: Deploy with Vault AppRole

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Get Vault Secret ID
        run: |
          # Use the CI Vault token to get a fresh Secret ID
          SECRET_ID=$(vault write -force -field=secret_id \
            auth/approle/role/opentofu-cicd/secret-id)
          echo "VAULT_SECRET_ID=${SECRET_ID}" >> $GITHUB_ENV
        env:
          VAULT_ADDR: ${{ secrets.VAULT_ADDR }}
          VAULT_TOKEN: ${{ secrets.VAULT_BOOTSTRAP_TOKEN }}

      - name: OpenTofu Apply
        run: |
          tofu init
          tofu apply -auto-approve \
            -var="vault_role_id=${{ vars.VAULT_ROLE_ID }}" \
            -var="vault_secret_id=${{ env.VAULT_SECRET_ID }}"
        env:
          VAULT_ADDR: ${{ secrets.VAULT_ADDR }}
```

## Using Environment Variables Instead of Variables

```hcl
# Alternative: authenticate outside OpenTofu and let the provider read
# VAULT_ADDR and VAULT_TOKEN from the environment
provider "vault" {}
```

```bash
# Or export VAULT_ADDR and VAULT_TOKEN directly after logging in
export VAULT_ADDR="https://vault.example.com:8200"
VAULT_TOKEN=$(vault write -field=token auth/approle/login \
  role_id="${VAULT_ROLE_ID}" \
  secret_id="${VAULT_SECRET_ID}")
export VAULT_TOKEN
```

## Response Wrapping for Secure Secret ID Delivery

```bash
# Generate a wrapped Secret ID and capture the wrapping token
WRAPPING_TOKEN=$(vault write -wrap-ttl=60s -field=wrapping_token -force \
  auth/approle/role/opentofu-cicd/secret-id)

# Unwrap to get the actual Secret ID
VAULT_SECRET_ID=$(vault unwrap -field=secret_id "${WRAPPING_TOKEN}")
```

## Conclusion

AppRole authentication gives CI/CD systems a secure, auditable identity in Vault. Use `secret_id_num_uses = 1` and short `secret_id_ttl` values to ensure each pipeline run uses a fresh, single-use credential. Combine with response wrapping to securely deliver the Secret ID across trust boundaries in complex CI/CD systems.
