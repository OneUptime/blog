# How to Configure PostgreSQL Backend for Terraform State

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, PostgreSQL, State Management, Database, Infrastructure as Code

Description: Step-by-step guide to setting up PostgreSQL as a Terraform state backend, covering database setup, connection configuration, state locking, and security best practices.

---

PostgreSQL might not be the first backend you think of for Terraform state, but it is a surprisingly good option. If your organization already runs PostgreSQL for other workloads, using it for Terraform state means no additional infrastructure to manage. It supports state locking through database advisory locks and works well in environments where cloud-specific storage services are not available.

## Why PostgreSQL?

There are specific scenarios where PostgreSQL makes sense:

- You already have a managed PostgreSQL instance (RDS, Cloud SQL, Azure Database)
- You are in an on-premises environment without access to cloud storage
- You want state storage that integrates with your existing database backup and monitoring
- You need fine-grained access control through database roles and permissions
- You want to query or audit state data using SQL

## Setting Up the Database

First, create a dedicated database and user for Terraform state:

```sql
-- Connect to PostgreSQL as a superuser or admin
-- Create a dedicated database for Terraform state
CREATE DATABASE terraform_state;

-- Create a user for Terraform
CREATE USER terraform_user WITH PASSWORD 'strong-password-here';

-- Grant connect privilege
GRANT CONNECT ON DATABASE terraform_state TO terraform_user;

-- Switch to the terraform_state database
\c terraform_state

-- Create a schema for Terraform (optional but recommended)
CREATE SCHEMA IF NOT EXISTS terraform;

-- Grant usage on the schema
GRANT USAGE ON SCHEMA terraform TO terraform_user;
GRANT CREATE ON SCHEMA terraform TO terraform_user;

-- Grant necessary permissions for table operations
ALTER DEFAULT PRIVILEGES IN SCHEMA terraform
  GRANT ALL ON TABLES TO terraform_user;
```

You do not need to create any tables manually. Terraform creates the required table structure automatically when you initialize the backend.

## Basic Backend Configuration

Here is the basic configuration:

```hcl
# backend.tf
terraform {
  backend "pg" {
    # PostgreSQL connection string
    conn_str = "postgres://terraform_user:strong-password-here@localhost:5432/terraform_state?sslmode=disable"
  }
}
```

The connection string follows the standard PostgreSQL URI format:

```
postgres://username:password@hostname:port/database?parameters
```

Initialize Terraform to set up the backend:

```bash
# Initialize the backend
terraform init

# Terraform creates a table called "states" in the public schema
# (or in a custom schema if specified)
```

## Connection String Options

The `conn_str` supports all standard PostgreSQL connection parameters:

```hcl
terraform {
  backend "pg" {
    # Full connection string with SSL enabled
    conn_str = "postgres://terraform_user:password@db.example.com:5432/terraform_state?sslmode=require&connect_timeout=10"
  }
}
```

Common parameters include:

- `sslmode` - Controls SSL behavior: `disable`, `require`, `verify-ca`, `verify-full`
- `connect_timeout` - Connection timeout in seconds
- `application_name` - Shows up in pg_stat_activity for monitoring

## Using Environment Variables

Never put passwords in your Terraform files. Use environment variables instead:

```bash
# Set the connection string via environment variable
export PG_CONN_STR="postgres://terraform_user:strong-password@db.example.com:5432/terraform_state?sslmode=require"

# Initialize - Terraform reads from the environment
terraform init
```

Or use partial configuration:

```hcl
# backend.tf - no credentials
terraform {
  backend "pg" {}
}
```

```bash
# Pass connection string at init time
terraform init -backend-config="conn_str=postgres://terraform_user:password@db.example.com:5432/terraform_state?sslmode=require"
```

## Custom Schema Name

By default, Terraform uses the `public` schema. You can specify a different schema:

```hcl
terraform {
  backend "pg" {
    conn_str    = "postgres://terraform_user:password@localhost:5432/terraform_state"

    # Use a custom schema name
    schema_name = "terraform"
  }
}
```

This is useful when sharing a database with other applications. Each Terraform configuration can even use a different schema for isolation.

## Understanding the Table Structure

When Terraform initializes the PostgreSQL backend, it creates a table with this structure:

```sql
-- Terraform creates this table automatically
CREATE TABLE IF NOT EXISTS states (
  id          SERIAL PRIMARY KEY,
  name        TEXT UNIQUE,  -- Workspace name
  data        TEXT          -- JSON state data
);

-- And a lock table for state locking
CREATE TABLE IF NOT EXISTS locks (
  name        TEXT PRIMARY KEY,
  record      TEXT
);
```

You can inspect the state directly with SQL:

```sql
-- List all stored states (workspaces)
SELECT id, name, length(data) AS state_size
FROM terraform.states;

-- Check for active locks
SELECT * FROM terraform.locks;
```

## State Locking

The PostgreSQL backend supports state locking through a combination of the `locks` table and PostgreSQL advisory locks. This is enabled by default and prevents concurrent modifications.

You can verify locking is active by checking the locks table during a Terraform operation:

```sql
-- Check for active locks during a terraform apply
SELECT * FROM terraform.locks;

-- Output during an active operation:
-- name    | record
-- --------+------------------------------------------
-- default | {"ID":"abc123","Operation":"OperationTypeApply",...}
```

If a lock gets stuck after a crash:

```bash
# Force unlock using the lock ID from the error message
terraform force-unlock LOCK_ID
```

You can also clear the lock directly in the database (as a last resort):

```sql
-- Emergency lock removal (use force-unlock instead when possible)
DELETE FROM terraform.locks WHERE name = 'default';
```

## SSL Configuration

For production use, always enable SSL:

```hcl
terraform {
  backend "pg" {
    # Require SSL and verify the server certificate
    conn_str = "postgres://terraform_user:password@db.example.com:5432/terraform_state?sslmode=verify-full&sslrootcert=/path/to/ca.pem"
  }
}
```

SSL modes from least to most secure:

- `disable` - No SSL (only for local development)
- `require` - Use SSL but do not verify certificates
- `verify-ca` - Verify the server certificate against a CA
- `verify-full` - Verify certificate and hostname match

## Using with Managed Databases

### Amazon RDS

```hcl
terraform {
  backend "pg" {
    conn_str = "postgres://terraform:password@mydb.abc123.us-east-1.rds.amazonaws.com:5432/terraform_state?sslmode=require"
  }
}
```

### Google Cloud SQL

```hcl
terraform {
  backend "pg" {
    # Using Cloud SQL Proxy
    conn_str = "postgres://terraform:password@localhost:5432/terraform_state?host=/cloudsql/project:region:instance"
  }
}
```

### Azure Database for PostgreSQL

```hcl
terraform {
  backend "pg" {
    conn_str = "postgres://terraform@myserver:password@myserver.postgres.database.azure.com:5432/terraform_state?sslmode=require"
  }
}
```

## Multiple Workspaces

The PostgreSQL backend stores each workspace as a separate row in the states table:

```bash
# Create a new workspace
terraform workspace new staging

# List workspaces
terraform workspace list

# Each workspace is a row in the states table
```

```sql
-- View all workspaces and their state sizes
SELECT name, length(data) as bytes,
       pg_size_pretty(length(data)::bigint) as size
FROM terraform.states
ORDER BY name;

-- Output:
-- name       | bytes   | size
-- -----------+---------+-------
-- default    | 15234   | 15 kB
-- staging    | 12890   | 13 kB
-- production | 45678   | 45 kB
```

## Backup and Recovery

Since the state is in PostgreSQL, you can use standard database backup tools:

```bash
# Backup the Terraform state database
pg_dump -h localhost -U terraform_user -d terraform_state > terraform_state_backup.sql

# Restore from backup
psql -h localhost -U terraform_user -d terraform_state < terraform_state_backup.sql

# Or include it in your regular database backup schedule
# with pg_basebackup for physical backups
```

## Monitoring

Use PostgreSQL's built-in monitoring to track state operations:

```sql
-- Check active connections from Terraform
SELECT pid, usename, application_name, state, query_start
FROM pg_stat_activity
WHERE datname = 'terraform_state';

-- Monitor table size over time
SELECT pg_size_pretty(pg_total_relation_size('terraform.states')) as total_size;
```

## Summary

PostgreSQL is a practical and reliable backend for Terraform state, particularly when you already have PostgreSQL in your infrastructure stack. It provides genuine state locking, works across all cloud providers and on-premises environments, and lets you leverage your existing database expertise for backups, monitoring, and access control. The setup is minimal - just a database, a user, and a connection string. For more on protecting your state data, see our guide on [Terraform state file encryption](https://oneuptime.com/blog/post/2026-02-23-terraform-state-file-encryption/view).
