# How to Create BigQuery Datasets and Tables with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, GCP, BigQuery, Data Engineering, Analytics, Infrastructure as Code, Google Cloud

Description: Learn how to create and manage BigQuery datasets, tables, views, and IAM bindings using OpenTofu for governed, reproducible data warehouse infrastructure.

---

BigQuery is Google Cloud's serverless, fully managed data warehouse. Managing datasets and tables through the Console leads to ungoverned growth and inconsistent access controls. OpenTofu lets you define your entire BigQuery schema and access model as code, audited through version control.

## Creating Datasets

```hcl
# main.tf

terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 7.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# Create a dataset for analytics data
resource "google_bigquery_dataset" "analytics" {
  dataset_id                  = "analytics"
  friendly_name               = "Analytics Dataset"
  description                 = "Contains processed analytics events and aggregated metrics"
  location                    = var.location  # e.g., US or EU

  # Default table expiration - 2 years
  default_table_expiration_ms = 63072000000

  # Default partition expiration for partitioned tables
  default_partition_expiration_ms = 63072000000

  access {
    role          = "OWNER"
    user_by_email = var.data_admin_email
  }

  access {
    role   = "READER"
    group_by_email = var.data_consumers_group
  }

  labels = {
    environment = var.environment
    managed_by  = "opentofu"
  }
}
```

## Creating Tables with Schema Definitions

```hcl
# tables.tf
# Create a partitioned table for events
resource "google_bigquery_table" "events" {
  dataset_id = google_bigquery_dataset.analytics.dataset_id
  table_id   = "events"
  description = "Raw user events partitioned by date"

  # Partition by event timestamp to enable efficient queries by date
  time_partitioning {
    type                     = "DAY"
    field                    = "event_timestamp"
    expiration_ms            = 31536000000  # 1 year
  }

  require_partition_filter = true  # Force queries to include partition filter

  # Cluster by user_id for faster filtering
  clustering = ["user_id", "event_type"]

  schema = jsonencode([
    {
      name = "event_id"
      type = "STRING"
      mode = "REQUIRED"
      description = "Unique identifier for the event"
    },
    {
      name = "event_timestamp"
      type = "TIMESTAMP"
      mode = "REQUIRED"
      description = "When the event occurred"
    },
    {
      name = "user_id"
      type = "STRING"
      mode = "NULLABLE"
      description = "User who triggered the event"
    },
    {
      name = "event_type"
      type = "STRING"
      mode = "REQUIRED"
      description = "Type of event (e.g., page_view, click, purchase)"
    },
    {
      name = "properties"
      type = "JSON"
      mode = "NULLABLE"
      description = "Flexible event properties"
    }
  ])

  labels = {
    managed_by = "opentofu"
  }
}
```

## Creating Views

```hcl
# views.tf
resource "google_bigquery_table" "daily_active_users" {
  dataset_id = google_bigquery_dataset.analytics.dataset_id
  table_id   = "daily_active_users_v"
  description = "Daily active users aggregation"

  view {
    query = <<-SQL
      SELECT
        DATE(event_timestamp) AS date,
        COUNT(DISTINCT user_id) AS daily_active_users
      FROM `${var.project_id}.analytics.events`
      WHERE
        DATE(event_timestamp) >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY)
        AND user_id IS NOT NULL
      GROUP BY date
      ORDER BY date DESC
    SQL
    use_legacy_sql = false
  }
}
```

## Column-Level Security with Policy Tags

```hcl
# security.tf
# Create a policy taxonomy for PII classification
resource "google_data_catalog_taxonomy" "pii" {
  region       = lower(var.location)  # Must match the BigQuery dataset location
  display_name = "PII Classification"
  description  = "Taxonomy for classifying personally identifiable information"
  activated_policy_types = ["FINE_GRAINED_ACCESS_CONTROL"]
}

resource "google_data_catalog_policy_tag" "sensitive" {
  taxonomy     = google_data_catalog_taxonomy.pii.name
  display_name = "Sensitive PII"
  description  = "Highly sensitive personal data requiring strict access control"
}

# Apply policy tag to restrict email column access
resource "google_bigquery_table" "users" {
  dataset_id = google_bigquery_dataset.analytics.dataset_id
  table_id   = "users"

  schema = jsonencode([
    {
      name = "user_id"
      type = "STRING"
      mode = "REQUIRED"
    },
    {
      name = "email"
      type = "STRING"
      mode = "NULLABLE"
      # Restrict access to this column using policy tags
      policyTags = {
        names = [google_data_catalog_policy_tag.sensitive.name]
      }
    }
  ])
}
```

## Best Practices

- Use time partitioning on all large tables and set `require_partition_filter = true` to prevent expensive full-table scans.
- Add clustering on the columns most commonly used in WHERE clauses, and order clustered columns by priority.
- Use `default_table_expiration_ms` on datasets to automatically clean up old data and control storage costs.
- Apply policy tags to sensitive columns (PII, financial data) to enforce column-level access control.
- Use OpenTofu to manage dataset-level access controls - this ensures access grants are tracked and reviewable.
