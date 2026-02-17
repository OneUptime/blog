# How to Implement Per-Tenant Billing and Cost Attribution Using GCP Labels and BigQuery Export

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Billing, Cost Attribution, BigQuery, Multi-Tenancy, Labels

Description: Learn how to implement per-tenant billing and cost attribution on Google Cloud Platform using resource labels and BigQuery billing export for accurate SaaS cost tracking.

---

If you run a multi-tenant SaaS application on GCP, knowing how much each tenant actually costs you is critical. Without this data, you are flying blind on pricing, you cannot identify unprofitable tenants, and you have no way to forecast infrastructure costs as you grow.

GCP provides two powerful mechanisms for cost attribution: resource labels and billing export to BigQuery. Together, they let you break down your cloud bill by tenant with surprising accuracy. Here is how to set it all up.

## The Cost Attribution Strategy

Before writing any code, you need a labeling strategy. GCP labels are key-value pairs that you can attach to most resources. The billing export includes these labels, which means you can slice your costs by any label dimension.

The minimum set of labels for multi-tenant cost attribution is:

- `tenant-id` - the unique identifier for the tenant
- `environment` - production, staging, development
- `service` - which microservice or component uses this resource
- `cost-center` - for internal accounting

## Step 1: Enable Billing Export to BigQuery

First, set up the billing export. This streams your billing data into BigQuery where you can query it.

```bash
# Create a BigQuery dataset for billing data
bq mk --dataset \
  --description "GCP Billing Export" \
  --location US \
  billing_export

# The actual export is configured in the GCP Console under
# Billing > Billing export > BigQuery export
# Choose "Detailed usage cost" for the most granular data
```

You can also automate this with Terraform.

```hcl
# Create the BigQuery dataset for billing export
resource "google_bigquery_dataset" "billing_export" {
  dataset_id    = "billing_export"
  project       = var.billing_project_id
  location      = "US"
  friendly_name = "GCP Billing Export"
  description   = "Contains detailed billing data exported from Cloud Billing"

  # Restrict access to billing admins
  access {
    role          = "OWNER"
    user_by_email = var.billing_admin_email
  }

  access {
    role          = "READER"
    group_by_email = var.finance_group_email
  }
}
```

## Step 2: Apply Labels Consistently

The key to accurate cost attribution is applying labels consistently to every resource. Here is how to label common GCP resources.

```hcl
# Label Compute Engine instances
resource "google_compute_instance" "app_server" {
  name         = "app-server-1"
  machine_type = "e2-standard-4"
  zone         = "us-central1-a"

  labels = {
    tenant-id   = var.tenant_id
    environment = "production"
    service     = "api-server"
    cost-center = "engineering"
  }

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-12"
      labels = {
        tenant-id = var.tenant_id
      }
    }
  }

  network_interface {
    network = var.network_id
  }
}

# Label Cloud SQL instances
resource "google_sql_database_instance" "db" {
  name             = "tenant-db"
  database_version = "POSTGRES_15"
  region           = "us-central1"

  settings {
    tier = "db-custom-2-4096"

    user_labels = {
      tenant-id   = var.tenant_id
      environment = "production"
      service     = "database"
      cost-center = "engineering"
    }
  }
}

# Label Cloud Storage buckets
resource "google_storage_bucket" "tenant_data" {
  name     = "tenant-${var.tenant_id}-data"
  location = "US"

  labels = {
    tenant-id   = var.tenant_id
    environment = "production"
    service     = "storage"
    cost-center = "engineering"
  }
}

# Label GKE clusters and node pools
resource "google_container_node_pool" "tenant_pool" {
  name       = "tenant-${var.tenant_id}-pool"
  cluster    = google_container_cluster.primary.name
  node_count = 3

  node_config {
    labels = {
      tenant-id = var.tenant_id
    }

    resource_labels = {
      tenant-id   = var.tenant_id
      environment = "production"
    }
  }
}
```

