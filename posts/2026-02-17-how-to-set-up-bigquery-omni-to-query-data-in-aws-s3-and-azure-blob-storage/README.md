# How to Set Up BigQuery Omni to Query Data in AWS S3 and Azure Blob Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, BigQuery Omni, Multi-Cloud, AWS S3, Azure

Description: Step-by-step guide to setting up BigQuery Omni to query data stored in AWS S3 and Azure Blob Storage without moving it to Google Cloud.

---

Most organizations do not keep all their data in one cloud. You might have data lakes in AWS S3, analytics workloads in BigQuery, and some datasets in Azure Blob Storage. Traditionally, querying across clouds meant copying data between providers - expensive, slow, and a nightmare for data freshness. BigQuery Omni changes this by letting you run BigQuery queries directly against data in AWS S3 and Azure Blob Storage without moving it. The data stays where it is, and BigQuery runs compute in that cloud to process it.

## How BigQuery Omni Works

BigQuery Omni deploys BigQuery compute nodes in AWS and Azure regions. When you query data in S3, BigQuery runs the query in an AWS region close to your data. The same applies for Azure. Only the query results cross cloud boundaries, not the raw data. This is faster, cheaper, and avoids the data residency concerns that come with cross-cloud data movement.

The key components are:

- **BigQuery Connection**: Connects BigQuery to your AWS or Azure account
- **External Table**: Points to data files in S3 or Azure Blob Storage
- **BigLake Table**: An enhanced external table with additional features like access control

## Setting Up BigQuery Omni for AWS S3

### Step 1: Create an AWS IAM Role

First, create an IAM role in AWS that BigQuery will assume to read your S3 data:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::my-data-bucket",
        "arn:aws:s3:::my-data-bucket/*"
      ]
    }
  ]
}
```

The trust policy for this role needs to allow the BigQuery Omni service account to assume it:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "accounts.google.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "accounts.google.com:sub": "YOUR_BQ_SERVICE_ACCOUNT_ID"
        }
      }
    }
  ]
}
```

### Step 2: Create a BigQuery Connection

Create a connection in BigQuery that references the AWS IAM role:

```bash
# Create a BigQuery connection to AWS
# The connection runs in an AWS region (aws-us-east-1)
bq mk --connection \
  --connection_type='AWS' \
  --properties='{"accessRole":{"iamRoleId":"arn:aws:iam::123456789012:role/bigquery-omni-role"}}' \
  --location=aws-us-east-1 \
  my-aws-connection
```

After creating the connection, BigQuery generates a service account ID. You need to add this to your AWS IAM role's trust policy.

```bash
# Get the BigQuery Omni service account ID
bq show --connection --location=aws-us-east-1 my-aws-connection
```

### Step 3: Create an External Table Over S3 Data

Now create a table in BigQuery that points to your S3 data:

```sql
-- Create an external table pointing to Parquet files in S3
-- The table definition lives in BigQuery but the data stays in S3
CREATE EXTERNAL TABLE `my_project.aws_data.sales_data`
WITH CONNECTION `my_project.aws-us-east-1.my-aws-connection`
OPTIONS (
  format = 'PARQUET',
  uris = ['s3://my-data-bucket/sales/year=2025/*']
);
```

For CSV data:

```sql
-- External table for CSV data in S3
CREATE EXTERNAL TABLE `my_project.aws_data.customer_export`
WITH CONNECTION `my_project.aws-us-east-1.my-aws-connection`
OPTIONS (
  format = 'CSV',
  uris = ['s3://my-data-bucket/exports/customers/*.csv'],
  skip_leading_rows = 1
);
```

### Step 4: Query the Data

Now you can query S3 data using standard BigQuery SQL:

```sql
-- Query data in S3 using standard BigQuery SQL
-- The query executes in AWS, only results come back to GCP
SELECT
  region,
  product_category,
  SUM(revenue) AS total_revenue,
  COUNT(DISTINCT customer_id) AS unique_customers
FROM `my_project.aws_data.sales_data`
WHERE order_date >= '2025-01-01'
GROUP BY region, product_category
ORDER BY total_revenue DESC;
```

## Setting Up BigQuery Omni for Azure Blob Storage

### Step 1: Create an Azure Service Principal

BigQuery needs an Azure AD application and service principal to access your Azure storage:

```bash
# Create an Azure AD application for BigQuery Omni
az ad app create --display-name "BigQuery Omni Access"

# Create a service principal for the application
az ad sp create --id <application-id>

# Assign Storage Blob Data Reader role on the storage account
az role assignment create \
  --assignee <service-principal-id> \
  --role "Storage Blob Data Reader" \
  --scope "/subscriptions/<sub-id>/resourceGroups/<rg>/providers/Microsoft.Storage/storageAccounts/<storage-account>"
```

### Step 2: Create the Azure Connection

```bash
# Create a BigQuery connection to Azure
bq mk --connection \
  --connection_type='Azure' \
  --properties='{"customerTenantId":"<azure-tenant-id>","federatedApplicationClientId":"<app-client-id>"}' \
  --location=azure-eastus2 \
  my-azure-connection
```

### Step 3: Create External Tables Over Azure Data

```sql
-- Create an external table pointing to Azure Blob Storage
CREATE EXTERNAL TABLE `my_project.azure_data.iot_telemetry`
WITH CONNECTION `my_project.azure-eastus2.my-azure-connection`
OPTIONS (
  format = 'PARQUET',
  uris = ['azure://myaccount.blob.core.windows.net/iot-data/telemetry/*.parquet']
);
```

## Cross-Cloud Joins

One of the most powerful features of BigQuery Omni is joining data across clouds:

```sql
-- Join GCP data with AWS data in a single query
-- GCP data is queried locally, AWS data is queried via Omni
-- Results are combined in BigQuery
SELECT
  gcp.customer_id,
  gcp.customer_name,
  aws.total_purchases,
  aws.last_purchase_date
FROM `my_project.crm.customers` gcp  -- Data in BigQuery (GCP)
INNER JOIN (
  -- Subquery runs in AWS via BigQuery Omni
  SELECT
    customer_id,
    SUM(amount) AS total_purchases,
    MAX(purchase_date) AS last_purchase_date
  FROM `my_project.aws_data.purchases`
  GROUP BY customer_id
) aws ON gcp.customer_id = aws.customer_id;
```

For cross-cloud joins, BigQuery pushes as much computation as possible to each cloud and only transfers the intermediate results. Keep your filters and aggregations in subqueries to minimize cross-cloud data transfer.

## Using BigLake Tables

BigLake tables are an enhanced version of external tables that support fine-grained access control and metadata caching:

```sql
-- Create a BigLake table with metadata caching
-- Metadata caching improves query performance by caching file listings
CREATE EXTERNAL TABLE `my_project.aws_data.sales_biglake`
WITH CONNECTION `my_project.aws-us-east-1.my-aws-connection`
OPTIONS (
  format = 'PARQUET',
  uris = ['s3://my-data-bucket/sales/*'],
  metadata_cache_mode = 'AUTOMATIC',
  max_staleness = INTERVAL 1 HOUR
);
```

The `max_staleness` option controls how stale the cached metadata can be. A value of 1 hour means BigQuery will refresh the file listing at most every hour, which avoids repeatedly listing S3 buckets with many files.

## Partitioned External Tables

For better query performance, create partitioned external tables that match your data layout:

```sql
-- Create a Hive-partitioned external table
-- This lets BigQuery skip files that do not match the partition filter
CREATE EXTERNAL TABLE `my_project.aws_data.events_partitioned`
WITH PARTITION COLUMNS (
  year INT64,
  month INT64,
  day INT64
)
WITH CONNECTION `my_project.aws-us-east-1.my-aws-connection`
OPTIONS (
  format = 'PARQUET',
  uris = ['s3://my-data-bucket/events/*'],
  hive_partition_uri_prefix = 's3://my-data-bucket/events/'
);
```

Queries that filter on partition columns will only read the relevant files:

```sql
-- This query only reads files for January 2025
-- Partition pruning avoids scanning the entire dataset
SELECT event_type, COUNT(*) AS event_count
FROM `my_project.aws_data.events_partitioned`
WHERE year = 2025 AND month = 1
GROUP BY event_type;
```

## Cost and Performance Considerations

BigQuery Omni charges for compute in the cloud where the data resides. Slot pricing applies, and you need BigQuery Editions reservations for Omni workloads. There is no on-demand pricing for Omni queries.

Data transfer costs apply when results cross cloud boundaries. Minimize this by aggregating in subqueries before joining with data in other clouds.

Performance depends on the file format and layout of your external data. Parquet and ORC perform best because they support columnar reads and predicate pushdown. CSV and JSON require full file reads.

BigQuery Omni is a practical solution for multi-cloud data analytics. It eliminates the need to copy data between clouds while giving you the full power of BigQuery SQL. For organizations with data spread across AWS, Azure, and GCP, it significantly simplifies the analytics architecture.
