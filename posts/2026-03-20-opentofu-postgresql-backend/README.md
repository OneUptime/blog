# How to Configure the PostgreSQL Backend in OpenTofu - Opentofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Infrastructure as Code, Backend

Description: Learn how to configure the PostgreSQL backend in OpenTofu to store state in a PostgreSQL database with built-in locking using advisory locks.

## Introduction

The PostgreSQL backend stores OpenTofu state in a PostgreSQL database. It uses PostgreSQL advisory locks for state locking, making it a good choice for teams that already operate PostgreSQL infrastructure and prefer a relational database for state storage.

## Basic Configuration

```hcl
terraform {
  backend "pg" {
    conn_str = "postgres://user:password@postgresql.acme-corp.com:5432/terraform_state"
  }
}
```

## Connection String Options

```hcl
# With SSL

terraform {
  backend "pg" {
    conn_str = "postgres://user:password@postgresql.acme-corp.com:5432/terraform_state?sslmode=require"
  }
}

# With specific schema
terraform {
  backend "pg" {
    conn_str    = "postgres://user:password@postgresql.acme-corp.com:5432/terraform_state"
    schema_name = "opentofu"
  }
}
```

## Environment Variable Authentication

```bash
# Use the standard libpq environment variables
export PGUSER="tofu_user"
export PGPASSWORD="your-password"
export PGHOST="postgresql.acme-corp.com"
export PGPORT="5432"
export PGDATABASE="terraform_state"

tofu init
```

## Setting Up the Database

```sql
-- Create the dedicated database
CREATE DATABASE terraform_state;

-- Create the user
CREATE USER tofu_user WITH PASSWORD 'your-password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE terraform_state TO tofu_user;

-- Connect to the database
\c terraform_state

-- Grant CREATE on the database so OpenTofu can create its own schema
-- (default schema name is terraform_remote_state)
GRANT CREATE ON DATABASE terraform_state TO tofu_user;
```

## Database Schema

OpenTofu automatically creates a schema (default `terraform_remote_state`) containing a `states` table:

```sql
-- OpenTofu creates this table structure (in the terraform_remote_state schema by default)
states (
  id    SERIAL PRIMARY KEY,           -- key used for advisory locks
  name  TEXT UNIQUE NOT NULL,         -- workspace name
  data  TEXT                          -- state file content
)
```

State locking is handled by PostgreSQL advisory locks keyed on the row's `id`, so there is no separate lock column.

## Multiple States with Workspaces

The PostgreSQL backend uses workspace names as state identifiers:

```hcl
terraform {
  backend "pg" {
    conn_str = "postgres://user:password@localhost:5432/terraform_state"
  }
}
```

```bash
# Different workspaces = different rows in the table
tofu workspace new production
tofu workspace new staging
tofu workspace list
```

## Custom Schema

Organize multiple configurations using different schemas:

```hcl
# networking/backend.tf
terraform {
  backend "pg" {
    conn_str    = "postgres://user:password@localhost:5432/terraform_state"
    schema_name = "networking"
  }
}

# applications/backend.tf
terraform {
  backend "pg" {
    conn_str    = "postgres://user:password@localhost:5432/terraform_state"
    schema_name = "applications"
  }
}
```

## Using RDS / Aurora PostgreSQL

```hcl
terraform {
  backend "pg" {
    conn_str = "postgres://tofu_user:${var.db_password}@mydb.abc123.us-east-1.rds.amazonaws.com:5432/terraform_state?sslmode=require"
  }
}
```

## Backup and Recovery

```bash
# Backup state from PostgreSQL
pg_dump \
  --no-owner \
  --schema=terraform_remote_state \
  --table='terraform_remote_state.states' \
  terraform_state > state-backup.sql

# Restore
psql terraform_state < state-backup.sql
```

## Conclusion

The PostgreSQL backend provides a relational database option for OpenTofu state storage. It is well-suited for teams with existing PostgreSQL infrastructure who prefer SQL-based state management. The backend handles table creation automatically, uses advisory locks for concurrency control, and supports workspace isolation through separate rows with distinct identifiers.
