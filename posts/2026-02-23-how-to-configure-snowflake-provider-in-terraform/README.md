# How to Configure Snowflake Provider in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Providers, Snowflake, Data Warehouse, Infrastructure as Code

Description: Learn how to configure the Snowflake provider in Terraform to manage warehouses, databases, schemas, roles, and grants in your data platform.

---

Snowflake is one of the most popular cloud data warehouses, and as data teams grow, managing Snowflake resources manually becomes a real bottleneck. Who created that warehouse? What permissions does this role have? Why does this database exist? The Snowflake Terraform provider answers these questions by letting you define your entire Snowflake configuration as code.

With the Snowflake provider, you can manage warehouses, databases, schemas, users, roles, grants, pipes, stages, and more. This brings the same infrastructure-as-code discipline to your data platform that engineering teams use for their cloud infrastructure.

## Prerequisites

- Terraform 1.0 or later
- A Snowflake account
- A Snowflake user with ACCOUNTADMIN or SYSADMIN role (for initial setup)
- RSA key pair for authentication (recommended)

## Authentication Setup

Snowflake supports several authentication methods. Key pair authentication is recommended for automation.

### Generating RSA Keys

```bash
# Generate an RSA private key
openssl genrsa 2048 | openssl pkcs8 -topk8 -inform PEM -out snowflake_key.p8 -nocrypt

# Generate the corresponding public key
openssl rsa -in snowflake_key.p8 -pubout -out snowflake_key.pub

# Get the public key content (without headers) to assign to the Snowflake user
grep -v "BEGIN\|END" snowflake_key.pub | tr -d '\n'
```

Assign the public key to your Snowflake user:

```sql
-- In Snowflake, assign the public key to the user
ALTER USER terraform_user SET RSA_PUBLIC_KEY='MIIBIjANBg...';
```

## Declaring the Provider

```hcl
# versions.tf - Declare the Snowflake provider
terraform {
  required_version = ">= 1.0"

  required_providers {
    snowflake = {
      source  = "Snowflake-Labs/snowflake"
      version = "~> 0.87"
    }
  }
}
```

## Provider Configuration

### Key Pair Authentication

```hcl
# provider.tf - Configure with key pair authentication
provider "snowflake" {
  organization_name = var.snowflake_organization
  account_name      = var.snowflake_account
  user              = var.snowflake_user
  private_key       = file(var.snowflake_private_key_path)
  role              = "SYSADMIN"
  warehouse         = "COMPUTE_WH"
}

variable "snowflake_organization" {
  type = string
}

variable "snowflake_account" {
  type = string
}

variable "snowflake_user" {
  type    = string
  default = "terraform_user"
}

variable "snowflake_private_key_path" {
  type    = string
  default = "~/.snowflake/snowflake_key.p8"
}
```

### Password Authentication

```hcl
# Password-based authentication (simpler but less secure)
provider "snowflake" {
  organization_name = var.snowflake_organization
  account_name      = var.snowflake_account
  user              = var.snowflake_user
  password          = var.snowflake_password
  role              = "SYSADMIN"
}
```

### Environment Variables

```bash
# Set Snowflake credentials via environment variables
export SNOWFLAKE_ORGANIZATION_NAME="my_org"
export SNOWFLAKE_ACCOUNT_NAME="my_account"
export SNOWFLAKE_USER="terraform_user"
export SNOWFLAKE_PRIVATE_KEY_PATH="~/.snowflake/snowflake_key.p8"
export SNOWFLAKE_ROLE="SYSADMIN"
export SNOWFLAKE_WAREHOUSE="COMPUTE_WH"
```

## Managing Warehouses

