# How to Write Effective dbt Models

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: dbt, Data Engineering, SQL, Data Transformation, Analytics, Data Modeling

Description: A practical guide to writing effective dbt models - covering organization, materialization strategies, testing, documentation, and performance optimization for scalable data transformations.

---

> dbt models should be **modular, tested, and documented**. If you cannot explain what a model does in one sentence, it is doing too much.

dbt (data build tool) has become the standard for transforming data in modern analytics stacks. But writing dbt models that are maintainable, performant, and trustworthy requires discipline. This guide covers the patterns and practices that separate production-grade dbt projects from SQL spaghetti.

---

## dbt Model Basics

A dbt model is simply a SQL SELECT statement stored in a `.sql` file. dbt handles the DDL (CREATE TABLE, CREATE VIEW) for you.

```sql
-- models/staging/stg_orders.sql
-- Basic dbt model structure

select
    id as order_id,
    user_id,
    status,
    created_at,
    updated_at
from {{ source('raw', 'orders') }}
where _fivetran_deleted = false
```

Key concepts:
- Models live in the `models/` directory
- File name becomes the table/view name
- Use Jinja templating for dynamic SQL
- Configuration via YAML or in-model config blocks

---

## Model Materialization Types

Materialization determines how dbt builds your model in the warehouse.

### View (Default)

```sql
-- models/staging/stg_users.sql
-- Views are fast to build but query source data each time

{{ config(materialized='view') }}

select
    id as user_id,
    email,
    created_at
from {{ source('raw', 'users') }}
```

Use views when:
- Source data is small
- Query performance is acceptable
- You want transformations to reflect source changes immediately

### Table

```sql
-- models/marts/dim_customers.sql
-- Tables store results physically - faster queries, slower builds

{{ config(materialized='table') }}

select
    customer_id,
    first_name,
    last_name,
    email,
    lifetime_value,
    first_order_date,
    most_recent_order_date
from {{ ref('int_customer_metrics') }}
```

Use tables when:
- Query performance is critical
- Model is frequently accessed by BI tools
- Transformation logic is complex

### Incremental

```sql
-- models/marts/fct_events.sql
-- Incremental models only process new/changed data

{{ config(
    materialized='incremental',
    unique_key='event_id',
    incremental_strategy='merge'
) }}

select
    event_id,
    user_id,
    event_type,
    event_properties,
    occurred_at
from {{ source('raw', 'events') }}

{% if is_incremental() %}
    -- Only process events newer than the latest in this model
    where occurred_at > (select max(occurred_at) from {{ this }})
{% endif %}
```

Use incremental when:
- Source tables are large (millions of rows)
- You have a reliable timestamp or ID for new records
- Full refreshes take too long

### Ephemeral

```sql
-- models/staging/stg_order_items.sql
-- Ephemeral models are CTEs injected into downstream models

{{ config(materialized='ephemeral') }}

select
    id as order_item_id,
    order_id,
    product_id,
    quantity,
    unit_price
from {{ source('raw', 'order_items') }}
```

Use ephemeral when:
- Model is only used by one or two downstream models
- You want to reduce warehouse object clutter
- The transformation is simple

---

## Refs and Sources

### Sources

Sources define your raw data inputs. Configure them in YAML:

```yaml
# models/staging/_sources.yml
version: 2

sources:
  - name: raw
    database: analytics_raw
    schema: production
    tables:
      - name: orders
        description: Raw orders from production database
        freshness:
          warn_after: {count: 12, period: hour}
          error_after: {count: 24, period: hour}
        loaded_at_field: _loaded_at
      - name: users
        description: Raw user records
      - name: products
        description: Product catalog
```

Reference sources in models:

```sql
-- Use source() function to reference raw data
select * from {{ source('raw', 'orders') }}
```

### Refs

Use `ref()` to reference other dbt models. This creates the DAG (dependency graph).

```sql
-- models/marts/fct_order_summary.sql
-- ref() creates dependencies and handles schema/database references

select
    o.order_id,
    o.order_date,
    c.customer_name,
    p.product_name,
    oi.quantity,
    oi.unit_price,
    oi.quantity * oi.unit_price as line_total
from {{ ref('stg_orders') }} o
left join {{ ref('stg_order_items') }} oi on o.order_id = oi.order_id
left join {{ ref('dim_customers') }} c on o.customer_id = c.customer_id
left join {{ ref('dim_products') }} p on oi.product_id = p.product_id
```

Benefits of ref():
- Automatic dependency resolution
- Environment-aware schema references
- Enables lineage tracking

---

## Model Organization

Follow the staging, intermediate, marts pattern for clean architecture.

