# How to Configure Databricks Provider in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Provider, Databricks, Data Engineering, Infrastructure as Code

Description: A hands-on guide to configuring the Databricks provider in Terraform for managing workspaces, clusters, jobs, notebooks, and access control.

---

Databricks has become a central platform for data engineering, data science, and analytics. As your Databricks usage grows, managing workspaces, clusters, jobs, and permissions through the UI becomes impractical. The Databricks Terraform provider lets you codify your entire Databricks configuration, from workspace setup to cluster policies, job definitions, and access control.

Whether you are setting up a new workspace or standardizing an existing one, this guide covers how to configure the provider and manage common Databricks resources.

## Prerequisites

- Terraform 1.0 or later
- A Databricks workspace (AWS, Azure, or GCP)
- A Databricks personal access token or service principal credentials
- The workspace URL

## Getting Your Access Token

1. Log in to your Databricks workspace
2. Click your username in the top right
3. Select User Settings
4. Go to Developer > Access Tokens
5. Click Generate New Token
6. Set a comment and lifetime, then copy the token

## Declaring the Provider

```hcl
# versions.tf - Declare the Databricks provider
terraform {
  required_version = ">= 1.0"

  required_providers {
    databricks = {
      source  = "databricks/databricks"
      version = "~> 1.38"
    }
  }
}
```

## Provider Configuration

### Personal Access Token

```hcl
# provider.tf - Configure with a personal access token
provider "databricks" {
  host  = var.databricks_host
  token = var.databricks_token
}

variable "databricks_host" {
  type        = string
  description = "Databricks workspace URL (e.g., https://adb-1234567890.12.azuredatabricks.net)"
}

variable "databricks_token" {
  type        = string
  sensitive   = true
  description = "Databricks personal access token"
}
```

### Azure Service Principal

```hcl
# Azure Active Directory service principal authentication
provider "databricks" {
  host                        = var.databricks_host
  azure_workspace_resource_id = var.azure_databricks_resource_id
  azure_tenant_id             = var.azure_tenant_id
  azure_client_id             = var.azure_client_id
  azure_client_secret         = var.azure_client_secret
}
```

### AWS Configuration

```hcl
# AWS account-level provider for workspace management
provider "databricks" {
  alias    = "accounts"
  host     = "https://accounts.cloud.databricks.com"
  username = var.databricks_account_username
  password = var.databricks_account_password
}

# Workspace-level provider
provider "databricks" {
  alias = "workspace"
  host  = databricks_mws_workspaces.main.workspace_url
  token = databricks_mws_workspaces.main.token[0].token_value
}
```

### Environment Variables

```bash
# Set Databricks credentials via environment variables
export DATABRICKS_HOST="https://your-workspace.cloud.databricks.com"
export DATABRICKS_TOKEN="dapi-your-token-here"
```

## Cluster Management

### All-Purpose Cluster

```hcl
# Get the latest LTS Spark version
data "databricks_spark_version" "lts" {
  long_term_support = true
}

# Get the smallest available node type
data "databricks_node_type" "smallest" {
  local_disk = true
}

# Create an all-purpose cluster
resource "databricks_cluster" "shared" {
  cluster_name            = "shared-analytics"
  spark_version           = data.databricks_spark_version.lts.id
  node_type_id            = data.databricks_node_type.smallest.id
  autotermination_minutes = 30

  autoscale {
    min_workers = 1
    max_workers = 10
  }

  spark_conf = {
    "spark.databricks.cluster.profile" = "singleNode"
    "spark.sql.adaptive.enabled"       = "true"
  }

  custom_tags = {
    Environment = "production"
    Team        = "data-engineering"
  }
}
```

### Cluster Policy

```hcl
# Create a cluster policy to control what users can configure
resource "databricks_cluster_policy" "standard" {
  name = "Standard Policy"

  definition = jsonencode({
    "autotermination_minutes" : {
      "type" : "range",
      "maxValue" : 120,
      "defaultValue" : 30
    },
    "num_workers" : {
      "type" : "range",
      "minValue" : 1,
      "maxValue" : 20,
      "defaultValue" : 2
    },
    "node_type_id" : {
      "type" : "allowlist",
      "values" : [
        "i3.xlarge",
        "i3.2xlarge",
        "m5.xlarge",
        "m5.2xlarge"
      ],
      "defaultValue" : "i3.xlarge"
    },
    "spark_version" : {
      "type" : "regex",
      "pattern" : ".*-scala2\\.12$"
    }
  })
}

# Create a cluster that uses the policy
resource "databricks_cluster" "policy_based" {
  cluster_name            = "policy-cluster"
  policy_id               = databricks_cluster_policy.standard.id
  spark_version           = data.databricks_spark_version.lts.id
  node_type_id            = "i3.xlarge"
  autotermination_minutes = 30
  num_workers             = 2
}
```

## Job Management

