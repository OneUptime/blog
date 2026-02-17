# How to Write Custom dbt Tests for Data Quality Validation in BigQuery Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, dbt, Data Quality, Testing, Data Validation

Description: Learn how to write custom dbt tests beyond the built-in ones to validate data quality in BigQuery pipelines, including singular tests, generic tests, and test macros.

---

dbt ships with four built-in tests: unique, not_null, accepted_values, and relationships. They cover the basics, but real-world data pipelines need more. You need to check that revenue numbers make sense, that foreign keys across systems match up, that row counts are within expected ranges, and that date sequences do not have gaps. Custom dbt tests let you encode these business rules as automated checks that run on every pipeline execution.

## How dbt Tests Work

A dbt test is a SQL query that returns rows. If the query returns zero rows, the test passes. If it returns one or more rows, the test fails. Every failing row represents a data quality violation.

There are two types of custom tests in dbt: singular tests (one-off SQL files) and generic tests (reusable, parameterized macros).

## Singular Tests

Singular tests are standalone SQL files in the `tests/` directory. Each file contains a SELECT query that should return zero rows if the data is valid.

### Test: No Negative Revenue

```sql
-- tests/assert_no_negative_revenue.sql
-- Verify that no order has a negative total amount
-- Any rows returned by this query indicate a data quality problem

SELECT
    order_id,
    customer_id,
    total_amount,
    order_date
FROM {{ ref('fct_orders') }}
WHERE total_amount < 0
```

### Test: Referential Integrity Across Models

```sql
-- tests/assert_orders_have_valid_customers.sql
-- Verify that every order references a customer that exists in the dimension table

SELECT
    o.order_id,
    o.customer_id
FROM {{ ref('fct_orders') }} o
LEFT JOIN {{ ref('dim_customers') }} c
    ON o.customer_id = c.customer_id
    AND c.is_current = TRUE
WHERE c.customer_id IS NULL
```

### Test: Date Continuity

```sql
-- tests/assert_no_date_gaps_in_events.sql
-- Check that there are no missing dates in the events table
-- A missing date might indicate a pipeline failure or data loss

WITH date_range AS (
    SELECT
        MIN(event_date) AS min_date,
        MAX(event_date) AS max_date
    FROM {{ ref('fct_events') }}
),
expected_dates AS (
    SELECT date
    FROM UNNEST(
        GENERATE_DATE_ARRAY(
            (SELECT min_date FROM date_range),
            (SELECT max_date FROM date_range)
        )
    ) AS date
),
actual_dates AS (
    SELECT DISTINCT event_date
    FROM {{ ref('fct_events') }}
)
SELECT
    e.date AS missing_date
FROM expected_dates e
LEFT JOIN actual_dates a ON e.date = a.event_date
WHERE a.event_date IS NULL
```

### Test: Row Count Within Expected Range

```sql
-- tests/assert_daily_event_count_reasonable.sql
-- Flag days where the event count is suspiciously low or high
-- Helps catch pipeline failures or data flooding

SELECT
    event_date,
    COUNT(*) AS event_count
FROM {{ ref('fct_events') }}
WHERE event_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
GROUP BY event_date
HAVING COUNT(*) < 1000    -- Too few events suggests a pipeline problem
    OR COUNT(*) > 10000000 -- Too many events suggests bad data or duplication
```

## Generic Tests

Generic tests are reusable test templates defined as macros. They accept parameters so you can apply the same test logic to multiple models and columns.

### Test: Value Must Be Positive

```sql
-- tests/generic/test_positive_value.sql
-- Generic test: assert that a column's values are all positive
-- Usage in schema.yml: tests: [{positive_value: {}}]

{% test positive_value(model, column_name) %}

SELECT
    {{ column_name }}
FROM {{ model }}
WHERE {{ column_name }} IS NOT NULL
  AND {{ column_name }} <= 0

{% endtest %}
```

Apply it in your schema file:

```yaml
# models/marts/schema.yml
models:
  - name: fct_orders
    columns:
      - name: total_amount
        tests:
          - not_null
          - positive_value    # Uses our custom generic test
      - name: quantity
        tests:
          - positive_value
```

### Test: Value Within Range

```sql
-- tests/generic/test_value_in_range.sql
-- Generic test: assert that values fall within a specified range
-- Usage: tests: [{value_in_range: {min_value: 0, max_value: 100}}]

{% test value_in_range(model, column_name, min_value, max_value) %}

SELECT
    {{ column_name }}
FROM {{ model }}
WHERE {{ column_name }} IS NOT NULL
  AND ({{ column_name }} < {{ min_value }} OR {{ column_name }} > {{ max_value }})

{% endtest %}
```

```yaml
models:
  - name: fct_orders
    columns:
      - name: discount_percent
        tests:
          - value_in_range:
              min_value: 0
              max_value: 100
      - name: rating
        tests:
          - value_in_range:
              min_value: 1
              max_value: 5
```

### Test: Column Values Match a Pattern

