# How to Set Up a dbt Project with BigQuery as the Data Warehouse Backend

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, dbt, Data Warehouse, Analytics Engineering

Description: A step-by-step guide to setting up a dbt project with BigQuery as the data warehouse, including authentication, project structure, and running your first models.

---

dbt (data build tool) has become the standard for transforming data inside the warehouse. Instead of writing one-off SQL scripts or building complex ETL pipelines, you write SQL SELECT statements and dbt handles materializing them as tables and views in your data warehouse. When paired with BigQuery, you get a powerful combination: dbt's modularity and testing on top of BigQuery's serverless scalability.

This guide walks through setting up a dbt project from scratch with BigQuery as the backend, from installation through running your first models.

## Installing dbt

dbt comes in two flavors: dbt Core (open source, command-line) and dbt Cloud (hosted SaaS). We will use dbt Core for this guide since it gives you full control.

Install the BigQuery adapter:

```bash
# Install dbt with the BigQuery adapter
# This installs dbt-core and the bigquery-specific plugin
pip install dbt-bigquery
```

Verify the installation:

```bash
# Check that dbt is installed and the BigQuery adapter is available
dbt --version
```

You should see both dbt-core and dbt-bigquery in the output.

## Setting Up Authentication

dbt needs credentials to connect to BigQuery. The recommended approach for local development is using a service account key file. For production, you would use Workload Identity Federation or the metadata server on GCP compute.

Create a service account with the necessary roles:

```bash
# Create a service account for dbt
gcloud iam service-accounts create dbt-dev \
  --display-name="dbt Development"

# Grant BigQuery permissions
# BigQuery Data Editor lets dbt create and modify tables
# BigQuery Job User lets dbt run queries
gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:dbt-dev@my-project.iam.gserviceaccount.com" \
  --role="roles/bigquery.dataEditor"

gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:dbt-dev@my-project.iam.gserviceaccount.com" \
  --role="roles/bigquery.jobUser"

# Download the key file for local development
gcloud iam service-accounts keys create ~/dbt-bigquery-key.json \
  --iam-account=dbt-dev@my-project.iam.gserviceaccount.com
```

## Initializing the dbt Project

Create a new dbt project:

```bash
# Initialize a new dbt project
# This creates the project directory structure and starter files
dbt init my_analytics
```

dbt will ask you a few questions about the project. Select BigQuery as the database, and it will generate a `profiles.yml` configuration.

## Configuring the Profile

dbt stores connection profiles in `~/.dbt/profiles.yml`. Here is what the BigQuery configuration looks like:

```yaml
# ~/.dbt/profiles.yml
# This file tells dbt how to connect to BigQuery
my_analytics:
  target: dev  # Default target environment
  outputs:
    dev:
      type: bigquery
      method: service-account
      project: my-gcp-project          # Your GCP project ID
      dataset: dbt_dev                  # BigQuery dataset for dev models
      threads: 4                        # Parallel model execution threads
      keyfile: /Users/me/dbt-bigquery-key.json  # Path to service account key
      timeout_seconds: 300              # Query timeout
      location: US                      # BigQuery dataset location
      priority: interactive             # Query priority (interactive or batch)
      retries: 1                        # Number of retries on failure

    prod:
      type: bigquery
      method: service-account
      project: my-gcp-project
      dataset: analytics                # Production dataset
      threads: 8
      keyfile: /path/to/prod-key.json
      timeout_seconds: 600
      location: US
      priority: interactive
      retries: 3
```

You can also use OAuth for local development if you prefer not to manage key files:

```yaml
# Alternative: OAuth-based authentication for local development
# This uses your personal Google account credentials
my_analytics:
  target: dev
  outputs:
    dev:
      type: bigquery
      method: oauth
      project: my-gcp-project
      dataset: dbt_dev
      threads: 4
      location: US
```

For OAuth, make sure you have run `gcloud auth application-default login` first.

## Understanding the Project Structure

After initialization, your project looks like this:

```
my_analytics/
  dbt_project.yml        # Project configuration
  models/                # SQL models go here
    example/
      my_first_dbt_model.sql
      my_second_dbt_model.sql
      schema.yml
  tests/                 # Custom tests
  macros/                # Reusable SQL macros
  seeds/                 # CSV files to load into BigQuery
  snapshots/             # Snapshot definitions for SCD tracking
  analyses/              # Ad-hoc analytical queries
```

The `dbt_project.yml` file is the main configuration:

```yaml
# dbt_project.yml
name: 'my_analytics'
version: '1.0.0'
config-version: 2

profile: 'my_analytics'  # Must match the profile name in profiles.yml

model-paths: ["models"]
analysis-paths: ["analyses"]
test-paths: ["tests"]
seed-paths: ["seeds"]
macro-paths: ["macros"]
snapshot-paths: ["snapshots"]

# Configure default materializations for different model directories
models:
  my_analytics:
    staging:
      +materialized: view      # Staging models are views (cheap, always fresh)
    marts:
      +materialized: table     # Mart models are tables (fast reads)
```

## Creating Your First Models

dbt models are just SQL SELECT statements. Let us build a simple analytics pipeline with staging and mart layers.

First, create the staging layer. These models clean and standardize raw data:

```sql
-- models/staging/stg_orders.sql
-- Staging model: clean and standardize raw order data from the source
-- This model is materialized as a view (configured in dbt_project.yml)

SELECT
    order_id,
    customer_id,
    CAST(order_date AS DATE) AS order_date,
    CAST(total_amount AS NUMERIC) AS total_amount,
    LOWER(status) AS status,
    created_at,
    updated_at
FROM {{ source('raw', 'orders') }}
WHERE order_id IS NOT NULL
```

Define the source in a schema file:

```yaml
# models/staging/sources.yml
# Define the raw data sources that dbt reads from
version: 2

sources:
  - name: raw
    database: my-gcp-project      # The GCP project containing raw data
    schema: raw_data               # The BigQuery dataset with raw tables
    tables:
      - name: orders
        description: "Raw orders data from the transactional database"
        columns:
          - name: order_id
            description: "Unique order identifier"
            tests:
              - not_null
              - unique
      - name: customers
        description: "Raw customer data"
```

Create a staging model for customers:

```sql
-- models/staging/stg_customers.sql
-- Clean and standardize customer data from the raw source

SELECT
    customer_id,
    TRIM(first_name) AS first_name,
    TRIM(last_name) AS last_name,
    LOWER(email) AS email,
    CAST(signup_date AS DATE) AS signup_date,
    region
FROM {{ source('raw', 'customers') }}
WHERE customer_id IS NOT NULL
```

Now build a mart model that joins the staging models:

```sql
-- models/marts/customer_orders.sql
-- Mart model: aggregated customer order metrics
-- Materialized as a table for fast dashboard queries

SELECT
    c.customer_id,
    c.first_name,
    c.last_name,
    c.email,
    c.region,
    c.signup_date,
    COUNT(o.order_id) AS total_orders,
    SUM(o.total_amount) AS lifetime_value,
    AVG(o.total_amount) AS average_order_value,
    MIN(o.order_date) AS first_order_date,
    MAX(o.order_date) AS last_order_date
FROM {{ ref('stg_customers') }} c
LEFT JOIN {{ ref('stg_orders') }} o
    ON c.customer_id = o.customer_id
    AND o.status = 'completed'
GROUP BY
    c.customer_id,
    c.first_name,
    c.last_name,
    c.email,
    c.region,
    c.signup_date
```

The `{{ ref() }}` function is key. It tells dbt about the dependency between models and ensures they run in the correct order.

## Adding Tests and Documentation

Define tests and column documentation in a schema file:

```yaml
# models/marts/schema.yml
version: 2

models:
  - name: customer_orders
    description: "Aggregated customer metrics with order history"
    columns:
      - name: customer_id
        description: "Unique customer identifier"
        tests:
          - not_null
          - unique
      - name: total_orders
        description: "Number of completed orders"
        tests:
          - not_null
      - name: lifetime_value
        description: "Total spend across all completed orders"
```

## Running dbt

With everything in place, run the standard dbt commands:

```bash
# Validate the project configuration and connections
dbt debug

# Run all models - this creates views and tables in BigQuery
dbt run

# Run tests to validate data quality
dbt test

# Generate and serve documentation
dbt docs generate
dbt docs serve
```

When you run `dbt run`, dbt compiles each model's SQL, resolves the `ref()` and `source()` functions, determines the execution order from the dependency graph, and runs the queries against BigQuery.

```bash
# Run a specific model and its dependencies
dbt run --select customer_orders+

# Run only the staging models
dbt run --select staging.*

# Do a dry run to see the compiled SQL without executing
dbt compile
```

## Verifying in BigQuery

After running dbt, check BigQuery to see your models:

```bash
# List tables created by dbt in the dev dataset
bq ls my-gcp-project:dbt_dev
```

You should see `stg_orders` and `stg_customers` as views, and `customer_orders` as a table.

## Wrapping Up

Setting up dbt with BigQuery gives you a structured, version-controlled approach to data transformation. The staging-and-marts pattern keeps your models organized, the ref() function manages dependencies automatically, and dbt's testing framework catches data quality issues early. From here, you can add incremental models for large tables, snapshots for slowly changing dimensions, and macros for reusable SQL patterns. The foundation you build now scales well as your data team and model count grow.