```
models/
  staging/
    _sources.yml
    _stg_models.yml
    stg_orders.sql
    stg_users.sql
    stg_products.sql
  intermediate/
    _int_models.yml
    int_order_items_enriched.sql
    int_customer_metrics.sql
  marts/
    core/
      _core_models.yml
      dim_customers.sql
      dim_products.sql
      fct_orders.sql
    finance/
      _finance_models.yml
      fct_revenue.sql
    marketing/
      _marketing_models.yml
      fct_campaigns.sql
```

### Staging Models

Staging models clean and rename raw source data. One staging model per source table.

```sql
-- models/staging/stg_orders.sql
-- Staging: light transformations only - rename, cast, filter deleted

with source as (
    select * from {{ source('raw', 'orders') }}
),

renamed as (
    select
        -- Primary key
        id as order_id,

        -- Foreign keys
        user_id as customer_id,

        -- Dimensions
        status as order_status,
        shipping_method,

        -- Dates
        created_at as ordered_at,
        shipped_at,
        delivered_at,

        -- Amounts (convert cents to dollars)
        total_cents / 100.0 as order_total,
        discount_cents / 100.0 as discount_amount,

        -- Metadata
        _fivetran_synced as synced_at
    from source
    where _fivetran_deleted = false
)

select * from renamed
```

### Intermediate Models

Intermediate models handle complex joins and business logic.

```sql
-- models/intermediate/int_customer_orders.sql
-- Intermediate: join staging models, apply business logic

with orders as (
    select * from {{ ref('stg_orders') }}
),

order_items as (
    select * from {{ ref('stg_order_items') }}
),

-- Calculate order-level metrics
order_metrics as (
    select
        order_id,
        count(*) as item_count,
        sum(quantity) as total_units,
        sum(line_total) as order_subtotal
    from order_items
    group by 1
)

select
    o.order_id,
    o.customer_id,
    o.ordered_at,
    o.order_status,
    om.item_count,
    om.total_units,
    om.order_subtotal,
    o.discount_amount,
    om.order_subtotal - o.discount_amount as order_total
from orders o
left join order_metrics om on o.order_id = om.order_id
```

### Marts Models

Marts are the final, business-facing models. Organized by department or domain.

```sql
-- models/marts/core/dim_customers.sql
-- Mart: business-ready dimension table

{{ config(materialized='table') }}

with customers as (
    select * from {{ ref('stg_customers') }}
),

customer_orders as (
    select * from {{ ref('int_customer_orders') }}
),

-- Aggregate customer metrics
customer_metrics as (
    select
        customer_id,
        count(distinct order_id) as total_orders,
        sum(order_total) as lifetime_value,
        min(ordered_at) as first_order_at,
        max(ordered_at) as most_recent_order_at,
        avg(order_total) as average_order_value
    from customer_orders
    group by 1
)

select
    c.customer_id,
    c.first_name,
    c.last_name,
    c.email,
    c.created_at as customer_since,

    -- Order metrics
    coalesce(m.total_orders, 0) as total_orders,
    coalesce(m.lifetime_value, 0) as lifetime_value,
    m.first_order_at,
    m.most_recent_order_at,
    coalesce(m.average_order_value, 0) as average_order_value,

    -- Derived attributes
    case
        when m.total_orders is null then 'never_ordered'
        when m.total_orders = 1 then 'one_time'
        when m.total_orders between 2 and 5 then 'repeat'
        else 'loyal'
    end as customer_segment
from customers c
left join customer_metrics m on c.customer_id = m.customer_id
```

---

## Testing Models

dbt supports schema tests (declarative) and data tests (SQL queries).

### Schema Tests

```yaml
# models/marts/core/_core_models.yml
version: 2

models:
  - name: dim_customers
    description: Customer dimension with lifetime metrics
    columns:
      - name: customer_id
        description: Primary key
        tests:
          - unique
          - not_null
      - name: email
        description: Customer email address
        tests:
          - unique
          - not_null
      - name: customer_segment
        description: Behavioral segmentation
        tests:
          - accepted_values:
              values: ['never_ordered', 'one_time', 'repeat', 'loyal']
      - name: lifetime_value
        description: Total revenue from customer
        tests:
          - not_null
          - dbt_utils.expression_is_true:
              expression: ">= 0"

  - name: fct_orders
    description: Order fact table
    columns:
      - name: order_id
        tests:
          - unique
          - not_null
      - name: customer_id
        tests:
          - not_null
          - relationships:
              to: ref('dim_customers')
              field: customer_id
```

### Custom Data Tests

```sql
-- tests/assert_order_total_positive.sql
-- Custom test: ensure no orders have negative totals

select
    order_id,
    order_total
from {{ ref('fct_orders') }}
where order_total < 0
```

```sql
-- tests/assert_recent_orders_exist.sql
-- Custom test: ensure data pipeline is running

select 1
from {{ ref('fct_orders') }}
where ordered_at >= current_date - interval '2 days'
having count(*) = 0
```

