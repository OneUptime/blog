# How to Understand Ephemeral Resources in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Ephemeral Resources, State, Security, Infrastructure as Code, DevOps

Description: A guide to understanding ephemeral resources in OpenTofu, how they differ from regular resources and data sources, and when to use them.

## Introduction

Ephemeral resources are a special type of resource introduced in OpenTofu v1.11 that exist only for the duration of a plan or apply operation. Unlike regular resources (which are persisted to state) or data sources (which store their values in state), ephemeral resources are never written to the state file or plan data. They are ideal for short-lived credentials, temporary tokens, and other sensitive values.

## The Three Resource Types

```hcl
# 1. Regular resource: creates and manages infrastructure, stored in state

resource "aws_s3_bucket" "app" {
  bucket = "myapp-data"
  # Full resource data stored in state
}

# 2. Data source: reads existing data, stored in state
data "aws_vpc" "main" {
  id = var.vpc_id
  # Read values stored in state (security concern for sensitive data)
}

# 3. Ephemeral resource: fetches values, NEVER stored in state
ephemeral "aws_secretsmanager_secret_version" "db_pass" {
  secret_id = "myapp/db-password"
  # Values available during the current phase but never written to state or plan
}
```

## When Ephemeral Resources Are Evaluated

```hcl
# Ephemeral resources follow this lifecycle:
# 1. Validate: OpenTofu validates the configuration first
# 2. Open: OpenTofu opens the ephemeral resource to fetch the value
# 3. Close: OpenTofu closes it when the current phase no longer needs it
#
# If the configuration is not fully known during planning,
# OpenTofu can defer opening the ephemeral resource until apply

ephemeral "vault_generic_secret" "app" {
  path = "secret/myapp/config"
  # Opened before any resource that references it
  # Closed when the current phase no longer needs it
}

# Resources that use ephemeral values must reference them
# only from write-only attributes
resource "aws_db_instance" "main" {
  password_wo         = jsondecode(ephemeral.vault_generic_secret.app.data_json).db_password
  password_wo_version = 1
}
```

## Ephemeral Resource Providers

```hcl
# Providers that support ephemeral resources:
# - AWS (aws_secretsmanager_secret_version, aws_eks_cluster_auth)
# - Vault (vault_kv_secret_v2, vault_aws_access_credentials, etc.)
# - TLS (tls_private_key)
# - Kubernetes (kubernetes_token_request_v1)

# Example: AWS Secrets Manager
ephemeral "aws_secretsmanager_secret_version" "config" {
  secret_id = "myapp/config"
}

# Example: Vault KV v2
ephemeral "vault_kv_secret_v2" "creds" {
  mount = "secret"
  name  = "myapp/credentials"
}

# Example: TLS key generation
ephemeral "tls_private_key" "server" {
  algorithm = "RSA"
  rsa_bits  = 4096
}
```

## What Can Reference Ephemeral Values

```hcl
ephemeral "aws_secretsmanager_secret_version" "secret" {
  secret_id = "myapp/secret"
}

# Resources can use ephemeral values in write-only attributes
resource "aws_db_instance" "main" {
  password_wo         = jsondecode(ephemeral.aws_secretsmanager_secret_version.secret.secret_string).password
  password_wo_version = 1
}

# Locals can reference ephemeral values; the local becomes ephemeral automatically
locals {
  db_password = jsondecode(
    ephemeral.aws_secretsmanager_secret_version.secret.secret_string
  ).password
}

# Provider configurations can use ephemeral values
provider "github" {
  token = ephemeral.aws_secretsmanager_secret_version.secret.secret_string
}
```

## Ephemeral Values Cannot Flow to State

```hcl
ephemeral "tls_private_key" "app" {
  algorithm = "RSA"
  rsa_bits  = 2048
}

# ERROR: Cannot store ephemeral value in regular resource
# resource "aws_ssm_parameter" "key" {
#   value = ephemeral.tls_private_key.app.private_key_pem  # Error!
# }

# Correct: Use write-only attribute if available
resource "aws_secretsmanager_secret" "app" {
  name = "myapp/private-key"
}

resource "aws_secretsmanager_secret_version" "app" {
  secret_id                = aws_secretsmanager_secret.app.id
  secret_string_wo         = ephemeral.tls_private_key.app.private_key_pem
  secret_string_wo_version = 1
}

# Even non-sensitive values derived from an ephemeral resource stay ephemeral
# resource "aws_ssm_parameter" "key_public" {
#   value = ephemeral.tls_private_key.app.public_key_pem  # Error!
# }
```

## Difference from Sensitive Values

```hcl
# sensitive variable: stored in state and plan, but redacted from display
variable "db_password" {
  sensitive = true
  # Still stored - just not shown in terminal output
}

# ephemeral resource: never stored in state
ephemeral "aws_secretsmanager_secret_version" "db_pass" {
  secret_id = "myapp/db-pass"
  # NEVER in state or plan data - stronger security guarantee
}
```

## Re-evaluation in Each Phase

```hcl
# Because ephemeral resources are not stored in state or plans,
# OpenTofu opens them again in each plan/apply phase where they are needed

ephemeral "vault_aws_access_credentials" "deploy" {
  backend = "aws"
  role    = "deploy"
  # Requests fresh credentials each time the phase runs
  # which works well with credential rotation
}
```

## Conclusion

Ephemeral resources are a secure way to handle sensitive values in OpenTofu. By keeping values out of state and plan data, they reduce the risk of secrets appearing in state files or remote state backends. They are opened again whenever a plan or apply phase needs them, which makes them a good fit for credential rotation. Use ephemeral resources for passwords, API keys, temporary tokens, private keys, and any other sensitive value that should not persist beyond a single deployment operation, but remember that ephemeral values are not a blanket protection against disclosure in console or provisioner output. As OpenTofu providers add support for ephemeral resources and write-only attributes, they will likely become a common approach for secrets management in infrastructure as code.