## Step 3: Enforce Labels with Organization Policies

Labels are only useful if they are applied consistently. Use a Cloud Function to audit and enforce labeling.

```python
# label_enforcer.py - Cloud Function that checks for missing labels
from google.cloud import asset_v1
from google.cloud import pubsub_v1
import json

# Required labels that every resource must have
REQUIRED_LABELS = ["tenant-id", "environment", "service"]

def audit_labels(event, context):
    """Audit resources for missing required labels.
    Triggered on a schedule by Cloud Scheduler."""

    client = asset_v1.AssetServiceClient()
    project = "projects/my-project"

    # Search for resources that are missing required labels
    for label in REQUIRED_LABELS:
        # Find resources without this label
        query = f"NOT labels.{label}:*"

        request = asset_v1.SearchAllResourcesRequest(
            scope=project,
            query=query,
            asset_types=[
                "compute.googleapis.com/Instance",
                "sqladmin.googleapis.com/Instance",
                "storage.googleapis.com/Bucket",
            ]
        )

        results = client.search_all_resources(request=request)

        for resource in results:
            print(f"MISSING LABEL '{label}': {resource.name}")
            # Send an alert or notification
            notify_missing_label(resource.name, label)

def notify_missing_label(resource_name, missing_label):
    """Send a notification about a resource with missing labels."""
    publisher = pubsub_v1.PublisherClient()
    topic = "projects/my-project/topics/label-violations"

    message = json.dumps({
        "resource": resource_name,
        "missing_label": missing_label,
        "severity": "warning"
    }).encode("utf-8")

    publisher.publish(topic, message)
```

## Step 4: Query Per-Tenant Costs in BigQuery

Once billing export is flowing and resources are labeled, you can query per-tenant costs. Here are the queries you will use most often.

```sql
-- Monthly cost per tenant
-- This gives you the total spend attributed to each tenant
SELECT
  labels.value AS tenant_id,
  invoice.month AS billing_month,
  SUM(cost) AS total_cost,
  SUM(credits.amount) AS total_credits,
  SUM(cost) + SUM(credits.amount) AS net_cost
FROM
  `billing_export.gcp_billing_export_v1_XXXXXX_XXXXXX_XXXXXX` AS billing,
  UNNEST(labels) AS labels,
  UNNEST(credits) AS credits
WHERE
  labels.key = "tenant-id"
  AND invoice.month = "202602"
GROUP BY
  tenant_id, billing_month
ORDER BY
  net_cost DESC;
```

```sql
-- Cost breakdown by service for a specific tenant
-- Useful for understanding what drives a particular tenant's costs
SELECT
  labels.value AS tenant_id,
  service.description AS gcp_service,
  sku.description AS sku_description,
  SUM(cost) AS total_cost,
  SUM(usage.amount) AS total_usage,
  usage.unit AS usage_unit
FROM
  `billing_export.gcp_billing_export_v1_XXXXXX_XXXXXX_XXXXXX` AS billing,
  UNNEST(labels) AS labels
WHERE
  labels.key = "tenant-id"
  AND labels.value = "acme-corp"
  AND invoice.month = "202602"
GROUP BY
  tenant_id, gcp_service, sku_description, usage_unit
ORDER BY
  total_cost DESC
LIMIT 20;
```