### Test Configurations

```yaml
# dbt_project.yml
tests:
  +severity: warn  # Default to warn, not error
  my_project:
    marts:
      +severity: error  # Mart tests should fail the build
```

---

## Documentation

Document models and columns in YAML files.

```yaml
# models/marts/core/_core_models.yml
version: 2

models:
  - name: dim_customers
    description: |
      Customer dimension table containing one row per customer.

      This model combines customer profile data with calculated
      lifetime metrics from their order history.

      **Primary Key:** customer_id
      **Grain:** One row per customer
      **Update Frequency:** Daily

    columns:
      - name: customer_id
        description: Unique identifier for the customer (surrogate key)

      - name: lifetime_value
        description: |
          Total revenue attributed to this customer across all orders.
          Calculated as sum of order_total from fct_orders.
          Does not include refunded orders.

      - name: customer_segment
        description: |
          Behavioral segmentation based on order count:
          - never_ordered: No orders placed
          - one_time: Exactly 1 order
          - repeat: 2-5 orders
          - loyal: 6+ orders
```

### Doc Blocks

Create reusable documentation with doc blocks:

```markdown
-- docs/descriptions.md
{% docs customer_id %}
Unique identifier for the customer.
This is a surrogate key generated from the source system's user_id.
{% enddocs %}

{% docs lifetime_value %}
Total revenue attributed to this customer across all completed orders.
Excludes refunded and cancelled orders.
Currency: USD
{% enddocs %}
```

Reference in YAML:

```yaml
columns:
  - name: customer_id
    description: '{{ doc("customer_id") }}'
  - name: lifetime_value
    description: '{{ doc("lifetime_value") }}'
```

---

## Jinja and Macros

### Basic Jinja

```sql
-- Using variables
select * from {{ ref('stg_orders') }}
where ordered_at >= '{{ var("start_date", "2024-01-01") }}'

-- Conditional logic
select
    order_id,
    {% if target.name == 'prod' %}
        customer_email  -- Include PII in prod
    {% else %}
        md5(customer_email) as customer_email_hash  -- Hash in dev
    {% endif %}
from {{ ref('stg_orders') }}
```

### Creating Macros

```sql
-- macros/cents_to_dollars.sql
-- Macro to convert cents to dollars with consistent formatting

{% macro cents_to_dollars(column_name, precision=2) %}
    round({{ column_name }} / 100.0, {{ precision }})
{% endmacro %}
```

Use in models:

```sql
select
    order_id,
    {{ cents_to_dollars('total_cents') }} as order_total,
    {{ cents_to_dollars('discount_cents') }} as discount_amount
from {{ source('raw', 'orders') }}
```

### Generate Schema Macro

```sql
-- macros/generate_surrogate_key.sql
-- Create a surrogate key from multiple columns

{% macro surrogate_key(columns) %}
    {{ dbt_utils.generate_surrogate_key(columns) }}
{% endmacro %}
```

### Dynamic Column Selection

```sql
-- macros/star_except.sql
-- Select all columns except specified ones

{% macro star_except(from_table, except_columns) %}
    {% set columns = adapter.get_columns_in_relation(from_table) %}
    {% set column_names = columns | map(attribute='name') | list %}
    {% for col in column_names if col not in except_columns %}
        {{ col }}{% if not loop.last %},{% endif %}
    {% endfor %}
{% endmacro %}
```

---

## Performance Optimization

### Partitioning and Clustering

```sql
-- models/marts/fct_events.sql
-- BigQuery example with partitioning and clustering

{{ config(
    materialized='incremental',
    partition_by={
        "field": "event_date",
        "data_type": "date",
        "granularity": "day"
    },
    cluster_by=['event_type', 'user_id']
) }}

select
    event_id,
    user_id,
    event_type,
    event_properties,
    date(occurred_at) as event_date,
    occurred_at
from {{ source('raw', 'events') }}

{% if is_incremental() %}
    where occurred_at > (select max(occurred_at) from {{ this }})
{% endif %}
```

### Reducing Full Table Scans

```sql
-- Bad: full scan of large table
select * from {{ ref('fct_events') }}
where event_type = 'purchase'

-- Better: use partitioned column in WHERE clause
select * from {{ ref('fct_events') }}
where event_date >= current_date - 30
  and event_type = 'purchase'
```

### Incremental Strategies

```sql
-- Delete and insert strategy for handling late-arriving data
{{ config(
    materialized='incremental',
    unique_key='order_id',
    incremental_strategy='delete+insert',
    incremental_predicates=[
        "DBT_INTERNAL_DEST.order_date >= dateadd(day, -3, current_date)"
    ]
) }}

select
    order_id,
    order_date,
    order_total
from {{ ref('stg_orders') }}

{% if is_incremental() %}
    where order_date >= dateadd(day, -3, current_date)
{% endif %}
```