```sql
-- tests/generic/test_matches_pattern.sql
-- Generic test: assert that string values match a regex pattern
-- Useful for validating formats like emails, phone numbers, or IDs

{% test matches_pattern(model, column_name, pattern) %}

SELECT
    {{ column_name }}
FROM {{ model }}
WHERE {{ column_name }} IS NOT NULL
  AND NOT REGEXP_CONTAINS({{ column_name }}, r'{{ pattern }}')

{% endtest %}
```

```yaml
models:
  - name: dim_customers
    columns:
      - name: email
        tests:
          - matches_pattern:
              pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
      - name: phone
        tests:
          - matches_pattern:
              pattern: "^\\+?[0-9]{10,15}$"
```

### Test: No Duplicates on Compound Key

```sql
-- tests/generic/test_unique_combination.sql
-- Generic test: assert that a combination of columns is unique
-- Useful when no single column is unique but a combination should be

{% test unique_combination(model, combination) %}

SELECT
    {{ combination | join(', ') }},
    COUNT(*) AS duplicate_count
FROM {{ model }}
GROUP BY {{ combination | join(', ') }}
HAVING COUNT(*) > 1

{% endtest %}
```

```yaml
models:
  - name: fct_daily_metrics
    tests:
      - unique_combination:
          combination: ['metric_date', 'tenant_id', 'metric_name']
```

### Test: Freshness Check

```sql
-- tests/generic/test_freshness.sql
-- Generic test: assert that data is not stale beyond a threshold
-- Fails if the most recent record is older than max_hours_old

{% test freshness(model, column_name, max_hours_old) %}

SELECT
    MAX({{ column_name }}) AS most_recent,
    TIMESTAMP_DIFF(
        CURRENT_TIMESTAMP(),
        MAX({{ column_name }}),
        HOUR
    ) AS hours_since_update
FROM {{ model }}
HAVING TIMESTAMP_DIFF(
    CURRENT_TIMESTAMP(),
    MAX({{ column_name }}),
    HOUR
) > {{ max_hours_old }}

{% endtest %}
```

```yaml
models:
  - name: fct_events
    columns:
      - name: event_timestamp
        tests:
          - freshness:
              max_hours_old: 6  # Fail if no events in the last 6 hours
```

## Test Severity Levels

Not all test failures should block your pipeline. dbt lets you set severity levels:

```yaml
models:
  - name: fct_orders
    columns:
      - name: order_id
        tests:
          - unique:
              severity: error      # Pipeline fails on duplicates
          - not_null:
              severity: error      # Pipeline fails on nulls
      - name: discount_percent
        tests:
          - value_in_range:
              min_value: 0
              max_value: 100
              severity: warn       # Just a warning, pipeline continues
```

You can also set a threshold for failures before the test is considered failed:

```yaml
models:
  - name: fct_events
    columns:
      - name: user_id
        tests:
          - not_null:
              severity: error
              # Allow up to 10 null values before failing
              # Useful for known data quality issues you are working to fix
              config:
                error_if: ">10"
                warn_if: ">0"
```

## Storing Test Failures

By default, test results are just pass/fail. You can store the failing rows in a table for investigation:

```yaml
# dbt_project.yml
tests:
  +store_failures: true
  +schema: test_failures    # Store in a dedicated BigQuery dataset
```

With this configuration, every test that fails creates a table in the `test_failures` dataset containing the offending rows. This makes debugging much easier - instead of re-running the test manually, you can just query the failures table.

## Running Tests

```bash
# Run all tests
dbt test

# Run tests for a specific model
dbt test --select fct_orders

# Run only tests with error severity (skip warnings)
dbt test --severity error

# Run tests and store failures
dbt test --store-failures
```

## Organizing Tests in a Project

A well-organized test suite follows this structure:

```
tests/
  generic/                           # Reusable generic tests
    test_positive_value.sql
    test_value_in_range.sql
    test_matches_pattern.sql
    test_freshness.sql
  singular/                          # One-off specific tests
    assert_no_negative_revenue.sql
    assert_revenue_reconciliation.sql
    assert_no_orphan_orders.sql
models/
  staging/
    schema.yml                       # Source-level tests (not_null, unique)
  marts/
    schema.yml                       # Business-level tests (ranges, patterns)
```

Put structural tests (unique, not_null) in the schema.yml files alongside your models. Put business logic tests (reconciliation checks, cross-model validations) as singular tests. Create generic tests for patterns you find yourself repeating.

## Wrapping Up

Custom dbt tests transform your data pipeline from "hopefully correct" to "verified correct on every run." Singular tests handle one-off business rules and cross-model validations. Generic tests provide reusable templates for common patterns like range checks, freshness monitoring, and format validation. Combined with severity levels, failure thresholds, and stored failures, you get a comprehensive data quality framework that runs automatically with every dbt invocation. The time you invest in writing tests pays off the first time they catch a data quality issue before it reaches your dashboards.
