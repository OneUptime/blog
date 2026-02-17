# How to Use dbt Macros to Generate Dynamic BigQuery SQL for Multi-Tenant Data Models

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, dbt, Macros, Multi-Tenant, SQL Generation

Description: Learn how to write dbt macros that dynamically generate BigQuery SQL for multi-tenant data models, reducing code duplication and maintaining consistency across tenant-specific transformations.

---

Multi-tenant data models are everywhere in SaaS applications. Each tenant (customer, organization, team) has the same data structure but needs isolated processing. Writing separate dbt models for each tenant does not scale. When you have 50 tenants and need to change a transformation, you do not want to edit 50 files.

dbt macros solve this by letting you write SQL templates that generate tenant-specific queries dynamically. Instead of duplicating models, you define the logic once in a macro and parameterize the tenant-specific parts.

## What Are dbt Macros?

dbt macros are reusable pieces of Jinja-templated SQL. They are like functions in a programming language - they accept parameters, execute logic, and return SQL strings. Macros live in the `macros/` directory of your dbt project.

Here is a simple macro that generates a filtered query for a specific tenant:

```sql
-- macros/tenant_filter.sql
-- Macro that adds a tenant filter to any query
-- Used to isolate data for a specific tenant

{% macro tenant_filter(tenant_id) %}
  WHERE tenant_id = '{{ tenant_id }}'
{% endmacro %}
```

You use it in a model like this:

```sql
-- models/marts/filtered_orders.sql
SELECT order_id, customer_id, total_amount, order_date
FROM {{ ref('stg_orders') }}
{{ tenant_filter('acme-corp') }}
```

But this is just the beginning. Let us build more powerful macros for real multi-tenant scenarios.

## Generating Tenant-Specific Models Dynamically

Instead of creating a separate model file for each tenant, use a macro to generate the SQL for any tenant and call it from a single model:

```sql
-- macros/generate_tenant_metrics.sql
-- Generates a complete tenant metrics query with tenant-specific settings

{% macro generate_tenant_metrics(tenant_id, retention_days=90) %}

WITH tenant_events AS (
    -- Filter events to this specific tenant
    SELECT *
    FROM {{ ref('stg_events') }}
    WHERE tenant_id = '{{ tenant_id }}'
      AND event_date >= DATE_SUB(CURRENT_DATE(), INTERVAL {{ retention_days }} DAY)
),

daily_metrics AS (
    -- Aggregate daily metrics for the tenant
    SELECT
        '{{ tenant_id }}' AS tenant_id,
        event_date,
        COUNT(DISTINCT user_id) AS daily_active_users,
        COUNT(*) AS total_events,
        COUNT(DISTINCT session_id) AS total_sessions,
        ROUND(AVG(session_duration_seconds), 2) AS avg_session_duration
    FROM tenant_events
    GROUP BY event_date
)

SELECT * FROM daily_metrics

{% endmacro %}
```

Use it in a model:

```sql
-- models/marts/tenant_metrics_acme.sql
{{ generate_tenant_metrics('acme-corp', retention_days=180) }}
```

## Union All Tenants with a Macro

A common pattern is to process each tenant separately and then union the results into a single table. A macro can generate this dynamically:

```sql
-- macros/union_all_tenants.sql
-- Generates a UNION ALL query across all tenants
-- The tenant list comes from a seed file or a variable

{% macro union_all_tenants(base_model, tenant_list) %}

{% for tenant in tenant_list %}
    SELECT
        '{{ tenant.id }}' AS tenant_id,
        '{{ tenant.name }}' AS tenant_name,
        *
    FROM {{ ref(base_model) }}
    WHERE tenant_id = '{{ tenant.id }}'
    {% if not loop.last %}
    UNION ALL
    {% endif %}
{% endfor %}

{% endmacro %}
```

Define the tenant list in your `dbt_project.yml`:

```yaml
# dbt_project.yml
vars:
  tenant_list:
    - { id: 'acme-corp', name: 'Acme Corporation' }
    - { id: 'globex', name: 'Globex Inc' }
    - { id: 'initech', name: 'Initech LLC' }
    - { id: 'umbrella', name: 'Umbrella Corp' }
```

Use it in a model:

```sql
-- models/marts/all_tenant_metrics.sql
-- Generates tenant metrics for all configured tenants in one table
{{ union_all_tenants('stg_events_aggregated', var('tenant_list')) }}
```

## Dynamic Column Generation

Some tenants have custom fields that others do not. A macro can handle this dynamically:

```sql
-- macros/tenant_custom_columns.sql
-- Generates tenant-specific custom column selections

{% macro tenant_custom_columns(tenant_id, custom_fields) %}
    {% for field in custom_fields %}
        JSON_VALUE(custom_data, '$.{{ field.source_key }}') AS {{ field.column_name }}
        {% if not loop.last %},{% endif %}
    {% endfor %}
{% endmacro %}
```

Define custom fields per tenant:

```yaml
# dbt_project.yml
vars:
  tenant_custom_fields:
    acme-corp:
      - { source_key: 'department', column_name: 'department' }
      - { source_key: 'cost_center', column_name: 'cost_center' }
    globex:
      - { source_key: 'region', column_name: 'business_region' }
      - { source_key: 'priority_level', column_name: 'priority' }
```

```sql
-- models/marts/enriched_orders.sql
-- Enriches orders with tenant-specific custom fields from JSON

SELECT
    order_id,
    tenant_id,
    customer_id,
    total_amount,
    order_date,
    {% if var('tenant_custom_fields', {}).get(var('current_tenant', 'default')) %}
        {{ tenant_custom_columns(
            var('current_tenant'),
            var('tenant_custom_fields')[var('current_tenant')]
        ) }},
    {% endif %}
    created_at
FROM {{ ref('stg_orders') }}
```

