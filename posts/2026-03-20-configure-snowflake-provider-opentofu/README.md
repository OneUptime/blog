# How to Configure Snowflake Provider with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Provider, Automation, DevOps

Description: Learn how to configure and use the Snowflake provider in OpenTofu to manage Snowflake resources as code.

## Introduction

The Snowflake provider for OpenTofu enables managing Snowflake resources with the same plan/apply workflow as your cloud infrastructure. This guide covers authentication, basic resource configuration, and production best practices.

## Provider Installation

```hcl
terraform {
  required_providers {
    snowflake = {
      source  = "snowflakedb/snowflake"
      version = "~> 2.0"
    }
  }
  required_version = ">= 1.6.0"
}
```

## Authentication

The Snowflake provider reads credentials from environment variables:

```bash
# Set Snowflake credentials via environment variables

export SNOWFLAKE_ORGANIZATION_NAME="your-org"
export SNOWFLAKE_ACCOUNT_NAME="your-account"
export SNOWFLAKE_USER="your-user"
export SNOWFLAKE_PASSWORD="your-password"
```

```hcl
provider "snowflake" {
  # Credentials are read from environment variables
  role = "ACCOUNTADMIN"
  # password = var.snowflake_password  # Alternative: inline (not recommended)
}
```

For production deployments, prefer key-pair authentication with `authenticator = "SNOWFLAKE_JWT"` and a `private_key`, which avoids storing passwords altogether.

## Example Resource

```hcl
# Example resource demonstrating provider usage
resource "snowflake_database" "main" {
  name    = upper("${var.name}_${var.environment}")
  comment = "Managed by OpenTofu"
}
```

## Variables

```hcl
variable "name"        { type = string }
variable "environment" { type = string }
```

## Outputs

```hcl
output "database_name" { value = snowflake_database.main.name }
```

## Best Practices

- Store API keys in environment variables or a secrets manager-never in .tf files
- Pin provider versions in `required_providers` to prevent unexpected updates
- Commit the `.terraform.lock.hcl` file to lock exact provider versions
- Use separate provider configurations per environment using aliases or workspaces

## Conclusion

Managing Snowflake resources with OpenTofu brings the same consistency and auditability to SaaS tooling as you get with cloud infrastructure. Start by codifying your most critical resources and gradually expand coverage over time.
