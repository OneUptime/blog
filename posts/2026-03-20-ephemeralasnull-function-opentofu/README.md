# How to Use the ephemeralasnull Function in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Ephemeral, Ephemeralasnull, Function, Infrastructure as Code, DevOps

Description: A guide to using the ephemeralasnull function in OpenTofu to convert ephemeral values to null for use in contexts that don't support ephemeral values.

## Introduction

The `ephemeralasnull` function in OpenTofu takes any value and returns a copy of it with any ephemeral parts replaced with `null`. This is useful when you need to pass a value that includes ephemeral data into a context that does not support ephemeral values, such as regular (non-ephemeral) outputs or resource attributes that are stored in state. If the entire value is ephemeral, the result is `null`.

## Basic ephemeralasnull Usage

```hcl
ephemeral "aws_secretsmanager_secret_version" "api_key" {
  secret_id = "myapp/api-key"
}

# ephemeralasnull preserves non-ephemeral fields and replaces
# ephemeral ones with null
output "api_key_reference" {
  value = ephemeralasnull({
    secret_id     = "myapp/api-key"
    secret_string = ephemeral.aws_secretsmanager_secret_version.api_key.secret_string
  })
}
```

## Using in Non-Ephemeral Resource Attributes

```hcl
ephemeral "vault_kv_secret_v2" "config" {
  mount = "secret"
  name  = "myapp/config"
}

# Store non-sensitive metadata, not the actual secret
resource "aws_ssm_parameter" "config_metadata" {
  name  = "/myapp/config-metadata"
  type  = "String"
  value = jsonencode(ephemeralasnull({
    source    = "vault"
    secret    = "myapp/config"
    data_json = ephemeral.vault_kv_secret_v2.config.data_json
  }))
}
```

## Conditional Logic with ephemeralasnull

```hcl
ephemeral "aws_secretsmanager_secret_version" "app_config" {
  secret_id = "myapp/config"
}

locals {
  # The secret value becomes null, but non-ephemeral fields in the
  # same structure remain available for normal conditional logic
  app_settings = ephemeralasnull({
    deployment_tier = var.environment == "prod" ? "production" : "non-production"
    config_secret   = ephemeral.aws_secretsmanager_secret_version.app_config.secret_string
  })
}

resource "aws_ecs_task_definition" "app" {
  family = "myapp"

  container_definitions = jsonencode([{
    name = "app"
    environment = local.app_settings.deployment_tier == "production" ? [
      {
        name  = "DEPLOYMENT_TIER"
        value = local.app_settings.deployment_tier
      }
    ] : []
  }])
}
```

## Debugging Ephemeral Values

```hcl
ephemeral "tls_private_key" "server" {
  algorithm = "RSA"
  rsa_bits  = 2048
}

# For debugging, output the surrounding configuration without
# exposing the sensitive key material
output "key_debug" {
  value = ephemeralasnull({
    algorithm       = "RSA"
    rsa_bits        = 2048
    private_key_pem = ephemeral.tls_private_key.server.private_key_pem
  })
}
```

## Difference Between ephemeralasnull and Direct Access

```hcl
ephemeral "vault_generic_secret" "app" {
  path = "secret/myapp"
}

# Direct access in an ephemeral local: works and uses the actual value
locals {
  app_token = ephemeral.vault_generic_secret.app.data["token"]
}

# ephemeralasnull in a non-ephemeral context preserves the object
# shape but replaces the secret with null
resource "terraform_data" "app_config" {
  input = ephemeralasnull({
    source = "vault"
    token  = ephemeral.vault_generic_secret.app.data["token"]
  })
}
```

## Using with Outputs for Validation

```hcl
ephemeral "aws_secretsmanager_secret_version" "db_creds" {
  secret_id = "myapp/${var.environment}/db-credentials"
}

# Expose the non-ephemeral reference data so callers can validate
# which secret is being used, without exposing the secret value
output "db_creds_reference" {
  value = ephemeralasnull({
    environment = var.environment
    secret_id   = "myapp/${var.environment}/db-credentials"
    value       = ephemeral.aws_secretsmanager_secret_version.db_creds.secret_string
  })
}
```

## When ephemeralasnull is Needed

```hcl
# These contexts require non-ephemeral values:
# - Root module outputs
# - Resource attributes stored in state
# - Child module outputs (unless marked ephemeral = true)
# - terraform_data.input

# ephemeralasnull allows mixed values to cross into these
# contexts by replacing only the ephemeral parts with null

# The key insight: ephemeralasnull preserves the surrounding
# structure and any non-ephemeral fields, while removing the
# ephemeral contents before they can be persisted
```

## Conclusion

The `ephemeralasnull` function is a safety valve that lets you sanitize values containing ephemeral data before using them in non-ephemeral contexts. It is most useful when you are working with mixed objects or collections that contain both ordinary metadata and ephemeral values. If the entire value is ephemeral, the result is `null`; otherwise, OpenTofu preserves the surrounding structure and replaces only the ephemeral parts with `null`.
