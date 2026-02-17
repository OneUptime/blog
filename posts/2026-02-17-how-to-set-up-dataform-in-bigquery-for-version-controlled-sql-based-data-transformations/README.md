# How to Set Up Dataform in BigQuery for Version-Controlled SQL-Based Data Transformations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Dataform, BigQuery, SQL Transformations, Data Modeling

Description: Learn how to set up Dataform in BigQuery to manage SQL-based data transformations with version control, dependency management, and built-in testing.

---

If you have ever managed a growing collection of BigQuery SQL scripts, you know how quickly it becomes a mess. Scripts depend on each other but there is no explicit dependency graph. Changes break downstream queries silently. Testing means running the whole pipeline manually. Dataform fixes all of this by bringing software engineering practices to SQL transformations.

Dataform is now integrated directly into BigQuery. You write SQL transformations in a project that tracks dependencies automatically, version controls everything through Git, and includes built-in testing and documentation. I migrated a set of 80 transformation scripts to Dataform and the resulting pipeline was dramatically easier to understand, test, and modify.

## How Dataform Works

Dataform extends SQL with a thin layer called SQLX. Each SQLX file defines a table or view, declares its dependencies, and optionally includes assertions (tests). When you run the project, Dataform builds a dependency graph, executes the transformations in the right order, and runs your assertions.

The key concepts are:
- **Declarations**: References to source tables that exist outside Dataform
- **Tables**: SQL transformations that produce new tables (or views/incremental tables)
- **Assertions**: Tests that validate the data after transformations run
- **Operations**: Arbitrary SQL statements for custom logic

## Setting Up Dataform in BigQuery

Dataform is available directly in the BigQuery console. Start by creating a repository:

```bash
# Enable the Dataform API
gcloud services enable dataform.googleapis.com

# Create a Dataform repository
gcloud dataform repositories create analytics-transforms \
  --region=us-central1 \
  --display-name="Analytics Transformations"
```

Or set it up through the BigQuery console by navigating to BigQuery > Dataform and clicking "Create repository."

Connect the repository to a Git provider for version control:

```bash
# Connect to a GitHub repository for version control
gcloud dataform repositories update analytics-transforms \
  --region=us-central1 \
  --git-remote-url="https://github.com/my-org/analytics-transforms.git" \
  --git-default-branch="main" \
  --git-auth-token-secret="projects/my-project/secrets/github-token/versions/latest"
```

## Creating a Development Workspace

Workspaces are where you write and test your transformations:

```bash
# Create a development workspace
gcloud dataform workspaces create dev-workspace \
  --repository=analytics-transforms \
  --region=us-central1
```

## Project Structure

A Dataform project follows a standard directory structure:

```
definitions/
  sources/
    raw_events.sqlx
    raw_customers.sqlx
  staging/
    stg_events.sqlx
    stg_customers.sqlx
  marts/
    dim_customers.sqlx
    fact_orders.sqlx
    fact_daily_metrics.sqlx
  assertions/
    assert_orders_valid.sqlx
includes/
  constants.js
  helpers.js
dataform.json
```

## Configuring the Project

Set up the `dataform.json` configuration file:

```json
{
  "defaultSchema": "analytics",
  "assertionSchema": "analytics_assertions",
  "warehouse": "bigquery",
  "defaultDatabase": "my-project",
  "defaultLocation": "US",
  "vars": {
    "environment": "production",
    "start_date": "2025-01-01"
  }
}
```

## Declaring Source Tables

Define your source tables so Dataform knows about data that exists outside the project:

```sql
-- definitions/sources/raw_events.sqlx
-- Declare the raw events source table
config {
  type: "declaration",
  database: "my-project",
  schema: "raw_data",
  name: "events"
}
```

```sql
-- definitions/sources/raw_customers.sqlx
-- Declare the raw customers source table
config {
  type: "declaration",
  database: "my-project",
  schema: "raw_data",
  name: "customers"
}
```

## Building Staging Transformations

Staging models clean and standardize the raw data:

```sql
-- definitions/staging/stg_events.sqlx
-- Staging layer: clean and deduplicate raw events
config {
  type: "view",
  schema: "staging",
  description: "Cleaned and deduplicated events from the raw events table",
  tags: ["staging", "daily"]
}

-- Deduplicate events and standardize field types
SELECT
  event_id,
  user_id,
  LOWER(TRIM(event_type)) AS event_type,
  CAST(event_timestamp AS TIMESTAMP) AS event_timestamp,
  DATE(event_timestamp) AS event_date,
  COALESCE(properties, '{}') AS properties,
  COALESCE(amount, 0) AS amount,
  device_type,
  country,
  -- Use ROW_NUMBER to handle duplicates
  ROW_NUMBER() OVER (
    PARTITION BY event_id
    ORDER BY event_timestamp DESC
  ) AS row_num
FROM ${ref("raw_events")}
WHERE event_id IS NOT NULL
QUALIFY row_num = 1
```

```sql
-- definitions/staging/stg_customers.sqlx
-- Staging layer: clean customer data with SCD Type 2 handling
config {
  type: "table",
  schema: "staging",
  description: "Cleaned customer data with latest record per customer",
  tags: ["staging", "daily"]
}

SELECT
  customer_id,
  TRIM(first_name) AS first_name,
  TRIM(last_name) AS last_name,
  LOWER(TRIM(email)) AS email,
  signup_date,
  COALESCE(country, 'unknown') AS country,
  COALESCE(segment, 'unclassified') AS segment,
  updated_at
FROM ${ref("raw_customers")}
-- Keep only the latest record per customer
QUALIFY ROW_NUMBER() OVER (
  PARTITION BY customer_id
  ORDER BY updated_at DESC
) = 1
```

## Building Mart Tables

Mart tables are the final, business-ready transformations:

```sql
-- definitions/marts/dim_customers.sqlx
-- Dimension table for customers, used across all analytics
config {
  type: "table",
  schema: "analytics",
  description: "Customer dimension table with enriched attributes",
  tags: ["mart", "daily"],
  bigquery: {
    partitionBy: "DATE(signup_date)",
    clusterBy: ["country", "segment"]
  }
}

SELECT
  c.customer_id,
  c.first_name,
  c.last_name,
  c.email,
  c.signup_date,
  c.country,
  c.segment,
  -- Computed fields from event data
  COALESCE(e.first_event_date, c.signup_date) AS first_activity_date,
  e.last_event_date AS last_activity_date,
  COALESCE(e.total_events, 0) AS total_events,
  COALESCE(e.total_spend, 0) AS total_spend,
  CASE
    WHEN e.last_event_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY) THEN 'active'
    WHEN e.last_event_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY) THEN 'at_risk'
    ELSE 'churned'
  END AS activity_status
FROM ${ref("stg_customers")} c
LEFT JOIN (
  SELECT
    user_id,
    MIN(event_date) AS first_event_date,
    MAX(event_date) AS last_event_date,
    COUNT(*) AS total_events,
    SUM(CASE WHEN event_type = 'purchase' THEN amount ELSE 0 END) AS total_spend
  FROM ${ref("stg_events")}
  GROUP BY user_id
) e ON c.customer_id = e.user_id
```

```sql
-- definitions/marts/fact_daily_metrics.sqlx
-- Daily metrics fact table for dashboards
config {
  type: "incremental",
  schema: "analytics",
  description: "Daily aggregated metrics by event type and country",
  tags: ["mart", "daily"],
  bigquery: {
    partitionBy: "event_date",
    clusterBy: ["event_type", "country"]
  },
  uniqueKey: ["event_date", "event_type", "country"]
}

SELECT
  event_date,
  event_type,
  country,
  COUNT(*) AS event_count,
  COUNT(DISTINCT user_id) AS unique_users,
  SUM(amount) AS total_amount,
  AVG(amount) AS avg_amount
FROM ${ref("stg_events")}
WHERE TRUE
  ${when(incremental(), `AND event_date > (SELECT MAX(event_date) FROM ${self()})`)}
GROUP BY event_date, event_type, country
```

The `${when(incremental(), ...)}` block only applies during incremental runs, filtering to new data. During a full refresh, the entire table is rebuilt.

## Adding Assertions

Write assertions to validate your transformation output:

```sql
-- definitions/assertions/assert_orders_valid.sqlx
-- Assert that the orders fact table has no orphaned customer references
config {
  type: "assertion",
  tags: ["assertion", "daily"]
}

-- This query should return zero rows
-- Any rows returned indicate a data quality issue
SELECT
  f.user_id
FROM ${ref("stg_events")} f
LEFT JOIN ${ref("dim_customers")} c
  ON f.user_id = c.customer_id
WHERE c.customer_id IS NULL
  AND f.event_type = 'purchase'
```

