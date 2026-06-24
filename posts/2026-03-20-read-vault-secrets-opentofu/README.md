# How to Read Vault Secrets in OpenTofu Configurations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Vault, Secret, Security, Secret Management

Description: Learn how to read HashiCorp Vault secrets in OpenTofu configurations using the Vault provider data sources to inject sensitive values without storing them in state or version control.

## Introduction

OpenTofu can use the Vault provider to read secrets directly from HashiCorp Vault during plan and apply. This keeps sensitive values out of `.tfvars` files and version control, while still making them available as inputs to resources. Values read through Vault data sources are still persisted in state and may appear in plan files or console output if you reference them in resource arguments.

## Provider Configuration

```hcl
# versions.tf

terraform {
  required_providers {
    vault = {
      source  = "hashicorp/vault"
      version = "~> 5.0"
    }
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

# provider.tf
provider "vault" {
  address = "https://vault.example.com:8200"
  # Token from VAULT_TOKEN environment variable
}
```

## Reading KV v2 Secrets

```hcl
# Read a secret from the KV v2 secrets engine
data "vault_kv_secret_v2" "database" {
  mount = "secret"
  name  = "prod/database"
}

resource "aws_db_instance" "main" {
  identifier          = "prod-db"
  engine              = "postgres"
  instance_class      = "db.r6g.large"
  allocated_storage   = 20
  skip_final_snapshot = true

  username = data.vault_kv_secret_v2.database.data["username"]
  password = data.vault_kv_secret_v2.database.data["password"]
  db_name  = data.vault_kv_secret_v2.database.data["database_name"]
}
```

## Reading KV v1 Secrets

```hcl
data "vault_kv_secret" "app_config" {
  path = "kv/prod/application"
}

locals {
  api_key      = data.vault_kv_secret.app_config.data["api_key"]
  webhook_url  = data.vault_kv_secret.app_config.data["webhook_url"]
}
```

## Reading Generic Secrets

```hcl
# For legacy generic backends or other paths that support `vault read`
data "vault_generic_secret" "tls_cert" {
  path = "secret/tls/web"
}

resource "aws_acm_certificate" "web" {
  private_key       = data.vault_generic_secret.tls_cert.data["private_key"]
  certificate_body  = data.vault_generic_secret.tls_cert.data["certificate"]
  certificate_chain = data.vault_generic_secret.tls_cert.data["ca_chain"]
}
```

## Injecting Secrets into ECS Task Definitions

```hcl
data "vault_kv_secret_v2" "app_secrets" {
  mount = "secret"
  name  = "prod/app"
}

resource "aws_ecs_task_definition" "app" {
  family = "app"

  container_definitions = jsonencode([
    {
      name  = "app"
      image = "123456789012.dkr.ecr.us-east-1.amazonaws.com/app:latest"

      environment = [
        {
          name  = "DATABASE_URL"
          value = "postgres://${data.vault_kv_secret_v2.app_secrets.data["db_user"]}:${data.vault_kv_secret_v2.app_secrets.data["db_pass"]}@${aws_db_instance.main.endpoint}/appdb"
        },
        {
          name  = "REDIS_URL"
          value = data.vault_kv_secret_v2.app_secrets.data["redis_url"]
        }
      ]
    }
  ])
}
```

## Reducing Exposure in CLI Output

Marking outputs as `sensitive` reduces accidental exposure in CLI output, but it does not remove the value from state or plan files.

```hcl
# Mark outputs as sensitive to reduce accidental exposure in CLI output
output "db_password" {
  value     = data.vault_kv_secret_v2.database.data["password"]
  sensitive = true
}
```

## Reusing Vault Reads

Using a local value does not cache Vault beyond the data source read itself, but it does make repeated lookups easier to reuse.

```hcl
# Read once from Vault and reuse the resulting map in later expressions
locals {
  db_creds = data.vault_kv_secret_v2.database.data
}

resource "aws_db_instance" "primary" {
  identifier          = "prod-db-primary"
  engine              = "postgres"
  instance_class      = "db.r6g.large"
  allocated_storage   = 20
  skip_final_snapshot = true

  username = local.db_creds["username"]
  password = local.db_creds["password"]
  db_name  = local.db_creds["database_name"]
}
```

## Conclusion

Reading Vault secrets in OpenTofu configurations keeps sensitive values out of `.tfvars` files and version control, but Vault provider data sources still persist those values in state and can surface them in plan files or console output. The `vault_kv_secret_v2` data source is the most common approach for KV v2 mounts, `vault_kv_secret` works with KV v1, and `vault_generic_secret` is appropriate for read-only Vault paths that support `vault read`. Mark secret outputs as `sensitive = true`, and protect your state and plan files accordingly.
