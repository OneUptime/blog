# How to Use dbt with Snowflake

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: dbt, Snowflake, Data Engineering, Analytics Engineering, SQL, Data Warehouse, ELT, Data Transformation

Description: A comprehensive guide to configuring and using dbt with Snowflake, covering profiles.yml setup, clustering, transient tables, zero-copy cloning, and query tags for efficient data transformation.

---

> dbt turns your SQL SELECT statements into tables and views in Snowflake, letting you version-control your transformations and test your data like production code.

Data Build Tool (dbt) has become the standard for transformation in modern data stacks. When paired with Snowflake's cloud-native architecture, you get a powerful combination for scalable, maintainable analytics engineering. This guide walks through the essential configurations and Snowflake-specific features that will help you build production-grade data pipelines.

---

## Setting Up profiles.yml for Snowflake

The `profiles.yml` file configures how dbt connects to your Snowflake account. This file typically lives in `~/.dbt/` on your local machine or is configured through environment variables in production.

```yaml
# ~/.dbt/profiles.yml
# This file contains your Snowflake connection settings
# Never commit this file to version control

analytics:
  target: dev  # Default target when running dbt commands
  outputs:
    # Development environment - uses your personal warehouse
    dev:
      type: snowflake
      account: xy12345.us-east-1  # Your Snowflake account identifier
      user: "{{ env_var('DBT_SNOWFLAKE_USER') }}"
      password: "{{ env_var('DBT_SNOWFLAKE_PASSWORD') }}"
      role: TRANSFORMER_DEV
      database: ANALYTICS_DEV
      warehouse: COMPUTE_WH_DEV
      schema: "{{ env_var('DBT_SCHEMA', 'dbt_' ~ env_var('USER')) }}"
      threads: 4  # Parallel model execution
      client_session_keep_alive: true  # Prevents session timeout
      query_tag: "dbt_dev_{{ env_var('USER') }}"  # Track queries in Snowflake

    # Production environment - uses dedicated warehouse
    prod:
      type: snowflake
      account: xy12345.us-east-1
      user: "{{ env_var('DBT_SNOWFLAKE_USER') }}"
      password: "{{ env_var('DBT_SNOWFLAKE_PASSWORD') }}"
      role: TRANSFORMER_PROD
      database: ANALYTICS
      warehouse: COMPUTE_WH_PROD
      schema: MARTS
      threads: 8  # Higher parallelism for production
      client_session_keep_alive: true
      query_tag: "dbt_prod"
```

### Key Profile Configuration Options

| Option | Description | Recommendation |
|--------|-------------|----------------|
| `threads` | Number of models to run in parallel | Start with 4, increase based on warehouse size |
| `client_session_keep_alive` | Maintains connection during long runs | Set to `true` for large projects |
| `query_tag` | Identifies dbt queries in Snowflake history | Always set for cost attribution |
| `role` | Snowflake role for the session | Use least-privilege roles per environment |

---

## Snowflake-Specific Features in dbt

Snowflake provides unique capabilities that dbt can leverage through configurations and macros. Understanding these features helps you build efficient, cost-effective data models.

### Model Configuration Options

In your `dbt_project.yml`, you can set Snowflake-specific configurations at the project, folder, or model level:

```yaml
# dbt_project.yml
name: 'analytics'
version: '1.0.0'

models:
  analytics:
    # Default configuration for all models
    +materialized: view
    +query_tag: "dbt_{{ target.name }}"

    staging:
      # Staging models are typically views
      +materialized: view
      +schema: staging

    intermediate:
      # Intermediate tables can be transient to save storage
      +materialized: table
      +transient: true
      +schema: intermediate

    marts:
      # Mart tables need full durability
      +materialized: table
      +transient: false
      +schema: marts

      # Large fact tables benefit from clustering
      core:
        +cluster_by: ['date_key', 'customer_id']
```

---

## Clustering for Query Performance

Snowflake's clustering keys optimize query performance by co-locating similar data. Unlike traditional indexes, clustering is automatic and maintenance-free after initial definition.

```sql
-- models/marts/core/fct_orders.sql
-- Fact table for all customer orders
-- Clustered by date and customer for common query patterns

{{
  config(
    materialized='table',
    cluster_by=['order_date', 'customer_id'],
    query_tag='dbt_marts_orders'
  )
}}

WITH orders AS (
    -- Pull from staging layer
    SELECT
        order_id,
        customer_id,
        order_date,
        order_status,
        total_amount,
        currency_code,
        created_at
    FROM {{ ref('stg_orders') }}
    WHERE order_status != 'cancelled'
),

customers AS (
    -- Join customer attributes
    SELECT
        customer_id,
        customer_segment,
        region
    FROM {{ ref('dim_customers') }}
)

SELECT
    o.order_id,
    o.customer_id,
    c.customer_segment,
    c.region,
    o.order_date,
    o.order_status,
    o.total_amount,
    o.currency_code,
    o.created_at,
    -- Add surrogate key for downstream joins
    {{ dbt_utils.generate_surrogate_key(['o.order_id']) }} AS order_key
FROM orders o
LEFT JOIN customers c ON o.customer_id = c.customer_id
```

