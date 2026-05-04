# How to Configure Mysql Provider with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Provider, Automation, DevOps

Description: Learn how to configure and use the Mysql provider in OpenTofu to manage Mysql resources as code.

## Introduction

The Mysql provider for OpenTofu enables managing Mysql resources with the same plan/apply workflow as your cloud infrastructure. This guide covers authentication, basic resource configuration, and production best practices.

## Provider Installation

```hcl
terraform {
  required_providers {
    mysql = {
      source  = "petoju/mysql"
      version = "~> 3.0"
    }
  }
  required_version = ">= 1.6.0"
}
```

## Authentication

Most providers read credentials from environment variables:

```bash
# Set MySQL credentials via environment variables

export MYSQL_ENDPOINT="localhost:3306"
export MYSQL_USERNAME="your-mysql-user"
export MYSQL_PASSWORD="your-mysql-password"
```

```hcl
provider "mysql" {
  # endpoint, username, and password are read from
  # MYSQL_ENDPOINT, MYSQL_USERNAME, and MYSQL_PASSWORD
  # endpoint = var.endpoint  # Alternative: inline (not recommended)
}
```

## Example Resource

```hcl
# Example resource demonstrating provider usage
resource "mysql_database" "main" {
  name                  = "${var.name}_${var.environment}"
  default_character_set = "utf8mb4"
  default_collation     = "utf8mb4_unicode_ci"
}
```

## Variables

```hcl
variable "name"        { type = string }
variable "environment" { type = string }
```

## Outputs

```hcl
output "resource_id" { value = mysql_database.main.id }
```

## Best Practices

- Store database credentials in environment variables or a secrets manager-never in .tf files
- Pin provider versions in `required_providers` to prevent unexpected updates
- Commit the `.terraform.lock.hcl` file to lock exact provider versions
- Use separate provider configurations per environment using aliases or workspaces

## Conclusion

Managing Mysql resources with OpenTofu brings the same consistency and auditability to SaaS tooling as you get with cloud infrastructure. Start by codifying your most critical resources and gradually expand coverage over time.
