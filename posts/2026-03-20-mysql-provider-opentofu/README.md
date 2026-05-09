# How to Configure the MySQL Provider in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, MySQL, Infrastructure as Code, IaC, Database, SQL

Description: Learn how to configure the MySQL provider in OpenTofu to manage databases, users, and grants.

## Introduction

This guide covers how to configure the MySQL provider in OpenTofu with practical examples and production-ready configurations. The actively maintained community provider is `petoju/mysql` (the original `hashicorp/mysql` provider was archived). It connects to a running MySQL server and manages databases, users, grants, and roles as code.

## Prerequisites

- OpenTofu v1.6+
- A reachable MySQL 5.7 or 8.0 server (or a compatible fork like MariaDB)
- A MySQL account with sufficient privileges to create databases and users (typically `CREATE USER`, `GRANT OPTION`, and the privileges you intend to grant)
- Basic understanding of OpenTofu concepts

## Step 1: Install and Configure the Provider

```hcl
terraform {
  required_version = ">= 1.6.0"
  required_providers {
    mysql = {
      source  = "petoju/mysql"
      version = "~> 3.0"
    }
  }
}

# Configure the provider against a running MySQL server.
# Prefer environment variables (MYSQL_ENDPOINT, MYSQL_USERNAME,
# MYSQL_PASSWORD) over hard-coded credentials.

provider "mysql" {
  endpoint = var.mysql_endpoint            # e.g. "db.internal:3306"
  username = var.mysql_username            # admin user
  password = var.mysql_password            # mark variable as sensitive
}
```

## Step 2: Set Up Authentication

```bash
# The provider reads these environment variables by default
export MYSQL_ENDPOINT="db.internal:3306"
export MYSQL_USERNAME="tofu_admin"
export MYSQL_PASSWORD="change-me"

# Optional: enable TLS to the server
export MYSQL_TLS_CONFIG="true"
export MYSQL_TLS_CA_CERT="/etc/mysql/ca.pem"
```

```hcl
variable "mysql_endpoint" {
  description = "MySQL server host:port"
  type        = string
}

variable "mysql_username" {
  description = "Admin user the provider authenticates as"
  type        = string
}

variable "mysql_password" {
  description = "Password for the admin user"
  type        = string
  sensitive   = true
}
```

## Step 3: Create Basic Resources

```hcl
# Create a database
resource "mysql_database" "app" {
  name                  = "app_production"
  default_character_set = "utf8mb4"
  default_collation     = "utf8mb4_unicode_ci"
}

# Create an application user
resource "mysql_user" "app" {
  user               = "app_user"
  host               = "10.0.%.%"          # restrict to a subnet
  plaintext_password = var.app_user_password
  tls_option         = "NONE"              # set to "SSL" to require TLS
}
```

## Step 4: Configure Advanced Settings

```hcl
# Grant the user full access to its database
resource "mysql_grant" "app" {
  user       = mysql_user.app.user
  host       = mysql_user.app.host
  database   = mysql_database.app.name
  privileges = ["SELECT", "INSERT", "UPDATE", "DELETE", "EXECUTE"]
}

# A role-based pattern: grant a role, then assign the role to the user.
# Roles require MySQL 8.0+.
resource "mysql_role" "readonly" {
  name = "readonly"
}

resource "mysql_grant" "readonly_select" {
  role       = mysql_role.readonly.name
  database   = mysql_database.app.name
  privileges = ["SELECT"]
}

resource "mysql_grant" "app_role" {
  user     = mysql_user.app.user
  host     = mysql_user.app.host
  database = mysql_database.app.name
  roles    = [mysql_role.readonly.name]
}
```

## Step 5: Define Outputs

```hcl
output "database_name" {
  description = "The name of the created database"
  value       = mysql_database.app.name
}

output "app_user" {
  description = "The application user identity (user@host)"
  value       = "${mysql_user.app.user}@${mysql_user.app.host}"
}
```

## Step 6: Deploy

```bash
# Initialize OpenTofu and download the provider
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
Confirm the admin user has `CREATE USER` and `GRANT OPTION` privileges, and that `MYSQL_ENDPOINT` includes the port (`host:3306`). For MySQL 8.0, the default `caching_sha2_password` plugin can fail over plain TCP - set `auth_plugin = "mysql_native_password"` on `mysql_user` or enable TLS.

### Connection Errors From CI
The provider opens a TCP connection during `tofu plan` and `tofu apply`. Make sure the runner can reach the database (security groups, VPN, bastion). For MySQL servers behind a private network, consider running OpenTofu from a runner inside that network.

### Provider Version Conflicts
Pin to a specific provider version range with `version = "~> 3.0"` so that future major releases of `petoju/mysql` do not change behavior unexpectedly. Run `tofu init -upgrade` only when intentionally bumping the version.

## Conclusion

You have successfully configured the MySQL provider in OpenTofu. The `petoju/mysql` provider lets you manage databases, users, grants, and roles as code, ensuring consistency and enabling GitOps workflows. Always source credentials from environment variables or a secret store, mark password variables `sensitive = true`, and prefer TLS connections (`MYSQL_TLS_CONFIG=true`) when the database is reached over an untrusted network.