### When to Use Clustering

| Use Clustering | Avoid Clustering |
|----------------|------------------|
| Tables > 1TB | Small tables (< 100GB) |
| Frequent range queries on specific columns | Tables with uniform access patterns |
| Fact tables filtered by date | Dimension tables with full scans |
| High-cardinality join columns | Staging tables rebuilt daily |

---

## Transient Tables for Cost Optimization

Transient tables in Snowflake have no Fail-safe period, reducing storage costs by up to 50%. They still maintain Time Travel (up to 1 day), making them ideal for intermediate transformations.

```sql
-- models/intermediate/int_daily_revenue.sql
-- Intermediate aggregation of daily revenue
-- Transient because it rebuilds daily and upstream data is durable

{{
  config(
    materialized='table',
    transient=true,
    query_tag='dbt_intermediate'
  )
}}

WITH daily_orders AS (
    SELECT
        order_date,
        customer_id,
        SUM(total_amount) AS daily_total,
        COUNT(DISTINCT order_id) AS order_count
    FROM {{ ref('stg_orders') }}
    WHERE order_date >= DATEADD('day', -90, CURRENT_DATE)
    GROUP BY order_date, customer_id
)

SELECT
    order_date,
    customer_id,
    daily_total,
    order_count,
    -- Calculate rolling 7-day average
    AVG(daily_total) OVER (
        PARTITION BY customer_id
        ORDER BY order_date
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ) AS rolling_7d_avg,
    CURRENT_TIMESTAMP AS transformed_at
FROM daily_orders
```

### Storage Cost Comparison

| Table Type | Time Travel | Fail-safe | Use Case |
|------------|-------------|-----------|----------|
| Permanent | Up to 90 days | 7 days | Final marts, critical data |
| Transient | Up to 1 day | None | Intermediate tables, dev/test |
| Temporary | Session only | None | CTEs materialized within a run |

---

## Zero-Copy Cloning for Development and Testing

Zero-copy cloning creates instant copies of databases, schemas, or tables without duplicating storage. This is invaluable for testing dbt changes against production data.

### Clone Macro for dbt

```sql
-- macros/clone_production.sql
-- Creates a zero-copy clone of production for testing
-- Usage: dbt run-operation clone_production --args '{schema: marts}'

{% macro clone_production(schema) %}

  {% set clone_name = schema ~ '_clone_' ~ modules.datetime.datetime.now().strftime('%Y%m%d') %}

  {% set clone_sql %}
    -- Create zero-copy clone of production schema
    -- Storage only used for changes made to the clone
    CREATE OR REPLACE SCHEMA {{ target.database }}.{{ clone_name }}
    CLONE {{ var('prod_database', 'ANALYTICS') }}.{{ schema }}
    COMMENT = 'Clone created by dbt for testing on {{ modules.datetime.datetime.now().isoformat() }}';
  {% endset %}

  {% do log("Creating clone: " ~ clone_name, info=True) %}
  {% do run_query(clone_sql) %}
  {% do log("Clone created successfully", info=True) %}

  -- Return the clone name for use in tests
  {{ return(clone_name) }}

{% endmacro %}
```

### Using Clones in CI/CD

```yaml
# .github/workflows/dbt-ci.yml
# Runs dbt against a cloned schema for pull request validation

name: dbt CI

on:
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install dbt
        run: pip install dbt-snowflake

      - name: Create Clone
        run: |
          dbt run-operation clone_production --args '{schema: marts}'
        env:
          DBT_SNOWFLAKE_USER: ${{ secrets.DBT_USER }}
          DBT_SNOWFLAKE_PASSWORD: ${{ secrets.DBT_PASSWORD }}

      - name: Run dbt
        run: |
          dbt deps
          dbt build --select state:modified+
        env:
          DBT_SNOWFLAKE_USER: ${{ secrets.DBT_USER }}
          DBT_SNOWFLAKE_PASSWORD: ${{ secrets.DBT_PASSWORD }}
```

---

## Query Tags for Cost Attribution and Debugging

Query tags allow you to track which dbt models, users, or pipelines generate specific queries. This is essential for cost allocation and debugging slow queries.

### Dynamic Query Tags

