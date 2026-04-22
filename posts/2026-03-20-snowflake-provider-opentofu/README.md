# How to Configure the Snowflake Provider in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Snowflake, Infrastructure as Code, IaC, Data Warehouse, Database

Description: Learn how to configure the Snowflake provider in OpenTofu to manage warehouses, databases, and user access.

## Introduction

This guide covers How to Configure the Snowflake Provider in OpenTofu using OpenTofu with practical examples and production-ready configurations.

## Prerequisites

- OpenTofu v1.6+
- A Snowflake account with privileges to create warehouses, databases, schemas, roles, and grants
- Snowflake provider authentication details such as organization name, account name, user, and a password, private key, or token
- Basic understanding of OpenTofu concepts

## Step 1: Install and Configure the Provider

```hcl
terraform {
  required_version = ">= 1.6.0"
  required_providers {
    snowflake = {
      source  = "snowflakedb/snowflake"
      version = ">= 2.0.0, < 3.0.0"
    }
  }
}

# The provider can read SNOWFLAKE_* environment variables for credentials.
provider "snowflake" {}
```

## Step 2: Set Up Authentication

```bash
# Use environment variables for Snowflake authentication
export SNOWFLAKE_ORGANIZATION_NAME="your-organization"
export SNOWFLAKE_ACCOUNT_NAME="your-account"
export SNOWFLAKE_USER="TERRAFORM_SERVICE_USER"
export SNOWFLAKE_ROLE="TERRAFORM_ADMIN"
export SNOWFLAKE_AUTHENTICATOR="SNOWFLAKE_JWT"
export SNOWFLAKE_PRIVATE_KEY="$(cat ~/.ssh/snowflake_key.p8)"
```

```hcl
variable "environment" {
  description = "Environment prefix for Snowflake objects"
  type        = string
  default     = "dev"
}

variable "analyst_user_name" {
  description = "Existing Snowflake user to receive the analytics role"
  type        = string
}
```

## Step 3: Create Basic Resources

```hcl
resource "snowflake_database" "analytics" {
  name                        = upper("${var.environment}_ANALYTICS")
  comment                     = "Managed by OpenTofu"
  data_retention_time_in_days = 7
}

resource "snowflake_schema" "core" {
  database = snowflake_database.analytics.name
  name     = "CORE"
  comment  = "Managed by OpenTofu"
}

resource "snowflake_warehouse" "analytics" {
  name                                = upper("${var.environment}_ANALYTICS_WH")
  warehouse_size                      = "XSMALL"
  auto_suspend                        = 60
  auto_resume                         = "true"
  initially_suspended                 = true
  statement_timeout_in_seconds        = 3600
  statement_queued_timeout_in_seconds = 300
}

resource "snowflake_account_role" "analytics_readonly" {
  name    = upper("${var.environment}_ANALYTICS_READONLY")
  comment = "Read-only access to the analytics database"
}
```

## Step 4: Configure Advanced Settings

```hcl
# Grant the role access to the warehouse, database, and schema.
resource "snowflake_grant_privileges_to_account_role" "warehouse_usage" {
  account_role_name = snowflake_account_role.analytics_readonly.name
  privileges        = ["USAGE"]

  on_account_object {
    object_type = "WAREHOUSE"
    object_name = snowflake_warehouse.analytics.name
  }
}

resource "snowflake_grant_privileges_to_account_role" "database_usage" {
  account_role_name = snowflake_account_role.analytics_readonly.name
  privileges        = ["USAGE"]

  on_account_object {
    object_type = "DATABASE"
    object_name = snowflake_database.analytics.name
  }
}

resource "snowflake_grant_privileges_to_account_role" "schema_usage" {
  account_role_name = snowflake_account_role.analytics_readonly.name
  privileges        = ["USAGE"]

  on_schema {
    schema_name = snowflake_schema.core.fully_qualified_name
  }
}

resource "snowflake_grant_privileges_to_account_role" "future_table_select" {
  account_role_name = snowflake_account_role.analytics_readonly.name
  privileges        = ["SELECT"]

  on_schema_object {
    future {
      object_type_plural = "TABLES"
      in_schema          = snowflake_schema.core.fully_qualified_name
    }
  }
}

resource "snowflake_grant_account_role" "analytics_readonly_to_user" {
  role_name = snowflake_account_role.analytics_readonly.name
  user_name = var.analyst_user_name
}
```

## Step 5: Define Outputs

```hcl
output "database_name" {
  description = "The name of the created Snowflake database"
  value       = snowflake_database.analytics.name
}

output "warehouse_name" {
  description = "The name of the created Snowflake warehouse"
  value       = snowflake_warehouse.analytics.name
}

output "analytics_role_name" {
  description = "The Snowflake account role granted to the analyst user"
  value       = snowflake_account_role.analytics_readonly.name
}
```

## Step 6: Deploy

```bash
# Initialize OpenTofu and download provider
tofu init

# Validate configuration syntax
tofu validate

# Preview planned changes
tofu plan

# Apply configuration
tofu apply
```

## Common Issues and Solutions

### Authentication Errors
Verify the `SNOWFLAKE_*` environment variables are set, the user can authenticate with the selected authenticator, and the role has the required privileges.

### Privilege and Ownership Errors
Use a Snowflake role that can create the target objects and grant privileges on them. In many production setups, this means using a dedicated service user with carefully delegated ownership and grant privileges.

### Provider Version Conflicts
Pin to a specific provider version range to ensure reproducible deployments.

## Conclusion

You have successfully configured the Snowflake provider in OpenTofu. This provider enables you to manage Snowflake warehouses, databases, schemas, roles, and grants as code, ensuring consistency and enabling GitOps workflows. Always use environment variables or secure secret stores for sensitive credentials.