Inline assertions in table definitions:

```sql
-- definitions/marts/fact_orders.sqlx
config {
  type: "table",
  schema: "analytics",
  assertions: {
    nonNull: ["order_id", "customer_id", "order_date"],
    uniqueKey: ["order_id"],
    rowConditions: [
      "total_amount >= 0",
      "order_date <= CURRENT_DATE()"
    ]
  }
}

SELECT
  event_id AS order_id,
  user_id AS customer_id,
  event_date AS order_date,
  amount AS total_amount,
  JSON_VALUE(properties, '$.status') AS status
FROM ${ref("stg_events")}
WHERE event_type = 'purchase'
```

## Using JavaScript Includes

Create reusable functions and constants:

```javascript
// includes/helpers.js
// Reusable SQL generation functions for Dataform

function dateSpine(startDate, endDate) {
  return `
    SELECT date
    FROM UNNEST(
      GENERATE_DATE_ARRAY(DATE('${startDate}'), DATE('${endDate}'))
    ) AS date
  `;
}

function safeDivide(numerator, denominator) {
  return `SAFE_DIVIDE(${numerator}, NULLIF(${denominator}, 0))`;
}

module.exports = { dateSpine, safeDivide };
```

Use them in your SQLX files:

```sql
-- definitions/marts/conversion_rates.sqlx
config {
  type: "table",
  schema: "analytics"
}

js {
  const { safeDivide } = require("includes/helpers");
}

SELECT
  event_date,
  COUNT(DISTINCT CASE WHEN event_type = 'page_view' THEN user_id END) AS visitors,
  COUNT(DISTINCT CASE WHEN event_type = 'purchase' THEN user_id END) AS purchasers,
  ${safeDivide(
    "COUNT(DISTINCT CASE WHEN event_type = 'purchase' THEN user_id END)",
    "COUNT(DISTINCT CASE WHEN event_type = 'page_view' THEN user_id END)"
  )} AS conversion_rate
FROM ${ref("stg_events")}
GROUP BY event_date
```

## Running Transformations

Execute your Dataform project:

```bash
# Compile the project to check for errors
gcloud dataform compilations create \
  --repository=analytics-transforms \
  --region=us-central1 \
  --git-commitish=main

# Run all transformations
gcloud dataform workflow-invocations create \
  --repository=analytics-transforms \
  --region=us-central1 \
  --compilation-result="projects/my-project/locations/us-central1/repositories/analytics-transforms/compilationResults/COMPILATION_ID"

# Run only specific tags
gcloud dataform workflow-invocations create \
  --repository=analytics-transforms \
  --region=us-central1 \
  --compilation-result="COMPILATION_ID" \
  --included-tags="daily"
```

## Scheduling with Cloud Composer

Automate Dataform runs with Cloud Composer:

```python
# dags/dataform_daily.py
from datetime import datetime
from airflow import DAG
from airflow.providers.google.cloud.operators.dataform import (
    DataformCreateCompilationResultOperator,
    DataformCreateWorkflowInvocationOperator,
)

with DAG(
    dag_id="dataform_daily_run",
    start_date=datetime(2026, 1, 1),
    schedule_interval="@daily",
    catchup=False,
) as dag:

    compile = DataformCreateCompilationResultOperator(
        task_id="compile",
        project_id="my-project",
        region="us-central1",
        repository_id="analytics-transforms",
        compilation_result={"git_commitish": "main"},
    )

    run = DataformCreateWorkflowInvocationOperator(
        task_id="run",
        project_id="my-project",
        region="us-central1",
        repository_id="analytics-transforms",
        workflow_invocation={
            "compilation_result": "{{ task_instance.xcom_pull('compile')['name'] }}",
        },
    )

    compile >> run
```

## Summary

Dataform in BigQuery brings structure and reliability to SQL transformations. Set up a repository, organize your transformations into sources, staging, and mart layers, and let Dataform manage the dependency graph. Incremental tables handle growing datasets efficiently, assertions catch data quality issues automatically, and Git integration provides version control for your entire transformation pipeline. The SQLX format adds just enough structure on top of standard SQL to make transformations testable and maintainable, without requiring you to learn a new language. For teams already working in BigQuery, Dataform is the natural choice for managing transformation logic at scale.