```sql
-- macros/set_query_tag.sql
-- Sets query tag with model context for cost attribution

{% macro set_query_tag() %}

  {% set query_tag %}
    {
      "dbt_project": "{{ project_name }}",
      "dbt_model": "{{ this.name if this else 'unknown' }}",
      "dbt_target": "{{ target.name }}",
      "dbt_user": "{{ env_var('DBT_USER', 'unknown') }}",
      "dbt_invocation_id": "{{ invocation_id }}"
    }
  {% endset %}

  {% do run_query("ALTER SESSION SET QUERY_TAG = '" ~ query_tag ~ "'") %}

{% endmacro %}
```

### Pre-hook for Automatic Tagging

```yaml
# dbt_project.yml
# Apply query tags automatically to all models

models:
  analytics:
    +pre-hook:
      - "{{ set_query_tag() }}"
```

### Querying Tagged Queries in Snowflake

```sql
-- Query to analyze dbt costs by model
-- Run this in Snowflake to see compute usage breakdown

SELECT
    PARSE_JSON(query_tag):dbt_model::STRING AS dbt_model,
    PARSE_JSON(query_tag):dbt_target::STRING AS environment,
    COUNT(*) AS query_count,
    SUM(total_elapsed_time) / 1000 AS total_seconds,
    SUM(credits_used_cloud_services) AS credits_used,
    AVG(bytes_scanned) / POWER(1024, 3) AS avg_gb_scanned
FROM snowflake.account_usage.query_history
WHERE query_tag LIKE '%dbt_project%'
  AND start_time >= DATEADD('day', -7, CURRENT_TIMESTAMP)
GROUP BY 1, 2
ORDER BY credits_used DESC
LIMIT 20;
```

---

## Incremental Models with Snowflake Merge

Incremental models process only new or changed data, dramatically reducing run times and costs for large tables.

```sql
-- models/marts/core/fct_events.sql
-- Incremental event fact table using Snowflake MERGE
-- Processes only new events since last run

{{
  config(
    materialized='incremental',
    unique_key='event_id',
    incremental_strategy='merge',
    cluster_by=['event_date', 'event_type'],
    query_tag='dbt_incremental_events'
  )
}}

WITH source_events AS (
    SELECT
        event_id,
        user_id,
        event_type,
        event_properties,
        event_timestamp,
        DATE(event_timestamp) AS event_date,
        -- Extract common properties for clustering
        event_properties:page_url::STRING AS page_url,
        event_properties:device_type::STRING AS device_type
    FROM {{ source('raw', 'events') }}

    {% if is_incremental() %}
      -- Only process events newer than the max in our table
      -- Add 1-hour overlap to handle late-arriving data
      WHERE event_timestamp > (
        SELECT DATEADD('hour', -1, MAX(event_timestamp))
        FROM {{ this }}
      )
    {% endif %}
)

SELECT
    event_id,
    user_id,
    event_type,
    event_properties,
    event_timestamp,
    event_date,
    page_url,
    device_type,
    CURRENT_TIMESTAMP AS loaded_at
FROM source_events
```

---

## Best Practices Summary

Following these best practices will help you build maintainable, cost-effective dbt projects on Snowflake:

### Configuration

- Use environment variables for credentials in `profiles.yml`
- Set `query_tag` on all models for cost attribution
- Use separate warehouses for dev and prod workloads
- Enable `client_session_keep_alive` for long-running projects

### Performance

- Apply clustering to large fact tables (> 1TB) on frequently filtered columns
- Use incremental models for append-only or slowly changing data
- Set appropriate `threads` based on warehouse size
- Monitor query performance using Snowflake's Query Profile

### Cost Optimization

- Use transient tables for intermediate models
- Leverage zero-copy cloning for development and CI/CD
- Monitor costs with query tags and `ACCOUNT_USAGE` views
- Right-size warehouses based on actual workload needs

### Development Workflow

- Clone production schemas for safe testing
- Use `dbt build --select state:modified+` in CI to test changes
- Implement pre-commit hooks for SQL linting
- Document models with descriptions and column-level docs

---

## Conclusion

dbt and Snowflake together provide a powerful platform for modern analytics engineering. By leveraging Snowflake-specific features like clustering, transient tables, zero-copy cloning, and query tags, you can build data pipelines that are both performant and cost-effective.

Start with good defaults in your `dbt_project.yml`, monitor your query costs with tags, and iterate on your configurations as your data grows. The investment in proper setup pays dividends in maintainability and reduced cloud spend.

For monitoring your dbt pipelines and Snowflake infrastructure, check out [OneUptime](https://oneuptime.com) for comprehensive observability across your entire data stack.
