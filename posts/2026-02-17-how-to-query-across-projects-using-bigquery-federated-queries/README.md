# How to Query Across Projects Using BigQuery Federated Queries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, Federated Queries, Cross-Project, Cloud SQL, Data Integration

Description: Learn how to use BigQuery federated queries to join data across multiple GCP projects and external databases like Cloud SQL and Cloud Spanner without data movement.

---

BigQuery federated queries let you reach beyond BigQuery to query data in external sources - Cloud SQL, Cloud Spanner, and other BigQuery projects - all from a single SQL statement. Instead of building ETL pipelines to move data around, you write a query that pulls data from wherever it lives.

This is particularly useful in organizations where data is spread across multiple GCP projects, when you need to join BigQuery analytics data with operational data in Cloud SQL, or when you want to run reports that combine data from different systems without setting up ongoing replication.

## Cross-Project BigQuery Queries

The simplest form of federated querying is querying data in another BigQuery project. This does not require any special setup - just the right permissions.

```sql
-- Query a table in a different project
SELECT
    a.customer_id,
    a.total_orders,
    b.customer_name,
    b.subscription_tier
FROM
    `analytics-project.sales.order_summary` a
JOIN
    `crm-project.customers.customer_profiles` b
    ON a.customer_id = b.customer_id
WHERE
    a.total_orders > 100;
```

You reference tables using the full path: `project-id.dataset.table`. The user running the query needs `bigquery.tables.getData` permission (or `bigquery.dataViewer` role) on the datasets in both projects.

### Granting Cross-Project Access

```bash
# Grant the analytics team read access to the CRM project's customer dataset
gcloud projects add-iam-policy-binding crm-project \
    --member="group:analytics-team@company.com" \
    --role="roles/bigquery.dataViewer" \
    --condition="expression=resource.name.startsWith('projects/crm-project/datasets/customers'),title=customer-data-read"
```

Or grant at the dataset level:

```bash
# Grant dataset-level access for cross-project queries
bq update --dataset \
    --access_entry='{"role":"READER","groupByEmail":"analytics-team@company.com"}' \
    crm-project:customers
```

## Federated Queries to Cloud SQL

This is where things get more interesting. You can query a Cloud SQL database (MySQL or PostgreSQL) directly from BigQuery.

### Step 1: Create a Connection

First, create a Cloud SQL connection in BigQuery.

```bash
# Create a connection to a Cloud SQL PostgreSQL instance
bq mk --connection \
    --connection_type=CLOUD_SQL \
    --properties='{"instanceId":"crm-project:us-central1:my-postgres-instance","database":"crm_db","type":"POSTGRES"}' \
    --connection_credential='{"username":"bigquery_reader","password":"your-password"}' \
    --location=US \
    --project_id=my-project-id \
    my-cloudsql-connection
```

For MySQL:

```bash
# Create a connection to a Cloud SQL MySQL instance
bq mk --connection \
    --connection_type=CLOUD_SQL \
    --properties='{"instanceId":"app-project:us-central1:my-mysql-instance","database":"app_db","type":"MYSQL"}' \
    --connection_credential='{"username":"bigquery_reader","password":"your-password"}' \
    --location=US \
    --project_id=my-project-id \
    my-mysql-connection
```

### Step 2: Query Cloud SQL from BigQuery

Use the `EXTERNAL_QUERY` function to run SQL against Cloud SQL.

```sql
-- Query Cloud SQL directly from BigQuery
SELECT *
FROM EXTERNAL_QUERY(
    "my-project-id.US.my-cloudsql-connection",
    "SELECT customer_id, name, email, plan_type FROM customers WHERE active = true"
);
```

### Step 3: Join BigQuery and Cloud SQL Data

The real power is joining data from both systems in a single query.

```sql
-- Join BigQuery analytics data with Cloud SQL operational data
SELECT
    bq.customer_id,
    sql_data.name AS customer_name,
    sql_data.plan_type,
    bq.total_pageviews,
    bq.last_active_date
FROM
    `my-project-id.analytics.user_metrics` bq
JOIN
    EXTERNAL_QUERY(
        "my-project-id.US.my-cloudsql-connection",
        "SELECT customer_id, name, plan_type FROM customers WHERE active = true"
    ) AS sql_data
    ON bq.customer_id = sql_data.customer_id
WHERE
    bq.total_pageviews > 1000
ORDER BY
    bq.total_pageviews DESC;
```

BigQuery runs the external query first, brings the results into BigQuery, and then performs the join.

## Federated Queries to Cloud Spanner

For Cloud Spanner connections:

```bash
# Create a connection to Cloud Spanner
bq mk --connection \
    --connection_type=CLOUD_SPANNER \
    --properties='{"database":"projects/spanner-project/instances/my-instance/databases/my-db"}' \
    --location=US \
    --project_id=my-project-id \
    my-spanner-connection
```

```sql
-- Query Cloud Spanner from BigQuery
SELECT
    order_id,
    customer_id,
    order_total,
    order_status
FROM EXTERNAL_QUERY(
    "my-project-id.US.my-spanner-connection",
    "SELECT OrderId, CustomerId, OrderTotal, OrderStatus FROM Orders WHERE OrderDate > '2026-01-01'"
);
```

