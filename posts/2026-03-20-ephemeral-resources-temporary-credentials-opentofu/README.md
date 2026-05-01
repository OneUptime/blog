# How to Use Ephemeral Resources for Temporary Credentials in OpenTofu - Opentofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Ephemeral Resources, Temporary Credentials, Secret, Infrastructure as Code, DevOps

Description: A guide to using ephemeral resources in OpenTofu to obtain and use temporary credentials without persisting sensitive values in state.

## Introduction

Ephemeral resources in OpenTofu (available in v1.11 and later) are a special type of resource that exist only during the current plan/apply operation and are never written to state. They are ideal for obtaining temporary credentials, short-lived tokens, and other sensitive values that should not persist beyond a single operation.

## What Makes Ephemeral Resources Different

```hcl
# Regular data source: values stored in state

data "aws_secretsmanager_secret_version" "db_pass" {
  secret_id = "myapp/db-password"
  # Value is stored in OpenTofu state - SECURITY RISK
}

# Ephemeral resource: values NOT stored in state
ephemeral "aws_secretsmanager_secret_version" "db_pass" {
  secret_id = "myapp/db-password"
  # Value is used during the current operation but never written to state
}
```

## Vault Temporary Credentials

```hcl
# Generate temporary AWS STS credentials from Vault
ephemeral "vault_aws_access_credentials" "deploy" {
  backend = "aws"
  role    = "deploy-role"
  type    = "sts"
  ttl     = "1h"
}

# Use temporary credentials to configure AWS provider
provider "aws" {
  alias      = "temporary"
  access_key = ephemeral.vault_aws_access_credentials.deploy.access_key
  secret_key = ephemeral.vault_aws_access_credentials.deploy.secret_key
  token      = ephemeral.vault_aws_access_credentials.deploy.security_token
  region     = var.region
}

resource "aws_s3_bucket" "deploy" {
  provider = aws.temporary
  bucket   = "deploy-artifacts-${var.environment}"
}
```

## Database Password from Secrets Manager

```hcl
# Fetch DB password ephemerally - not stored in state
ephemeral "aws_secretsmanager_secret_version" "db_password" {
  secret_id = "myapp/${var.environment}/db-password"
}

resource "aws_db_instance" "main" {
  identifier          = "myapp-${var.environment}"
  engine              = "postgres"
  instance_class      = "db.t3.micro"
  allocated_storage   = 20
  username            = "appadmin"
  skip_final_snapshot = true

  # Password is passed through a write-only attribute and not stored in state
  password_wo = jsondecode(
    ephemeral.aws_secretsmanager_secret_version.db_password.secret_string
  ).password
  password_wo_version = 1
}
```

## Kubernetes Service Account Token

```hcl
# Service account that will receive the temporary token
resource "kubernetes_service_account_v1" "deploy" {
  metadata {
    name      = "deploy"
    namespace = "default"
  }
}

# Request a short-lived Kubernetes token
ephemeral "kubernetes_token_request_v1" "deploy" {
  metadata {
    name      = kubernetes_service_account_v1.deploy.metadata[0].name
    namespace = kubernetes_service_account_v1.deploy.metadata[0].namespace
  }

  spec {
    audiences          = ["https://kubernetes.default.svc"]
    expiration_seconds = 3600
  }
}

# Use the token to configure a scoped Kubernetes provider
provider "kubernetes" {
  alias                  = "deploy"
  host                   = var.cluster_endpoint
  cluster_ca_certificate = file(var.cluster_ca_certificate_path)
  token                  = ephemeral.kubernetes_token_request_v1.deploy.token
}

resource "kubernetes_config_map_v1" "app" {
  provider = kubernetes.deploy

  metadata {
    name      = "my-app-config"
    namespace = "default"
  }

  data = {
    environment = var.environment
  }
}
```

## SSH Keys for Provisioning

```hcl
# Generate ephemeral SSH key for one-time provisioning
ephemeral "tls_private_key" "provisioner" {
  algorithm = "ED25519"
}

# Store the private key without persisting it in state
resource "aws_secretsmanager_secret" "provisioner_key" {
  name = "myapp/${var.deployment_id}/provisioner-ssh-key"
}

resource "aws_secretsmanager_secret_version" "provisioner_key" {
  secret_id                = aws_secretsmanager_secret.provisioner_key.id
  secret_string_wo         = ephemeral.tls_private_key.provisioner.private_key_openssh
  secret_string_wo_version = 1
}
```

## OIDC Tokens for CI/CD

```hcl
# CI injects the short-lived OIDC token at runtime
variable "github_actions_oidc_token" {
  type      = string
  sensitive = true
  ephemeral = true
}

# Configure AWS provider with OIDC (no long-lived credentials)
provider "aws" {
  region = var.region

  assume_role_with_web_identity {
    role_arn           = "arn:aws:iam::${var.account_id}:role/GitHubActionsRole"
    web_identity_token = var.github_actions_oidc_token
    session_name       = "github-actions-deploy"
  }
}
```

## Checking State for Sensitive Data

```bash
# With regular data sources, secret values can appear in state
tofu state pull | grep -i password

# Ephemeral resource values do not appear in state, although other
# sensitive fields still can
tofu state show aws_db_instance.main
# write-only fields are null if shown at all; the secret value is not persisted
```

## Ephemeral Resource Lifecycle

```hcl
# Ephemeral resources:
# 1. Are opened during the current plan/apply phase when fully known
# 2. Their values are available only during the current operation
# 3. Are closed when they are no longer needed in that phase
# 4. Are NEVER written to state or plan
# 5. May be deferred to apply if dependencies are unknown during planning

ephemeral "vault_kv_secret_v2" "app_secrets" {
  mount = "secret"
  name  = "myapp/${var.environment}"
  # Values are available only for the current operation
  # OpenTofu may defer opening until apply if dependencies are unknown
}
```

## Conclusion

Ephemeral resources solve the fundamental security problem with traditional data sources: sensitive values being persisted to state files. By using ephemeral resources for temporary credentials, API tokens, and passwords, you ensure that these values are available only during the current OpenTofu operation and are never written to state or plan. This makes your infrastructure deployments more secure, especially in environments where state files are stored remotely and accessible to multiple team members. Use ephemeral resources whenever you need to use sensitive credentials to configure resources but don't want those credentials to persist in state.
