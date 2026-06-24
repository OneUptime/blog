# How to Use Ephemeral Resources Introduced in OpenTofu 1.11

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Ephemeral Resources, OpenTofu 1.11, Secrets Management, Infrastructure as Code

Description: Learn how to use ephemeral resources introduced in OpenTofu 1.11 to retrieve short-lived credentials and secrets without storing them in state.

## Introduction

OpenTofu 1.11 introduced ephemeral resources - a new resource kind that is opened and closed during a plan or apply phase but never written to state or plan files. This makes them ideal for retrieving short-lived credentials, rotating secrets, or accessing values that should never be persisted, as long as the provider supports an ephemeral resource for that use case.

## Declaring an Ephemeral Resource

Ephemeral resources use the `ephemeral` block instead of `resource`.

```hcl
# Retrieve an AWS Secrets Manager secret without storing it in state or plan

ephemeral "aws_secretsmanager_secret_version" "db_password" {
  secret_id = "prod/myapp/db-password"
}

# Use the secret value in a resource
resource "aws_db_instance" "main" {
  identifier          = "myapp-prod"
  engine              = "postgres"
  instance_class      = "db.t3.micro"
  allocated_storage   = 20
  username            = "myapp"
  skip_final_snapshot = true
  # The password is retrieved ephemerally and passed through a write-only argument
  password_wo         = ephemeral.aws_secretsmanager_secret_version.db_password.secret_string
  password_wo_version = 1
}
```

## Ephemeral vs Regular Data Sources

Regular `data` sources are stored in state; ephemeral resources are not written to state or plan files.

```hcl
# Regular data source - value IS stored in state (avoid for secrets)
data "aws_secretsmanager_secret_version" "api_key" {
  secret_id = "prod/myapp/api-key"
}

# Ephemeral resource - value is NOT stored in state (preferred for secrets)
ephemeral "aws_secretsmanager_secret_version" "api_key" {
  secret_id = "prod/myapp/api-key"
}
```

## Ephemeral Credentials for Provider Configuration

Use ephemeral resources to configure providers with short-lived credentials.

```hcl
# Read short-lived AWS credentials from Vault's AWS secrets engine
ephemeral "vault_aws_access_credentials" "cross_account" {
  backend = "aws"
  role    = "deploy-role"
  type    = "sts"
  region  = "us-east-1"
}

provider "aws" {
  alias      = "cross_account"
  region     = "us-east-1"
  access_key = ephemeral.vault_aws_access_credentials.cross_account.access_key
  secret_key = ephemeral.vault_aws_access_credentials.cross_account.secret_key
  token      = ephemeral.vault_aws_access_credentials.cross_account.security_token
}
```

## Retrieving Vault Secrets Ephemerally

Fetch HashiCorp Vault secrets without leaving traces in state.

```hcl
ephemeral "vault_kv_secret_v2" "app_config" {
  mount = "secret"
  name  = "myapp/prod"
}

resource "kubernetes_secret_v1" "app_config" {
  metadata {
    name      = "myapp-config"
    namespace = "production"
  }

  data_wo = {
    database_url = ephemeral.vault_kv_secret_v2.app_config.data["database_url"]
    api_key      = ephemeral.vault_kv_secret_v2.app_config.data["api_key"]
  }

  data_wo_revision = 1
}
```

## Ephemeral Resource Lifecycle

Ephemeral resources have a distinct lifecycle compared to regular resources.

```text
Plan/Apply lifecycle:

1. OpenTofu validates the ephemeral resource configuration
2. If the configuration is fully known for the current phase, OpenTofu opens the ephemeral resource and retrieves its value
3. OpenTofu keeps the value in memory only for as long as it is needed in that phase
4. OpenTofu closes the ephemeral resource when it is no longer needed
5. If the configuration is not fully known during planning, OpenTofu defers opening the resource until apply

This means:
- No secret leakage into state or plan files
- No risk of secrets in state backups
- Credentials can be fetched during plan or apply, depending on when their inputs become known
```

## Validating Ephemeral Resources

Use lifecycle postconditions to validate that an ephemeral resource returned the value you expect.

```hcl
ephemeral "aws_secretsmanager_secret_version" "health_check" {
  secret_id = "prod/myapp/health-check-token"

  lifecycle {
    postcondition {
      condition     = self.secret_string != ""
      error_message = "Health check secret is not accessible"
    }
  }
}
```

## Summary

Ephemeral resources in OpenTofu 1.11 solve a long-standing problem with secrets management in IaC - sensitive values leaking into state and plan files. By using the `ephemeral` block for secrets, credentials, and short-lived tokens, you keep those values out of persisted OpenTofu artifacts while still using dynamic values during plan and apply. When the provider and target resource support ephemeral resources or write-only attributes, this is the preferred pattern for values that should never be persisted.
