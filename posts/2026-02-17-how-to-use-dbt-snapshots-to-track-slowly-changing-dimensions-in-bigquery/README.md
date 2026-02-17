# How to Use dbt Snapshots to Track Slowly Changing Dimensions in BigQuery

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, dbt, Snapshots, Slowly Changing Dimensions, Data Modeling

Description: Learn how to use dbt snapshots to track historical changes to dimension data in BigQuery, implementing Type 2 slowly changing dimensions automatically.

---

Dimension data changes over time. Customers move to new addresses, products change categories, employees switch departments. If your analytics only stores the current state, you lose the ability to answer questions like "what was this customer's region when they placed that order?" or "how has this product's category changed over the past year?"

Slowly changing dimensions (SCD) solve this by keeping a history of changes. dbt snapshots implement SCD Type 2 automatically - they track when values change and maintain a complete history with valid-from and valid-to timestamps.

## How dbt Snapshots Work

A dbt snapshot monitors a source table for changes. On each run, it compares the current source data to the snapshot table. For rows that have changed, it closes out the old record (sets a valid_to timestamp) and inserts a new record with the current values (sets a valid_from timestamp).

The result is a table where each row represents a version of a record, with timestamps indicating when that version was valid.

## Setting Up Your First Snapshot

Snapshots live in the `snapshots/` directory of your dbt project. Here is a snapshot that tracks changes to customer data:

```sql
-- snapshots/snap_customers.sql
-- Track all changes to customer records over time
-- Any change to the check_cols triggers a new snapshot row

{% snapshot snap_customers %}

{{
  config(
    target_schema='snapshots',
    unique_key='customer_id',
    strategy='timestamp',
    updated_at='updated_at',
    invalidate_hard_deletes=True
  )
}}

-- Select from the staging model (or directly from source)
SELECT
    customer_id,
    first_name,
    last_name,
    email,
    region,
    tier,
    account_manager,
    updated_at
FROM {{ source('raw', 'customers') }}

{% endsnapshot %}
```

Let me break down the configuration:

- `target_schema`: Where the snapshot table will be created in BigQuery
- `unique_key`: The column that uniquely identifies each record
- `strategy`: How to detect changes (timestamp or check)
- `updated_at`: The column that indicates when a record was last modified
- `invalidate_hard_deletes`: Whether to close out records that disappear from the source

## Snapshot Strategies

### Timestamp Strategy

The timestamp strategy uses a column (like `updated_at`) to detect changes. If the timestamp for a row is newer than what the snapshot last recorded, dbt creates a new snapshot row:

```sql
-- snapshots/snap_products.sql
-- Timestamp strategy: detect changes via the updated_at column
{% snapshot snap_products %}

{{
  config(
    target_schema='snapshots',
    unique_key='product_id',
    strategy='timestamp',
    updated_at='updated_at'
  )
}}

SELECT
    product_id,
    product_name,
    category,
    subcategory,
    price,
    cost,
    status,
    updated_at
FROM {{ source('raw', 'products') }}

{% endsnapshot %}
```

The timestamp strategy is efficient because it only needs to compare timestamps rather than full row contents. However, it requires that your source table has a reliable `updated_at` column that changes whenever any field is modified.

### Check Strategy

The check strategy compares actual column values to detect changes. Use this when your source does not have a reliable updated_at column:

```sql
-- snapshots/snap_suppliers.sql
-- Check strategy: compare specific columns to detect changes
-- Use this when there is no reliable updated_at timestamp
{% snapshot snap_suppliers %}

{{
  config(
    target_schema='snapshots',
    unique_key='supplier_id',
    strategy='check',
    check_cols=['supplier_name', 'contact_email', 'payment_terms', 'status']
  )
}}

SELECT
    supplier_id,
    supplier_name,
    contact_email,
    payment_terms,
    status,
    address_line1,
    city,
    country
FROM {{ source('raw', 'suppliers') }}

{% endsnapshot %}
```

You can also use `check_cols='all'` to monitor every column, but be aware this is more expensive as it compares every field:

```sql
-- Monitor all columns for changes
{{
  config(
    target_schema='snapshots',
    unique_key='supplier_id',
    strategy='check',
    check_cols='all'
  )
}}
```

## Running Snapshots

Snapshots have their own dbt command:

```bash
# Run all snapshots
dbt snapshot

# Run a specific snapshot
dbt snapshot --select snap_customers
```

On the first run, dbt creates the snapshot table with all current records plus two additional columns: `dbt_valid_from` and `dbt_valid_to`. All initial records have `dbt_valid_to` set to NULL, meaning they are the current version.

On subsequent runs, dbt compares the source to the snapshot. For any changed records, it sets `dbt_valid_to` on the old version and inserts a new row with `dbt_valid_to = NULL`.

## Understanding the Snapshot Table Structure

After a few snapshot runs, the data looks like this:

```
customer_id | region    | tier     | dbt_valid_from       | dbt_valid_to
-----------+-----------+----------+---------------------+---------------------
cust-001   | us-west   | silver   | 2026-01-01 00:00:00 | 2026-01-15 00:00:00
cust-001   | us-west   | gold     | 2026-01-15 00:00:00 | 2026-02-01 00:00:00
cust-001   | us-east   | gold     | 2026-02-01 00:00:00 | NULL
```

