# How to Configure Postgresql Provider with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Provider, Automation, DevOps

Description: Learn how to configure and use the Postgresql provider in OpenTofu to manage Postgresql resources as code.

## Introduction

The Postgresql provider for OpenTofu enables managing Postgresql resources with the same plan/apply workflow as your cloud infrastructure. This guide covers authentication, basic resource configuration, and production best practices.

## Provider Installation

```hcl
terraform {
  required_providers {
    postgresql = {
      source  = "cyrilgdn/postgresql"
      version = "~> 1.22"
    }
  }
  required_version = ">= 1.6.0"
}
```

## Authentication

The PostgreSQL provider reads connection details from the standard `PG*` environment variables:

```bash
# Set PostgreSQL connection details via environment variables

export PGHOST="postgres.example.com"
export PGPORT="5432"
export PGUSER="postgres"
export PGPASSWORD="your-password"
export PGDATABASE="postgres"
export PGSSLMODE="require"
```

```hcl
provider "postgresql" {
  # host, port, username, password, database, and sslmode default to
  # PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE, and PGSSLMODE.
  # password = var.pg_password  # Alternative: inline (not recommended)
}
```

## Example Resource

```hcl
# Create a database and a role with login that owns it
resource "postgresql_role" "app" {
  name     = "${var.name}_${var.environment}"
  login    = true
  password = var.app_role_password
}

resource "postgresql_database" "app" {
  name              = "${var.name}_${var.environment}"
  owner             = postgresql_role.app.name
  encoding          = "UTF8"
  lc_collate        = "C"
  lc_ctype          = "C"
  connection_limit  = -1
  allow_connections = true
}
```

## Variables

```hcl
variable "name"              { type = string }
variable "environment"       { type = string }
variable "app_role_password" {
  type      = string
  sensitive = true
}
```

## Outputs

```hcl
output "database_name" { value = postgresql_database.app.name }
output "role_name"     { value = postgresql_role.app.name }
```

## Best Practices

- Store API keys in environment variables or a secrets manager-never in .tf files
- Pin provider versions in `required_providers` to prevent unexpected updates
- Commit the `.terraform.lock.hcl` file to lock exact provider versions
- Use separate provider configurations per environment using aliases or workspaces

## Conclusion

Managing Postgresql resources with OpenTofu brings the same consistency and auditability to SaaS tooling as you get with cloud infrastructure. Start by codifying your most critical resources and gradually expand coverage over time.