```hcl
# Create a warehouse for ETL workloads
resource "snowflake_warehouse" "etl" {
  name           = "ETL_WH"
  warehouse_size = "MEDIUM"
  comment        = "Warehouse for ETL processing"

  auto_suspend          = 60     # Suspend after 60 seconds of inactivity
  auto_resume           = true
  initially_suspended   = true

  # Scaling policy
  min_cluster_count     = 1
  max_cluster_count     = 3
  scaling_policy        = "STANDARD"

  warehouse_type        = "STANDARD"
}

# Create a warehouse for BI queries
resource "snowflake_warehouse" "bi" {
  name           = "BI_WH"
  warehouse_size = "LARGE"
  comment        = "Warehouse for BI and reporting queries"

  auto_suspend = 120
  auto_resume  = true

  # Resource monitor to control costs
  resource_monitor = snowflake_resource_monitor.bi.name
}

# Create a resource monitor for cost control
resource "snowflake_resource_monitor" "bi" {
  name            = "BI_MONITOR"
  credit_quota    = 100  # Credits per month

  frequency       = "MONTHLY"
  start_timestamp = "2026-03-01 00:00"

  notify_triggers = [75, 90]
  suspend_trigger = 100
  suspend_immediate_trigger = 110
}
```

## Managing Databases and Schemas

```hcl
# Create a database
resource "snowflake_database" "analytics" {
  name    = "ANALYTICS"
  comment = "Analytics and reporting database"

  data_retention_time_in_days = 7
}

# Create schemas within the database
resource "snowflake_schema" "raw" {
  database = snowflake_database.analytics.name
  name     = "RAW"
  comment  = "Raw data ingested from source systems"

  is_managed = true
  data_retention_time_in_days = 14
}

resource "snowflake_schema" "staging" {
  database = snowflake_database.analytics.name
  name     = "STAGING"
  comment  = "Staging area for data transformations"
}

resource "snowflake_schema" "marts" {
  database = snowflake_database.analytics.name
  name     = "MARTS"
  comment  = "Business-ready data marts"
}
```

## Role Management

```hcl
# Create roles following a hierarchy
resource "snowflake_account_role" "data_engineer" {
  name    = "DATA_ENGINEER"
  comment = "Role for data engineering team"
}

resource "snowflake_account_role" "data_analyst" {
  name    = "DATA_ANALYST"
  comment = "Role for data analysts"
}

resource "snowflake_account_role" "data_scientist" {
  name    = "DATA_SCIENTIST"
  comment = "Role for data science team"
}

# Set up role hierarchy
resource "snowflake_grant_account_role" "engineer_to_sysadmin" {
  role_name        = snowflake_account_role.data_engineer.name
  parent_role_name = "SYSADMIN"
}

resource "snowflake_grant_account_role" "analyst_to_sysadmin" {
  role_name        = snowflake_account_role.data_analyst.name
  parent_role_name = "SYSADMIN"
}
```

## Grant Management

```hcl
# Grant warehouse usage to roles
resource "snowflake_grant_privileges_to_account_role" "etl_wh_usage" {
  account_role_name = snowflake_account_role.data_engineer.name
  privileges        = ["USAGE", "OPERATE"]

  on_account_object {
    object_type = "WAREHOUSE"
    object_name = snowflake_warehouse.etl.name
  }
}

resource "snowflake_grant_privileges_to_account_role" "bi_wh_usage" {
  account_role_name = snowflake_account_role.data_analyst.name
  privileges        = ["USAGE"]

  on_account_object {
    object_type = "WAREHOUSE"
    object_name = snowflake_warehouse.bi.name
  }
}

# Grant database access
resource "snowflake_grant_privileges_to_account_role" "analytics_usage" {
  account_role_name = snowflake_account_role.data_analyst.name
  privileges        = ["USAGE"]

  on_account_object {
    object_type = "DATABASE"
    object_name = snowflake_database.analytics.name
  }
}

# Grant schema access
resource "snowflake_grant_privileges_to_account_role" "marts_all" {
  account_role_name = snowflake_account_role.data_analyst.name
  privileges        = ["USAGE"]

  on_schema {
    schema_name = "\"${snowflake_database.analytics.name}\".\"${snowflake_schema.marts.name}\""
  }
}

# Grant SELECT on all tables in a schema
resource "snowflake_grant_privileges_to_account_role" "marts_select" {
  account_role_name = snowflake_account_role.data_analyst.name
  privileges        = ["SELECT"]

  on_schema_object {
    all {
      object_type_plural = "TABLES"
      in_schema          = "\"${snowflake_database.analytics.name}\".\"${snowflake_schema.marts.name}\""
    }
  }
}

# Grant on future tables
resource "snowflake_grant_privileges_to_account_role" "marts_future_select" {
  account_role_name = snowflake_account_role.data_analyst.name
  privileges        = ["SELECT"]

  on_schema_object {
    future {
      object_type_plural = "TABLES"
      in_schema          = "\"${snowflake_database.analytics.name}\".\"${snowflake_schema.marts.name}\""
    }
  }
}
```

