# How to Use Great Expectations with ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Great Expectations, Data Quality, Testing, Python

Description: Learn how to integrate Great Expectations with ClickHouse to validate data quality, define expectations, and automate data pipeline testing.

---

## Why Data Quality Matters in ClickHouse

ClickHouse is often used as the backbone for analytics pipelines ingesting billions of rows. Without automated data quality checks, bad data silently corrupts dashboards and reports. Great Expectations provides a framework to define, validate, and document data quality rules that run automatically against your ClickHouse tables.

## Installing Great Expectations and the ClickHouse Connector

```bash
pip install great_expectations clickhouse-sqlalchemy sqlalchemy
```

Great Expectations connects to ClickHouse via SQLAlchemy, so you need the `clickhouse-sqlalchemy` driver.

## Setting Up a Data Context

```bash
great_expectations init
```

This creates a `great_expectations/` directory with configuration files. Next, configure a datasource pointing to ClickHouse.

```python
import great_expectations as gx

context = gx.get_context()

datasource = context.sources.add_sql(
    name="clickhouse_ds",
    connection_string="clickhouse+native://user:password@localhost:9000/analytics"
)
```

## Defining Expectations

Expectations describe what valid data looks like. Here are common ones for a ClickHouse events table:

```python
batch = datasource.add_table_asset(name="events", table_name="events").build_batch_request()
validator = context.get_validator(
    batch_request=batch,
    create_expectation_suite_with_name="events.warning"
)

# Column must exist and not be null
validator.expect_column_to_exist("event_type")
validator.expect_column_values_to_not_be_null("user_id")

# Numeric range check
validator.expect_column_values_to_be_between("response_time_ms", min_value=0, max_value=60000)

# Categorical values
validator.expect_column_values_to_be_in_set("status", ["ok", "error", "timeout"])

# Row count sanity check
validator.expect_table_row_count_to_be_between(min_value=1000, max_value=100_000_000)

validator.save_expectation_suite(discard_failed_expectations=False)
```

## Running a Checkpoint

Checkpoints tie together a datasource, expectation suite, and action list (what to do when validation fails).

```python
checkpoint = context.add_or_update_checkpoint(
    name="daily_events_check",
    validations=[{
        "batch_request": batch,
        "expectation_suite_name": "events.warning"
    }]
)
result = checkpoint.run()
print(result.success)
```

If validation fails, you can configure actions to send Slack alerts, write results to a database, or halt a pipeline.

## Using SQL-Based Custom Expectations

For complex rules, use `expect_column_values_to_match_regex` or write raw SQL expectations:

```python
validator.expect_column_values_to_match_regex(
    "email",
    r"^[^@]+@[^@]+\.[^@]+$"
)
```

For ClickHouse-specific checks (like partition counts), query `system.parts` directly in a custom expectation class.

## Integrating with Airflow

In a typical pipeline, schedule the checkpoint after data lands:

```python
from airflow.operators.python import PythonOperator

def run_ge_checkpoint():
    import great_expectations as gx
    ctx = gx.get_context()
    result = ctx.run_checkpoint("daily_events_check")
    if not result.success:
        raise ValueError("Data quality check failed")

validate_task = PythonOperator(
    task_id="validate_data",
    python_callable=run_ge_checkpoint
)
```

## Summary

Great Expectations integrates with ClickHouse through SQLAlchemy to provide automated, declarative data quality validation. Define expectations on columns, row counts, and value ranges, then run checkpoints in your pipeline to catch data issues before they reach production dashboards.