## Generating Partitioned Views Per Tenant

For data isolation, you might want each tenant to have their own BigQuery view:

```sql
-- macros/create_tenant_views.sql
-- Macro to generate a CREATE VIEW statement for a specific tenant
-- Used with dbt's run-operation to create views outside the normal model flow

{% macro create_tenant_view(tenant_id, source_table, view_name) %}

{% set sql %}
    CREATE OR REPLACE VIEW `{{ target.project }}.{{ tenant_id }}_views.{{ view_name }}` AS
    SELECT *
    FROM `{{ target.project }}.{{ target.schema }}.{{ source_table }}`
    WHERE tenant_id = '{{ tenant_id }}'
{% endset %}

{% do run_query(sql) %}
{{ log("Created view for tenant: " ~ tenant_id, info=True) }}

{% endmacro %}
```

Run it for all tenants using a hook or run-operation:

```sql
-- macros/create_all_tenant_views.sql
-- Creates isolated views for every tenant in the list

{% macro create_all_tenant_views() %}

{% set tenants = var('tenant_list') %}
{% set tables = ['orders', 'events', 'customers'] %}

{% for tenant in tenants %}
    {% for table in tables %}
        {{ create_tenant_view(tenant.id, 'fct_' ~ table, table) }}
    {% endfor %}
{% endfor %}

{% endmacro %}
```

## Macro for Tenant-Aware Incremental Processing

Combine macros with incremental models for efficient tenant-specific processing:

```sql
-- macros/tenant_incremental_filter.sql
-- Generates the incremental filter with tenant-specific lookback periods

{% macro tenant_incremental_filter(tenant_id, timestamp_column, lookback_hours=24) %}

{% if is_incremental() %}
    AND {{ timestamp_column }} > (
        SELECT COALESCE(
            MAX({{ timestamp_column }}),
            TIMESTAMP('2020-01-01')
        )
        FROM {{ this }}
        WHERE tenant_id = '{{ tenant_id }}'
    )
{% endif %}

{% endmacro %}
```

```sql
-- models/marts/fct_tenant_events.sql
-- Incremental model with per-tenant incremental logic
{{
  config(
    materialized='incremental',
    incremental_strategy='merge',
    unique_key=['tenant_id', 'event_id'],
    partition_by={"field": "event_date", "data_type": "date"}
  )
}}

{% set tenants = var('tenant_list') %}

{% for tenant in tenants %}
    SELECT
        '{{ tenant.id }}' AS tenant_id,
        event_id,
        user_id,
        event_type,
        CAST(event_timestamp AS DATE) AS event_date,
        event_timestamp,
        event_properties
    FROM {{ ref('stg_events') }}
    WHERE tenant_id = '{{ tenant.id }}'
    {{ tenant_incremental_filter(tenant.id, 'event_timestamp', lookback_hours=48) }}

    {% if not loop.last %}UNION ALL{% endif %}
{% endfor %}
```

## Testing Macros

You should test your macros to make sure they generate the expected SQL. Use dbt's `compile` command to see the generated SQL without running it:

```bash
# Compile a model to see the generated SQL
dbt compile --select all_tenant_metrics

# The compiled SQL is in target/compiled/my_analytics/models/marts/all_tenant_metrics.sql
```

You can also write tests specifically for macro output:

```sql
-- tests/assert_all_tenants_present.sql
-- Verify that the macro generated data for all expected tenants

{% set expected_tenants = var('tenant_list') | map(attribute='id') | list %}

SELECT tenant_id
FROM (
    {% for tenant in expected_tenants %}
        SELECT '{{ tenant }}' AS tenant_id
        {% if not loop.last %}UNION ALL{% endif %}
    {% endfor %}
) expected
LEFT JOIN (
    SELECT DISTINCT tenant_id FROM {{ ref('all_tenant_metrics') }}
) actual USING (tenant_id)
WHERE actual.tenant_id IS NULL
```

## Macro Utilities for BigQuery-Specific SQL

Some macros are useful for generating BigQuery-specific SQL patterns:

```sql
-- macros/bigquery_utils.sql

-- Generate a MERGE statement for upsert operations
{% macro bq_upsert(target_table, source_query, unique_key, update_columns) %}
MERGE `{{ target_table }}` AS target
USING ({{ source_query }}) AS source
ON target.{{ unique_key }} = source.{{ unique_key }}
WHEN MATCHED THEN
    UPDATE SET
        {% for col in update_columns %}
            target.{{ col }} = source.{{ col }}{% if not loop.last %},{% endif %}
        {% endfor %}
WHEN NOT MATCHED THEN
    INSERT ROW
{% endmacro %}

-- Generate partition pruning hints
{% macro bq_partition_hint(partition_column, days_back=7) %}
    {{ partition_column }} >= DATE_SUB(CURRENT_DATE(), INTERVAL {{ days_back }} DAY)
{% endmacro %}
```

## Wrapping Up

dbt macros are the key to managing multi-tenant data models without drowning in duplicated SQL. By parameterizing tenant-specific logic into reusable macros, you write the transformation once and apply it across any number of tenants. The combination of Jinja templating with dbt's variable system gives you the flexibility to handle tenant-specific customizations (custom fields, retention periods, processing schedules) while keeping your codebase maintainable. Start with simple macros for common patterns like tenant filtering and union generation, then build up to more complex patterns as your needs grow.