## User Management

```hcl
# Create a user
resource "snowflake_user" "analyst_john" {
  name              = "JOHN_DOE"
  login_name        = "john.doe@example.com"
  email             = "john.doe@example.com"
  display_name      = "John Doe"
  first_name        = "John"
  last_name         = "Doe"
  default_warehouse = snowflake_warehouse.bi.name
  default_role      = snowflake_account_role.data_analyst.name

  must_change_password = true
}

# Assign the role to the user
resource "snowflake_grant_account_role" "john_analyst" {
  role_name = snowflake_account_role.data_analyst.name
  user_name = snowflake_user.analyst_john.name
}
```

## Stages and Pipes

```hcl
# Create an external stage pointing to S3
resource "snowflake_stage" "s3_raw" {
  database = snowflake_database.analytics.name
  schema   = snowflake_schema.raw.name
  name     = "S3_RAW_STAGE"

  url         = "s3://my-data-bucket/raw/"
  credentials = "AWS_KEY_ID='${var.aws_key}' AWS_SECRET_KEY='${var.aws_secret}'"

  file_format = "TYPE = JSON"
  comment     = "Stage for raw JSON data from S3"
}

# Create a pipe for continuous data loading
resource "snowflake_pipe" "raw_events" {
  database = snowflake_database.analytics.name
  schema   = snowflake_schema.raw.name
  name     = "RAW_EVENTS_PIPE"

  auto_ingest = true
  comment     = "Auto-ingest pipe for raw events"

  copy_statement = <<-SQL
    COPY INTO ${snowflake_database.analytics.name}.${snowflake_schema.raw.name}.EVENTS
    FROM @${snowflake_stage.s3_raw.fully_qualified_name}
    FILE_FORMAT = (TYPE = JSON)
  SQL
}
```

## Network Policies

```hcl
# Create a network policy to restrict access
resource "snowflake_network_policy" "corporate" {
  name    = "CORPORATE_POLICY"
  comment = "Allow access only from corporate network"

  allowed_ip_list = [
    "203.0.113.0/24",   # Office IP range
    "198.51.100.0/24",  # VPN IP range
  ]

  blocked_ip_list = [
    "203.0.113.100/32",  # Exclude a specific IP
  ]
}
```

## Best Practices

1. Use key pair authentication for service accounts. It is more secure than password authentication.

2. Follow the principle of least privilege. Create specific roles and grant only the permissions needed.

3. Use resource monitors to control costs. Set up alerts at 75% and suspend at 100% of the credit quota.

4. Use separate warehouses for different workloads (ETL, BI, data science) to isolate performance and costs.

5. Grant permissions on future objects to avoid manually updating grants when new tables are created.

6. Set `auto_suspend` on all warehouses. Idle warehouses consume credits for no reason.

## Wrapping Up

The Snowflake Terraform provider brings infrastructure-as-code practices to your data platform. By managing warehouses, databases, roles, grants, and other resources through Terraform, you get audit trails, code reviews, and consistent environments. This is invaluable for data teams that need to move fast while maintaining governance.

For monitoring your data pipelines and Snowflake workloads, [OneUptime](https://oneuptime.com) offers observability tools that help you track pipeline health and query performance.