This tells us that customer cust-001 was silver tier in us-west from January 1 to January 15, upgraded to gold on January 15, and moved to us-east on February 1. The NULL `dbt_valid_to` means the last row is the current version.

## Querying Snapshot Data

### Get Current State

To get the current version of each record, filter on `dbt_valid_to IS NULL`:

```sql
-- Get the current version of each customer record
SELECT
    customer_id,
    first_name,
    last_name,
    region,
    tier,
    account_manager
FROM {{ ref('snap_customers') }}
WHERE dbt_valid_to IS NULL
```

### Point-in-Time Lookup

To see what the data looked like at a specific point in time:

```sql
-- What did the customer data look like on January 20, 2026?
SELECT
    customer_id,
    first_name,
    last_name,
    region,
    tier
FROM {{ ref('snap_customers') }}
WHERE dbt_valid_from <= '2026-01-20'
  AND (dbt_valid_to > '2026-01-20' OR dbt_valid_to IS NULL)
```

### Join with Fact Tables Using Point-in-Time Logic

This is where snapshots really shine. You can join orders to the customer's state at the time the order was placed:

```sql
-- models/marts/fct_orders_with_customer_context.sql
-- Join orders to the customer record that was valid at order time
-- This gives you the correct region and tier for each order

SELECT
    o.order_id,
    o.customer_id,
    o.order_date,
    o.total_amount,
    c.region AS customer_region_at_order_time,
    c.tier AS customer_tier_at_order_time,
    c.account_manager AS account_manager_at_order_time
FROM {{ ref('stg_orders') }} o
LEFT JOIN {{ ref('snap_customers') }} c
    ON o.customer_id = c.customer_id
    AND o.order_date >= c.dbt_valid_from
    AND (o.order_date < c.dbt_valid_to OR c.dbt_valid_to IS NULL)
```

## Building Dimension Models on Top of Snapshots

Create a clean dimension model that wraps the snapshot:

```sql
-- models/marts/dim_customers.sql
-- Clean dimension table with both current state and SCD history
{{
  config(
    materialized='table',
    partition_by={
      "field": "dbt_valid_from",
      "data_type": "timestamp",
      "granularity": "month"
    }
  )
}}

SELECT
    -- Surrogate key for the dimension row (unique per version)
    {{ dbt_utils.generate_surrogate_key(['customer_id', 'dbt_valid_from']) }} AS customer_key,
    customer_id,
    first_name,
    last_name,
    email,
    region,
    tier,
    account_manager,
    dbt_valid_from,
    dbt_valid_to,
    -- Flag for the current version
    CASE WHEN dbt_valid_to IS NULL THEN TRUE ELSE FALSE END AS is_current
FROM {{ ref('snap_customers') }}
```

## Handling Hard Deletes

By default, if a record disappears from the source, the snapshot just keeps the last version open (dbt_valid_to stays NULL). With `invalidate_hard_deletes=True`, dbt will close out deleted records:

```sql
-- Track and close out records that get deleted from the source
{% snapshot snap_employees %}

{{
  config(
    target_schema='snapshots',
    unique_key='employee_id',
    strategy='timestamp',
    updated_at='updated_at',
    invalidate_hard_deletes=True
  )
}}

SELECT
    employee_id,
    name,
    department,
    title,
    manager_id,
    updated_at
FROM {{ source('hr', 'employees') }}

{% endsnapshot %}
```

When an employee is deleted from the source, the snapshot closes the record by setting `dbt_valid_to` to the current timestamp.

## Scheduling Snapshots

Snapshots should run before your regular dbt models, since downstream models might reference the snapshot tables. A typical schedule:

```bash
# Run snapshots first, then the full model pipeline
dbt snapshot && dbt run && dbt test
```

In a production CI/CD pipeline or orchestrator like Cloud Composer:

```python
# Airflow DAG with proper ordering
snapshot_task = BashOperator(
    task_id='dbt_snapshot',
    bash_command='dbt snapshot --target prod'
)

run_task = BashOperator(
    task_id='dbt_run',
    bash_command='dbt run --target prod'
)

test_task = BashOperator(
    task_id='dbt_test',
    bash_command='dbt test --target prod'
)

# Snapshots run first, then models, then tests
snapshot_task >> run_task >> test_task
```

## Testing Snapshots

Add tests to ensure snapshot quality:

```yaml
# snapshots/schema.yml
snapshots:
  - name: snap_customers
    description: "SCD Type 2 history of customer records"
    columns:
      - name: customer_id
        tests:
          - not_null
      - name: dbt_valid_from
        tests:
          - not_null
    tests:
      # Ensure no overlapping validity periods for the same customer
      - dbt_utils.unique_combination_of_columns:
          combination_of_columns:
            - customer_id
            - dbt_valid_from
```

## Wrapping Up

dbt snapshots automate the tedious work of tracking historical changes to dimension data. Instead of writing custom merge logic and managing validity timestamps yourself, you define a snapshot once and let dbt handle the history on every run. The point-in-time join capability they enable is essential for accurate historical analysis - answering questions about what the world looked like when something happened, not what it looks like now. If your analytics queries ever need to correlate facts with the state of dimensions at a specific point in time, snapshots should be part of your dbt project.