### Avoiding Expensive Operations

```sql
-- Bad: DISTINCT on large result set
select distinct
    customer_id,
    product_id
from {{ ref('fct_order_items') }}

-- Better: use GROUP BY or window functions
select
    customer_id,
    product_id
from {{ ref('fct_order_items') }}
group by 1, 2
```

---

## Version Control Best Practices

### Project Structure

```
dbt_project/
  dbt_project.yml
  packages.yml
  profiles.yml.example
  .gitignore
  macros/
  models/
  tests/
  seeds/
  snapshots/
  docs/
```

### .gitignore

```
# dbt artifacts
target/
dbt_packages/
dbt_modules/
logs/

# Environment
.env
profiles.yml

# IDE
.idea/
.vscode/
```

### Pull Request Checklist

Before merging dbt changes:

1. Run `dbt build` locally (models + tests)
2. Check `dbt docs generate` for documentation
3. Review the DAG for unexpected dependencies
4. Verify incremental models with `--full-refresh`
5. Check for breaking changes to downstream consumers

### CI/CD Pipeline

```yaml
# .github/workflows/dbt-ci.yml
name: dbt CI

on:
  pull_request:
    paths:
      - 'models/**'
      - 'macros/**'
      - 'tests/**'

jobs:
  dbt-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install dbt
        run: pip install dbt-bigquery
      - name: dbt deps
        run: dbt deps
      - name: dbt build
        run: dbt build --select state:modified+
        env:
          DBT_PROFILES_DIR: ./
```

---

## Common Patterns and Anti-Patterns

### Patterns to Follow

| Pattern | Example | Why |
|---------|---------|-----|
| One staging model per source | `stg_orders.sql` for `raw.orders` | Clear lineage |
| Naming conventions | `stg_`, `int_`, `dim_`, `fct_` | Self-documenting |
| Tests on primary keys | `unique`, `not_null` | Data integrity |
| Version controlled seeds | `seeds/country_codes.csv` | Reproducibility |
| Incremental for large tables | >10M rows | Performance |

### Anti-Patterns to Avoid

| Anti-Pattern | Problem | Solution |
|--------------|---------|----------|
| Giant models with many CTEs | Hard to debug and test | Break into intermediate models |
| Hardcoded values | Environment-specific failures | Use variables or seeds |
| Skipping staging layer | Duplicate transformation logic | Always stage raw data first |
| Over-using ephemeral | Hidden compute costs, hard to debug | Materialize frequently used models |
| No tests | Silent data quality issues | Test critical columns |
| SELECT * | Breaking changes, poor performance | Explicit column selection |

### Example: Refactoring a Bad Model

```sql
-- BEFORE: Monolithic model with hardcoded logic
select
    o.id,
    o.user_id,
    u.email,
    o.total / 100.0 as total,
    case when o.status = 1 then 'pending'
         when o.status = 2 then 'shipped'
         else 'unknown' end as status
from raw.orders o
join raw.users u on o.user_id = u.id
where o.created_at >= '2024-01-01'
```

```sql
-- AFTER: Proper staging and mart separation

-- models/staging/stg_orders.sql
select
    id as order_id,
    user_id,
    {{ cents_to_dollars('total') }} as order_total,
    {{ map_order_status('status') }} as order_status,
    created_at as ordered_at
from {{ source('raw', 'orders') }}

-- models/marts/fct_orders.sql
select
    o.order_id,
    o.user_id,
    c.email as customer_email,
    o.order_total,
    o.order_status,
    o.ordered_at
from {{ ref('stg_orders') }} o
left join {{ ref('dim_customers') }} c on o.user_id = c.customer_id
where o.ordered_at >= '{{ var("analysis_start_date") }}'
```

---

## Summary: dbt Best Practices

1. **Organize models** in staging, intermediate, and marts layers
2. **Choose materialization** based on data volume and query patterns
3. **Use refs and sources** to build the dependency graph
4. **Test everything** - especially primary keys and relationships
5. **Document models** with descriptions and doc blocks
6. **Write macros** for repeated logic
7. **Optimize performance** with partitioning and incremental strategies
8. **Version control** with proper CI/CD pipelines
9. **Follow naming conventions** consistently
10. **Review and refactor** regularly

---

## Monitor Your Data Pipelines

After building reliable dbt models, you need to monitor your data pipelines in production. Ensure your transformations run on schedule, catch failures early, and track data freshness with proper observability.

[OneUptime](https://oneuptime.com) provides comprehensive monitoring for your data infrastructure - including scheduled job monitoring, alerting, and status pages to keep your analytics stack running smoothly.
