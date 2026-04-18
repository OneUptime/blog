# How to Generate Dynamic Database Credentials with Vault and OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Vault, Dynamic Credential, Database, PostgreSQL, Security

Description: Learn how to use HashiCorp Vault's database secrets engine with OpenTofu to generate short-lived, automatically rotating database credentials instead of static passwords.

## Introduction

Vault's database secrets engine creates temporary database credentials on demand. Instead of a static password that needs periodic rotation, each OpenTofu run can request fresh credentials with a configurable TTL. When the TTL expires, Vault revokes the credentials and the database user is dropped.

## Configuring the Database Secrets Engine

```hcl
# Enable the database secrets engine

resource "vault_mount" "database" {
  path = "database"
  type = "database"
}

# Configure PostgreSQL connection
resource "vault_database_secret_backend_connection" "postgres" {
  backend       = vault_mount.database.path
  name          = "prod-postgres"
  allowed_roles = ["app-readonly", "app-readwrite", "migrations"]

  postgresql {
    connection_url = "postgresql://{{username}}:{{password}}@${aws_db_instance.main.endpoint}:5432/appdb?sslmode=require"
    username       = "vault_admin"
    password       = var.vault_db_admin_password
    max_open_connections     = 5
    max_idle_connections     = 2
    max_connection_lifetime  = 300
  }
}

# Read-only role for application
resource "vault_database_secret_backend_role" "app_readonly" {
  backend = vault_mount.database.path
  name    = "app-readonly"
  db_name = vault_database_secret_backend_connection.postgres.name

  creation_statements = [
    "CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}';",
    "GRANT CONNECT ON DATABASE appdb TO \"{{name}}\";",
    "GRANT USAGE ON SCHEMA public TO \"{{name}}\";",
    "GRANT SELECT ON ALL TABLES IN SCHEMA public TO \"{{name}}\";",
    "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO \"{{name}}\";"
  ]

  revocation_statements = [
    "REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM \"{{name}}\";",
    "REVOKE USAGE ON SCHEMA public FROM \"{{name}}\";",
    "DROP ROLE IF EXISTS \"{{name}}\";"
  ]

  default_ttl = 3600   # 1 hour, in seconds
  max_ttl     = 86400  # 24 hours, in seconds
}

# Write role for migrations
resource "vault_database_secret_backend_role" "migrations" {
  backend = vault_mount.database.path
  name    = "migrations"
  db_name = vault_database_secret_backend_connection.postgres.name

  creation_statements = [
    "CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}';",
    "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO \"{{name}}\";",
    "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO \"{{name}}\";"
  ]

  default_ttl = 1800  # 30 minutes - short TTL for migration runs
  max_ttl     = 3600  # 1 hour
}
```

## Reading Dynamic Credentials in OpenTofu

```hcl
# Request fresh credentials for this OpenTofu run.
# The Vault provider has no dedicated data source for the database engine,
# so we read the creds path with vault_generic_secret.
data "vault_generic_secret" "app" {
  path = "${vault_mount.database.path}/creds/app-readonly"
}

# Use the dynamic credentials for a connection
output "connection_string" {
  value     = "postgresql://${data.vault_generic_secret.app.data["username"]}:${data.vault_generic_secret.app.data["password"]}@${aws_db_instance.main.endpoint}:5432/appdb"
  sensitive = true
}
```

## Injecting Dynamic Credentials into Application Config

```hcl
data "vault_generic_secret" "app_creds" {
  path = "database/creds/app-readonly"
}

resource "aws_ssm_parameter" "db_url" {
  name  = "/prod/app/database-url"
  type  = "SecureString"
  value = "postgresql://${data.vault_generic_secret.app_creds.data["username"]}:${data.vault_generic_secret.app_creds.data["password"]}@${aws_db_instance.main.endpoint}:5432/appdb"

  lifecycle {
    # Allow OpenTofu to update this when credentials rotate
    ignore_changes = []
  }
}

resource "aws_ecs_task_definition" "app" {
  family = "app"
  container_definitions = jsonencode([{
    name = "app"
    environment = [
      {
        name  = "DATABASE_URL"
        # Reference SSM parameter via ARN in secrets instead
        value = "fetched-from-ssm"
      }
    ]
    secrets = [
      {
        name      = "DATABASE_URL"
        valueFrom = aws_ssm_parameter.db_url.arn
      }
    ]
  }])
}
```

## MySQL Configuration

```hcl
resource "vault_database_secret_backend_connection" "mysql" {
  backend       = vault_mount.database.path
  name          = "prod-mysql"
  allowed_roles = ["app-user"]

  mysql_aurora {
    connection_url = "{{username}}:{{password}}@tcp(${aws_rds_cluster.main.endpoint}:3306)/"
    username       = "vault_admin"
    password       = var.vault_mysql_admin_password
  }
}

resource "vault_database_secret_backend_role" "mysql_app" {
  backend = vault_mount.database.path
  name    = "app-user"
  db_name = vault_database_secret_backend_connection.mysql.name

  creation_statements = [
    "CREATE USER '{{name}}'@'%' IDENTIFIED BY '{{password}}';",
    "GRANT SELECT, INSERT, UPDATE, DELETE ON appdb.* TO '{{name}}'@'%';"
  ]

  revocation_statements = ["DROP USER IF EXISTS '{{name}}'@'%';"]

  default_ttl = 3600
  max_ttl     = 86400
}
```

## Conclusion

Vault's dynamic database credentials eliminate the most common source of database credential breaches: long-lived, rarely-rotated passwords. Each OpenTofu run gets fresh credentials with a short TTL, and Vault automatically revokes them when the TTL expires. The vault_admin account that Vault uses to create credentials only needs CREATE USER and GRANT permissions, limiting the blast radius of a Vault compromise.
