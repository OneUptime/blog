# How to Use Ephemeral Locals in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Local, Ephemeral, Security, Infrastructure as Code, DevOps

Description: A guide to using ephemeral local values in OpenTofu to compute and pass temporary values without storing them in state.

## Introduction

Ephemeral locals in OpenTofu (introduced in 1.11) are local values derived from ephemeral sources (like ephemeral variables or resources). Like other ephemeral values, they are not stored in state or plan files, making them safe for working with temporary credentials and sensitive computed values.

## Declaring Ephemeral Locals

```hcl
# Ephemeral variable (source of ephemeral data)

variable "vault_token" {
  type      = string
  ephemeral = true
  sensitive = true
}

# Ephemeral local derived from ephemeral variable
locals {
  # This local inherits ephemeral nature from its source
  auth_header = "Bearer ${var.vault_token}"

  # Complex computation with ephemeral data
  api_config = {
    url     = "https://api.example.com"
    token   = var.vault_token
    timeout = 30
  }
}
```

## Ephemeral Propagation

When a local value references an ephemeral source, it automatically becomes ephemeral:

```hcl
variable "aws_access_key_id" {
  type      = string
  ephemeral = true
  sensitive = true
}

variable "aws_secret_access_key" {
  type      = string
  ephemeral = true
  sensitive = true
}

variable "aws_session_token" {
  type      = string
  ephemeral = true
  sensitive = true
}

locals {
  # This local is automatically ephemeral because it references
  # an ephemeral variable
  aws_credentials = {
    access_key    = var.aws_access_key_id    # ephemeral
    secret_key    = var.aws_secret_access_key # ephemeral
    session_token = var.aws_session_token     # ephemeral
  }

  # This CANNOT be used in regular resource attributes
  # It can only be used in ephemeral-compatible contexts
  # (providers, provisioner connections, etc.)
}
```

## Using Ephemeral Locals in Providers

```hcl
variable "aws_access_key_id" {
  type      = string
  ephemeral = true
  sensitive = true
}

variable "aws_secret_access_key" {
  type      = string
  ephemeral = true
  sensitive = true
}

variable "aws_region" {
  type = string
}

locals {
  # Compute provider auth configuration from ephemeral credentials
  # This is ephemeral because its sources are ephemeral
  aws_provider_auth = {
    access_key = var.aws_access_key_id
    secret_key = var.aws_secret_access_key
  }
}

# Use ephemeral local in provider configuration
provider "aws" {
  region     = var.aws_region
  access_key = local.aws_provider_auth.access_key
  secret_key = local.aws_provider_auth.secret_key
}
```

## Practical Example: Dynamic Configuration

```hcl
variable "secret_manager_arn" {
  type = string
}

variable "aws_region" {
  type = string
}

variable "aws_account_id" {
  type = string
}

# Read temporary configuration from an ephemeral resource
ephemeral "aws_secretsmanager_secret_version" "deploy" {
  secret_id = var.secret_manager_arn
}

locals {
  # Build AWS credential configuration (ephemeral)
  aws_creds = jsondecode(ephemeral.aws_secretsmanager_secret_version.deploy.secret_string)

  # Build API endpoint configuration
  deploy_config = {
    credentials = local.aws_creds
    region      = var.aws_region
    account_id  = var.aws_account_id
  }
}
```

## Limitations

```hcl
# Ephemeral locals CANNOT be used in:
# 1. Regular resource attributes that persist to state
# 2. Root module outputs, or child module outputs not marked ephemeral
# 3. Data sources and other non-ephemeral contexts

# This would fail:
# resource "local_file" "config" {
#   content = local.ephemeral_token  # Can't write ephemeral to state-stored resource
# }

# Ephemeral locals CAN be used in:
# 1. Provider configurations
# 2. Provisioners and resource connection blocks
# 3. Resource write-only attributes
# 4. Ephemeral resource arguments
# 5. Child module outputs marked ephemeral
# 6. Other locals and ephemeral variables
```

## Conclusion

Ephemeral locals extend the ephemeral ecosystem by allowing you to compute derived values from ephemeral sources without persisting them to state or plan. This is essential for building authentication flows, credential pipelines, and temporary configuration computation that should remain truly transient. By understanding ephemeral propagation - where accessing an ephemeral source makes the derived value ephemeral - you can build secure, zero-persistence secret handling pipelines in OpenTofu.
