# How to Manage Secrets Safely with Ephemeral Resources in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Ephemeral Resources, Secrets Management, Security, Infrastructure as Code, DevOps

Description: A guide to best practices for managing secrets safely in OpenTofu using ephemeral resources to prevent sensitive data from appearing in state files.

## Introduction

Managing secrets in infrastructure code is one of the most critical security challenges. OpenTofu 1.11 introduced ephemeral resources and write-only attributes, which provide a way to use secrets during deployments without persisting them to state files. This guide covers patterns for safely handling passwords, API keys, certificates, and other sensitive values.

## The Problem with Regular Data Sources

```hcl
# INSECURE: Secret value is stored in state file

data "aws_secretsmanager_secret_version" "db_pass" {
  secret_id = "myapp/db-password"
}

resource "aws_db_instance" "main" {
  password = jsondecode(data.aws_secretsmanager_secret_version.db_pass.secret_string).password
  # Password stored in: terraform.tfstate and remote state backend
}

# Anyone with read access to state can see the password!
```

## The Ephemeral Solution

```hcl
# SECURE: Secret value never enters state file
ephemeral "aws_secretsmanager_secret_version" "db_pass" {
  secret_id = "myapp/db-password"
}

resource "aws_db_instance" "main" {
  password_wo = jsondecode(
    ephemeral.aws_secretsmanager_secret_version.db_pass.secret_string
  ).password
  password_wo_version = 1
}
```

## Pattern 1: Database Credentials

```hcl
ephemeral "aws_secretsmanager_secret_version" "db_creds" {
  secret_id = "${var.environment}/database/credentials"
}

locals {
  db_creds = jsondecode(
    ephemeral.aws_secretsmanager_secret_version.db_creds.secret_string
  )
}

resource "aws_db_instance" "main" {
  identifier        = "myapp-${var.environment}"
  engine            = "postgres"
  engine_version    = "15"
  instance_class    = var.db_instance_class
  allocated_storage = var.db_storage
  db_name           = var.db_name
  username          = var.db_username
  password_wo       = local.db_creds.password
  password_wo_version = var.db_password_version
}
```

## Pattern 2: API Keys for External Services

```hcl
ephemeral "vault_kv_secret_v2" "api_keys" {
  mount = "secret"
  name  = "myapp/${var.environment}/api-keys"
}

locals {
  keys = jsondecode(ephemeral.vault_kv_secret_v2.api_keys.data_json)
}

# Configure external providers with ephemeral keys
provider "datadog" {
  api_key = local.keys.datadog_api_key
  app_key = local.keys.datadog_app_key
}

resource "aws_ssm_parameter" "stripe_key" {
  name             = "/myapp/${var.environment}/stripe-api-key"
  type             = "SecureString"
  value_wo         = local.keys.stripe_api_key
  value_wo_version = var.stripe_key_version
  # Stored encrypted in SSM without persisting plaintext in state
}
```

## Pattern 3: TLS Certificates

Use ephemeral TLS keys only with write-only consumers; one common pattern is to write the key directly to a secret store.

```hcl
# Generate certificate private key ephemerally
ephemeral "tls_private_key" "app_cert" {
  algorithm   = "ECDSA"
  ecdsa_curve = "P256"
}

resource "aws_secretsmanager_secret" "app_cert_key" {
  name = "myapp/${var.environment}/tls/private-key"
}

resource "aws_secretsmanager_secret_version" "app_cert_key" {
  secret_id        = aws_secretsmanager_secret.app_cert_key.id
  secret_string_wo = jsonencode({
    private_key = ephemeral.tls_private_key.app_cert.private_key_pem
  })
  secret_string_wo_version = 1
}
```

## Pattern 4: Secrets Rotation

When a secret rotates, OpenTofu can read the current `AWSCURRENT` version on each run. If you later pass that secret into a write-only attribute, you still need a separate non-ephemeral version field to trigger updates.

```hcl
# Always fetch the current version labeled AWSCURRENT
data "aws_secretsmanager_secret" "app" {
  name = "myapp/${var.environment}/config"
}

ephemeral "aws_secretsmanager_secret_version" "app" {
  secret_id = data.aws_secretsmanager_secret.app.id
  # No version_stage specified = defaults to AWSCURRENT
}

locals {
  app_config = jsondecode(
    ephemeral.aws_secretsmanager_secret_version.app.secret_string
  )
}

provider "datadog" {
  api_key = local.app_config.datadog_api_key
  app_key = local.app_config.datadog_app_key
}
```

## Pattern 5: Vault Dynamic Secrets

Vault dynamic credentials are a good fit for apply-time operations such as migrations, not long-lived resource arguments.

```hcl
# Vault generates unique, time-limited credentials
ephemeral "vault_database_secret" "app" {
  mount = "database"
  name  = "myapp-role"
  # Vault creates a new credential each time
  # Automatically expires after the lease duration
}

resource "terraform_data" "run_migrations" {
  triggers_replace = [var.migration_revision]

  provisioner "local-exec" {
    command = "./scripts/run-migrations.sh"

    environment = {
      PGHOST     = var.db_host
      PGUSER     = ephemeral.vault_database_secret.app.username
      PGPASSWORD = ephemeral.vault_database_secret.app.password
    }
  }
}
```

## Auditing Secret Access

```bash
# Ephemeral resources still generate API calls to secret stores
# These are auditable in:

# AWS CloudTrail for Secrets Manager access:
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventName,AttributeValue=GetSecretValue

# Vault audit logs:
vault audit list -detailed
# If you're using a file audit device, inspect the configured log file:
cat /var/log/vault/audit.log | jq '.request.path'
```

## State File Security Checklist

```bash
# After migration to ephemeral resources:

# 1. Rotate all secrets that were previously in state
#    (for Secrets Manager secrets that already have rotation configured)
aws secretsmanager rotate-secret --secret-id myapp/db-password

# 2. Verify new state doesn't contain sensitive data
tofu state pull | grep -i "password\|secret\|key\|token"
# Inspect any matches carefully; secret names and metadata can create false positives

# 3. Enable state encryption (OpenTofu 1.8+ for variable-based config)
# In tofu configuration for an existing state file:
# terraform {
#   encryption {
#     method "unencrypted" "migrate" {}
#     key_provider "pbkdf2" "main" {
#       passphrase = var.state_passphrase
#     }
#     method "aes_gcm" "main" {
#       keys = key_provider.pbkdf2.main
#     }
#     state {
#       method = method.aes_gcm.main
#       fallback {
#         method = method.unencrypted.migrate
#       }
#     }
#   }
# }
# Run `tofu apply`, then remove the fallback block after migration.
```

## Conclusion

Ephemeral resources represent a major improvement in secrets management for infrastructure as code, but they are not a drop-in replacement for every data source or resource argument. They work best when the provider also offers write-only attributes or another supported ephemeral context such as provider configuration or provisioners. Combine ephemeral resources with write-only attributes, secret rotation, and state encryption for a comprehensive secrets management strategy. The small additional complexity of using ephemeral resources is well worth the significant security improvement they provide.