## Managing Connections

### List Connections

```bash
# List all BigQuery connections in a project
bq ls --connection --location=US --project_id=my-project-id
```

### View Connection Details

```bash
# Show connection details
bq show --connection --location=US --project_id=my-project-id my-cloudsql-connection
```

### Update Connection Credentials

```bash
# Update the password for a connection
bq update --connection \
    --connection_credential='{"username":"bigquery_reader","password":"new-password"}' \
    --location=US \
    --project_id=my-project-id \
    my-cloudsql-connection
```

### Delete a Connection

```bash
# Delete a connection
bq rm --connection --location=US --project_id=my-project-id my-cloudsql-connection
```

## Terraform Configuration

```hcl
# Cloud SQL connection for BigQuery
resource "google_bigquery_connection" "cloudsql" {
  connection_id = "my-cloudsql-connection"
  location      = "US"
  friendly_name = "CRM Database Connection"
  description   = "Connection to the CRM Cloud SQL instance"

  cloud_sql {
    instance_id = "crm-project:us-central1:my-postgres-instance"
    database    = "crm_db"
    type        = "POSTGRES"

    credential {
      username = "bigquery_reader"
      password = var.cloudsql_password
    }
  }
}

# Cloud Spanner connection
resource "google_bigquery_connection" "spanner" {
  connection_id = "my-spanner-connection"
  location      = "US"

  cloud_spanner {
    database = "projects/spanner-project/instances/my-instance/databases/my-db"
  }
}
```

## Performance Considerations

Federated queries have inherent performance limitations because data must be read from the external source at query time.

### Push Down Filters

BigQuery pushes filter predicates down to the external source when possible. This means the external query runs with your WHERE clause, reducing the amount of data transferred.

```sql
-- Good: Filter is pushed to Cloud SQL, reducing data transfer
SELECT *
FROM EXTERNAL_QUERY(
    "my-project-id.US.my-cloudsql-connection",
    "SELECT id, name, status FROM orders WHERE created_at > '2026-01-01' AND status = 'active'"
);
```

Write your external query to be as selective as possible.

### Cache Results for Repeated Queries

If you query the same external data frequently, consider caching results in a BigQuery table.

```sql
-- Cache external query results in a BigQuery table
CREATE OR REPLACE TABLE `my-project-id.cache.active_customers` AS
SELECT *
FROM EXTERNAL_QUERY(
    "my-project-id.US.my-cloudsql-connection",
    "SELECT customer_id, name, email, plan_type FROM customers WHERE active = true"
);
```

Schedule this as a periodic job to keep the cache fresh.

## Cross-Project Query Billing

Understanding who pays for cross-project queries:

- The project running the query pays for query processing (the project in your `bq` command or the console's active project)
- The project hosting the data does not get charged for someone else's queries
- For federated queries, the project owning the connection pays for the external query execution

```bash
# Run a cross-project query and bill it to your project
bq query --nouse_legacy_sql --project_id=my-billing-project \
    "SELECT * FROM \`other-project.dataset.table\` LIMIT 100"
```

## Security Considerations

### Connection Credentials

Store connection passwords securely. In Terraform, use variables or secrets manager. Never hardcode passwords.

### Least Privilege for External Databases

Create a dedicated read-only database user for BigQuery connections. This user should only have SELECT permissions on the tables BigQuery needs to query.

```sql
-- In PostgreSQL: Create a read-only user for BigQuery
CREATE USER bigquery_reader WITH PASSWORD 'strong-password';
GRANT CONNECT ON DATABASE crm_db TO bigquery_reader;
GRANT USAGE ON SCHEMA public TO bigquery_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO bigquery_reader;
```

### Connection IAM

Control who can use a BigQuery connection through IAM.

```bash
# Grant a group permission to use the connection
gcloud projects add-iam-policy-binding my-project-id \
    --member="group:data-team@company.com" \
    --role="roles/bigquery.connectionUser"
```

## Common Issues

**"Connection not found"**: Make sure the connection location matches the query location. A connection in `US` can only be used by queries running in the `US` processing location.

**"Access denied" to external database**: Check the database credentials in the connection. Also verify the Cloud SQL instance allows connections from BigQuery's IP ranges or has the public IP enabled.

**Slow performance on large joins**: BigQuery pulls all external query results before performing the join. If the external query returns millions of rows, this can be slow. Filter as aggressively as possible in the external query.

**Type mismatches**: Data types in Cloud SQL and BigQuery are not identical. BigQuery converts types automatically, but some conversions may not work as expected. Check the type mapping documentation for your database type.

## Summary

BigQuery federated queries eliminate the need for ETL when you need to join data across systems. Cross-project BigQuery queries just need the right IAM permissions. For Cloud SQL and Spanner, create connections with appropriate credentials and use the `EXTERNAL_QUERY` function. The performance is not as fast as querying native BigQuery tables, so push filters into the external query and consider caching results for repeated access patterns. For organizations with data spread across multiple projects and databases, federated queries provide a unified query layer without data movement.