```hcl
# Create a scheduled job
resource "databricks_job" "etl_pipeline" {
  name = "Daily ETL Pipeline"

  task {
    task_key = "extract"

    new_cluster {
      num_workers   = 4
      spark_version = data.databricks_spark_version.lts.id
      node_type_id  = "i3.xlarge"
    }

    notebook_task {
      notebook_path = databricks_notebook.extract.path
      base_parameters = {
        source_date = "{{job.trigger_time.iso_date}}"
      }
    }
  }

  task {
    task_key = "transform"
    depends_on {
      task_key = "extract"
    }

    new_cluster {
      num_workers   = 8
      spark_version = data.databricks_spark_version.lts.id
      node_type_id  = "i3.2xlarge"
    }

    notebook_task {
      notebook_path = databricks_notebook.transform.path
    }
  }

  task {
    task_key = "load"
    depends_on {
      task_key = "transform"
    }

    existing_cluster_id = databricks_cluster.shared.id

    notebook_task {
      notebook_path = databricks_notebook.load.path
    }
  }

  schedule {
    quartz_cron_expression = "0 0 6 * * ?"  # 6 AM daily
    timezone_id            = "America/New_York"
  }

  email_notifications {
    on_failure = ["data-team@example.com"]
  }

  max_retries = 2
  timeout_seconds = 7200  # 2 hours
}
```

## Notebooks

```hcl
# Deploy a notebook from a local file
resource "databricks_notebook" "extract" {
  path     = "/Production/ETL/extract"
  language = "PYTHON"
  source   = "${path.module}/notebooks/extract.py"
}

resource "databricks_notebook" "transform" {
  path     = "/Production/ETL/transform"
  language = "PYTHON"
  source   = "${path.module}/notebooks/transform.py"
}

resource "databricks_notebook" "load" {
  path     = "/Production/ETL/load"
  language = "PYTHON"
  source   = "${path.module}/notebooks/load.py"
}

# Create a notebook directory
resource "databricks_directory" "production" {
  path = "/Production"
}

resource "databricks_directory" "etl" {
  path = "/Production/ETL"
}
```

## Secret Management

```hcl
# Create a secret scope
resource "databricks_secret_scope" "app" {
  name = "app-secrets"
}

# Store secrets
resource "databricks_secret" "db_password" {
  scope        = databricks_secret_scope.app.name
  key          = "database-password"
  string_value = var.database_password
}

resource "databricks_secret" "api_key" {
  scope        = databricks_secret_scope.app.name
  key          = "api-key"
  string_value = var.api_key
}
```

## Access Control

```hcl
# Create a group
resource "databricks_group" "data_engineers" {
  display_name = "data-engineers"
}

resource "databricks_group" "data_analysts" {
  display_name = "data-analysts"
}

# Add users to groups
resource "databricks_user" "analyst" {
  user_name = "analyst@example.com"
}

resource "databricks_group_member" "analyst_membership" {
  group_id  = databricks_group.data_analysts.id
  member_id = databricks_user.analyst.id
}

# Set permissions on a cluster
resource "databricks_permissions" "shared_cluster" {
  cluster_id = databricks_cluster.shared.id

  access_control {
    group_name       = databricks_group.data_engineers.display_name
    permission_level = "CAN_MANAGE"
  }

  access_control {
    group_name       = databricks_group.data_analysts.display_name
    permission_level = "CAN_RESTART"
  }
}

# Set permissions on a job
resource "databricks_permissions" "etl_job" {
  job_id = databricks_job.etl_pipeline.id

  access_control {
    group_name       = databricks_group.data_engineers.display_name
    permission_level = "CAN_MANAGE_RUN"
  }

  access_control {
    group_name       = databricks_group.data_analysts.display_name
    permission_level = "CAN_VIEW"
  }
}
```

## Unity Catalog

```hcl
# Create a catalog
resource "databricks_catalog" "analytics" {
  name    = "analytics"
  comment = "Analytics catalog for production data"
}

# Create a schema within the catalog
resource "databricks_schema" "sales" {
  catalog_name = databricks_catalog.analytics.name
  name         = "sales"
  comment      = "Sales data marts"
}

# Grant permissions on the catalog
resource "databricks_grants" "analytics_catalog" {
  catalog = databricks_catalog.analytics.name

  grant {
    principal  = databricks_group.data_analysts.display_name
    privileges = ["USE_CATALOG", "USE_SCHEMA", "SELECT"]
  }

  grant {
    principal  = databricks_group.data_engineers.display_name
    privileges = ["USE_CATALOG", "USE_SCHEMA", "SELECT", "CREATE_TABLE", "MODIFY"]
  }
}
```

## SQL Warehouses

```hcl
# Create a SQL warehouse for BI workloads
resource "databricks_sql_endpoint" "bi" {
  name             = "BI Warehouse"
  cluster_size     = "Medium"
  max_num_clusters = 3
  min_num_clusters = 1

  auto_stop_mins = 15

  warehouse_type = "PRO"

  tags {
    custom_tags {
      key   = "Environment"
      value = "Production"
    }
  }
}
```

## Best Practices

1. Use service principals for authentication in CI/CD pipelines instead of personal access tokens.

2. Create cluster policies to prevent users from spinning up expensive clusters.

3. Use Unity Catalog for data governance when available. It provides centralized access control.

4. Set `autotermination_minutes` on all clusters to avoid running idle resources.

5. Manage notebooks through Terraform for version control, but consider using Databricks Repos for active development.

6. Use secret scopes for credentials instead of hardcoding them in notebooks.

## Wrapping Up

The Databricks Terraform provider gives you comprehensive control over your data platform configuration. From cluster management and job scheduling to access control and Unity Catalog, everything can be defined in code. This is essential for data teams that need reproducible environments and auditable access controls.

For monitoring your Databricks jobs and data pipelines, [OneUptime](https://oneuptime.com) provides observability tools that complement Databricks' built-in monitoring capabilities.