```sql
-- Identify tenants whose costs are growing fastest month over month
WITH monthly_costs AS (
  SELECT
    labels.value AS tenant_id,
    invoice.month AS billing_month,
    SUM(cost) AS total_cost
  FROM
    `billing_export.gcp_billing_export_v1_XXXXXX_XXXXXX_XXXXXX`,
    UNNEST(labels) AS labels
  WHERE
    labels.key = "tenant-id"
  GROUP BY
    tenant_id, billing_month
)
SELECT
  current.tenant_id,
  previous.total_cost AS previous_month_cost,
  current.total_cost AS current_month_cost,
  ROUND((current.total_cost - previous.total_cost) / previous.total_cost * 100, 2) AS growth_pct
FROM
  monthly_costs current
JOIN
  monthly_costs previous
ON
  current.tenant_id = previous.tenant_id
  AND FORMAT_DATE('%Y%m', DATE_ADD(PARSE_DATE('%Y%m', previous.billing_month), INTERVAL 1 MONTH)) = current.billing_month
WHERE
  current.billing_month = "202602"
  AND previous.total_cost > 0
ORDER BY
  growth_pct DESC
LIMIT 10;
```

## Step 5: Handle Shared Resource Costs

Not all costs can be directly attributed to a single tenant. Shared resources like load balancers, monitoring infrastructure, and control plane services need to be allocated using a fair distribution model.

```sql
-- Calculate shared costs and distribute them proportionally
-- based on each tenant's direct resource usage
WITH
  direct_costs AS (
    SELECT
      labels.value AS tenant_id,
      SUM(cost) AS tenant_direct_cost
    FROM
      `billing_export.gcp_billing_export_v1_XXXXXX_XXXXXX_XXXXXX`,
      UNNEST(labels) AS labels
    WHERE
      labels.key = "tenant-id"
      AND invoice.month = "202602"
    GROUP BY tenant_id
  ),
  total_direct AS (
    SELECT SUM(tenant_direct_cost) AS total FROM direct_costs
  ),
  shared_costs AS (
    SELECT SUM(cost) AS total_shared
    FROM `billing_export.gcp_billing_export_v1_XXXXXX_XXXXXX_XXXXXX`
    WHERE
      -- Resources without tenant labels are considered shared
      NOT EXISTS (
        SELECT 1 FROM UNNEST(labels) l WHERE l.key = "tenant-id"
      )
      AND invoice.month = "202602"
  )
SELECT
  d.tenant_id,
  d.tenant_direct_cost,
  ROUND(s.total_shared * (d.tenant_direct_cost / t.total), 2) AS allocated_shared_cost,
  ROUND(d.tenant_direct_cost + s.total_shared * (d.tenant_direct_cost / t.total), 2) AS total_attributed_cost
FROM
  direct_costs d,
  total_direct t,
  shared_costs s
ORDER BY
  total_attributed_cost DESC;
```

## Step 6: Build an Automated Cost Report

Set up a scheduled query that generates a monthly cost report and stores it in a table your billing dashboard can read.

```hcl
# Scheduled query that runs monthly to generate tenant cost reports
resource "google_bigquery_data_transfer_config" "tenant_cost_report" {
  display_name   = "Monthly Tenant Cost Report"
  location       = "US"
  data_source_id = "scheduled_query"
  schedule       = "1 of month 06:00"
  project        = var.billing_project_id

  params = {
    query = <<-SQL
      INSERT INTO billing_export.tenant_monthly_costs
      SELECT
        labels.value AS tenant_id,
        invoice.month,
        SUM(cost) AS total_cost,
        CURRENT_TIMESTAMP() AS report_generated_at
      FROM
        `billing_export.gcp_billing_export_v1_XXXXXX_XXXXXX_XXXXXX`,
        UNNEST(labels) AS labels
      WHERE
        labels.key = "tenant-id"
        AND invoice.month = FORMAT_DATE('%Y%m', DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))
      GROUP BY tenant_id, invoice.month
    SQL
    destination_table_name_template = "tenant_monthly_costs"
    write_disposition               = "WRITE_APPEND"
  }
}
```

## Wrapping Up

Per-tenant cost attribution on GCP comes down to three things: consistent labeling, billing export to BigQuery, and smart SQL queries. Start by defining your labeling strategy, enforce it with automation, and build queries that break down costs by tenant. This data is essential for pricing decisions, profitability analysis, and capacity planning. The sooner you set it up, the better visibility you will have into your unit economics.
