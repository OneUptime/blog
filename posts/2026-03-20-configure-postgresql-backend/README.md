# How to Configure the PostgreSQL Backend in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps, PostgreSQL, State Management

Description: Learn how to configure the OpenTofu PostgreSQL backend to store state in a PostgreSQL database with advisory locks and schema-based workspace isolation.

## Introduction

The PostgreSQL backend stores OpenTofu state in a PostgreSQL database. It's well-suited for teams already operating PostgreSQL infrastructure who want to centralize state storage without a separate S3 bucket or KMS setup. It uses PostgreSQL advisory locks for state locking and supports schema-based workspace isolation.

## Prerequisites

- PostgreSQL 10 or later
- A database and user with appropriate permissions
- Network access from OpenTofu to the PostgreSQL server

## Step 1: Create the Database and User

```sql
-- Create dedicated database
CREATE DATABASE opentofu_state;

-- Create a user for OpenTofu
CREATE USER opentofu_user WITH PASSWORD 'secure_password_here';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE opentofu_state TO opentofu_user;

-- Connect to the database
\c opentofu_state

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO opentofu_user;
```

OpenTofu will create the required tables automatically on first initialization.

## Step 2: Configure the PostgreSQL Backend

```hcl
# backend.tf

terraform {
  backend "pg" {
    conn_str = "postgresql://opentofu_user:secure_password@db.example.com/opentofu_state"

    # Optional: PostgreSQL schema name (default: "terraform_remote_state")
    schema_name = "opentofu_state"

    # Optional: skip schema creation (if pre-created)
    # skip_schema_creation = false

    # Optional: skip table creation
    # skip_table_creation = false

    # Optional: skip index creation
    # skip_index_creation = false
  }
}
```

## Using Environment Variable for Connection String

Store connection strings in environment variables - never hardcode credentials:

```bash
# Set connection string via environment variable
export PG_CONN_STR="postgresql://opentofu_user:secure_password@db.example.com/opentofu_state?sslmode=require"
```

```hcl
# backend.tf - no conn_str needed when using env var
terraform {
  backend "pg" {
    # conn_str loaded from PG_CONN_STR environment variable
    schema_name = "opentofu"
  }
}
```

## Connection String Parameters

```hcl
terraform {
  backend "pg" {
    # Full connection string with SSL
    conn_str = "postgresql://user:pass@host:5432/dbname?sslmode=require&sslcert=/path/to/cert.pem&sslkey=/path/to/key.pem&sslrootcert=/path/to/ca.pem"
  }
}
```

Common parameters:
- `sslmode=require` - Require SSL (highly recommended)
- `sslmode=verify-full` - Verify SSL cert and hostname
- `connect_timeout=10` - Connection timeout in seconds
- `application_name=opentofu` - Visible in pg_stat_activity

## Database Schema

OpenTofu creates a PostgreSQL schema (named by `schema_name`) containing a `states` table:

```sql
-- Main state table (created by OpenTofu inside schema_name)
-- one row per workspace
CREATE TABLE IF NOT EXISTS "${schema_name}"."states" (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE,
    data TEXT
);
```

Each workspace corresponds to a row in this table. State locking is handled via PostgreSQL advisory locks keyed on the row `id`, not via a column.

## Workspace Configuration

```bash
# Create workspaces
tofu workspace new production
tofu workspace new staging

# Each workspace stores state in a separate row
# in the states table inside the configured schema
```

## Schema-Based Isolation

Use `schema_name` to isolate different configurations into separate PostgreSQL schemas:

```hcl
# networking configuration
terraform {
  backend "pg" {
    conn_str    = "postgresql://..."
    schema_name = "networking"  # Creates "networking" schema with a "states" table
  }
}

# compute configuration
terraform {
  backend "pg" {
    conn_str    = "postgresql://..."
    schema_name = "compute"  # Creates "compute" schema with a "states" table
  }
}
```

## Setting Up a Dedicated PostgreSQL Instance

For production, use a managed PostgreSQL service:

```hcl
# AWS RDS for OpenTofu state
resource "aws_db_instance" "opentofu_state" {
  identifier        = "opentofu-state"
  engine            = "postgres"
  engine_version    = "15.3"
  instance_class    = "db.t3.micro"
  allocated_storage = 20
  storage_encrypted = true

  db_name  = "opentofu_state"
  username = "opentofu_admin"
  password = var.db_password

  # Enable deletion protection
  deletion_protection = true

  # Automated backups
  backup_retention_period = 30
  backup_window           = "03:00-04:00"
}
```

## Monitoring and Maintenance

```sql
-- List all state entries (replace terraform_remote_state with your schema_name)
SELECT id, name, octet_length(data) as state_size
FROM terraform_remote_state.states;

-- Check for active state locks (advisory locks)
SELECT * FROM pg_locks WHERE locktype = 'advisory';

-- Vacuum the table regularly
VACUUM ANALYZE terraform_remote_state.states;
```

## Conclusion

The PostgreSQL backend is a practical choice for organizations with existing PostgreSQL infrastructure. It provides reliable state storage, advisory lock-based locking, and schema isolation for multiple configurations. Ensure you use SSL connections in production, store credentials in environment variables, and set up regular backups of the OpenTofu state database alongside your other PostgreSQL backups.
