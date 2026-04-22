# How to Deploy Snowflake Resources with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Snowflake, Data Warehouse, Infrastructure as Code, Data Engineering, Analytics

Description: Learn how to manage Snowflake databases, warehouses, roles, and users using OpenTofu for governed, reproducible Snowflake infrastructure management.

---

Snowflake separates compute (virtual warehouses) from storage, making it uniquely flexible. Managing Snowflake resources manually through the UI leads to configuration drift, undocumented grants, and hard-to-debug permission issues. OpenTofu's Snowflake provider brings these resources under version control.

## Provider Configuration

```hcl
# main.tf

terraform {
  required_providers {
    snowflake = {
      source  = "snowflakedb/snowflake"
      version = "~> 2.15"
    }
  }
}

provider "snowflake" {
  organization_name = var.snowflake_organization_name
  account_name      = var.snowflake_account_name
  user              = var.snowflake_user
  password          = var.snowflake_password
  role              = "ACCOUNTADMIN"
}
```

## Creating Databases and Schemas

```hcl
# databases.tf
# Create a production database
resource "snowflake_database" "production" {
  name    = "PRODUCTION"
  comment = "Production data warehouse database"

  # Data retention for Time Travel (7 days requires Enterprise Edition or higher)
  data_retention_time_in_days = 7
}

# Create schemas within the database
resource "snowflake_schema" "raw" {
  database = snowflake_database.production.name
  name     = "RAW"
  comment  = "Raw ingested data - do not query directly"
  data_retention_time_in_days = 1  # Short retention for raw zone
}

resource "snowflake_schema" "analytics" {
  database = snowflake_database.production.name
  name     = "ANALYTICS"
  comment  = "Analytics-ready tables and views"
  data_retention_time_in_days = 7  # Requires Enterprise Edition or higher
}
```

## Creating Virtual Warehouses

```hcl
# warehouses.tf
# ETL warehouse - suspend when idle to save credits
resource "snowflake_warehouse" "etl" {
  name           = "ETL_WAREHOUSE"
  warehouse_size = "MEDIUM"
  auto_suspend   = 60   # Suspend after 60 seconds of inactivity
  auto_resume    = true
  comment        = "Warehouse for ETL/ELT transformations"

  # Allow scale-out for concurrent batch jobs (Enterprise Edition or higher)
  max_cluster_count = 3
  min_cluster_count = 1
  scaling_policy    = "ECONOMY"
}

# Reporting warehouse - responsive for end users
resource "snowflake_warehouse" "reporting" {
  name           = "REPORTING_WAREHOUSE"
  warehouse_size = "SMALL"
  auto_suspend   = 120  # Keep warm briefly for interactive users
  auto_resume    = true
  comment        = "Warehouse for BI tools and ad-hoc queries"

  # Allow scale-out for concurrent dashboard queries (Enterprise Edition or higher)
  max_cluster_count = 5
  min_cluster_count = 1
  scaling_policy    = "STANDARD"
}
```

## Creating Roles and Granting Permissions

```hcl
# roles.tf
# Create a role for data analysts
resource "snowflake_account_role" "data_analyst" {
  name    = "DATA_ANALYST"
  comment = "Read access to analytics schema for data analysts"
}

resource "snowflake_account_role" "etl" {
  name    = "ETL_ROLE"
  comment = "Role for the ETL service account"
}

# Grant usage on the database
resource "snowflake_grant_privileges_to_account_role" "analyst_db_usage" {
  account_role_name = snowflake_account_role.data_analyst.name
  privileges        = ["USAGE"]

  on_account_object {
    object_type = "DATABASE"
    object_name = snowflake_database.production.name
  }
}

# Grant usage on the analytics schema
resource "snowflake_grant_privileges_to_account_role" "analyst_schema_usage" {
  account_role_name = snowflake_account_role.data_analyst.name
  privileges        = ["USAGE"]

  on_schema {
    schema_name = snowflake_schema.analytics.fully_qualified_name
  }
}

# Grant select on all tables in the analytics schema
resource "snowflake_grant_privileges_to_account_role" "analyst_select" {
  account_role_name = snowflake_account_role.data_analyst.name
  privileges        = ["SELECT"]

  on_schema_object {
    all {
      object_type_plural = "TABLES"
      in_schema          = snowflake_schema.analytics.fully_qualified_name
    }
  }
}

# Grant warehouse usage
resource "snowflake_grant_privileges_to_account_role" "analyst_warehouse" {
  account_role_name = snowflake_account_role.data_analyst.name
  privileges        = ["USAGE"]

  on_account_object {
    object_type = "WAREHOUSE"
    object_name = snowflake_warehouse.reporting.name
  }
}

resource "snowflake_grant_privileges_to_account_role" "etl_warehouse" {
  account_role_name = snowflake_account_role.etl.name
  privileges        = ["USAGE"]

  on_account_object {
    object_type = "WAREHOUSE"
    object_name = snowflake_warehouse.etl.name
  }
}
```

## Creating Users

```hcl
# users.tf
# Create a service account user for the ETL pipeline
resource "snowflake_service_user" "etl_service" {
  name              = "ETL_SERVICE_ACCOUNT"
  login_name        = "etl_service"
  rsa_public_key    = var.etl_service_rsa_public_key
  comment           = "Service account for ETL pipeline"
  default_role      = snowflake_account_role.etl.name
  default_warehouse = snowflake_warehouse.etl.name
}

resource "snowflake_grant_account_role" "etl_role_grant" {
  role_name = snowflake_account_role.etl.name
  user_name = snowflake_service_user.etl_service.name
}
```

## Best Practices

- Always set `auto_suspend` on warehouses - even 60 seconds of auto-suspend eliminates most idle costs.
- Use Role-Based Access Control (RBAC) with functional roles rather than granting permissions directly to users.
- Use least-privilege automation roles or provider aliases in production instead of long-lived `ACCOUNTADMIN` credentials.
- Set `data_retention_time_in_days = 7` on production databases to enable time travel for data recovery when your Snowflake edition supports retention periods longer than 1 day.
- Use Snowflake's `FUTURE GRANTS` where possible to automatically apply grants to new tables - the Snowflake provider models this with the `future` block inside `on_schema_object`.
- Store Snowflake credentials and private keys in a secrets manager, not in OpenTofu variable files.
