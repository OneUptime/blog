# How to Use ClickHouse with Great Expectations for Data Quality

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Great Expectations, Data Quality, Validation, Testing

Description: Connect Great Expectations to ClickHouse to define and run SQL-based data quality checks on your analytical tables as part of your data pipeline.

---

## Why Great Expectations for ClickHouse

Great Expectations (GX) is a Python-based data quality framework that lets you define expectations about your data and validate them on a schedule or in CI/CD pipelines. It generates rich documentation and data docs that show the history of validation results.

Using GX with ClickHouse adds a formal quality gate to your analytical pipeline.

## Installing Great Expectations with ClickHouse

```bash
pip install 'great-expectations<1.0' clickhouse-sqlalchemy
```

## Creating a ClickHouse Datasource

Initialize Great Expectations and configure the ClickHouse connector:

```bash
great_expectations init
great_expectations datasource new
```

Or configure programmatically:

```bash
python3 setup_gx.py
```

```text
import great_expectations as gx

context = gx.get_context()

datasource = context.sources.add_sql(
    name="clickhouse_analytics",
    connection_string="clickhouse+native://user:pass@ch.internal:9000/analytics"
)

asset = datasource.add_table_asset(name="orders", table_name="orders")
```

## Defining Expectations

Create an expectation suite for the orders table:

```text
suite = context.add_expectation_suite("orders_suite")

validator = context.get_validator(
    batch_request=asset.build_batch_request(),
    expectation_suite_name="orders_suite"
)

# Row count expectation
validator.expect_table_row_count_to_be_between(min_value=1000, max_value=10000000)

# Column completeness
validator.expect_column_values_to_not_be_null("order_id")
validator.expect_column_values_to_not_be_null("user_id")

# Value ranges
validator.expect_column_values_to_be_between("total_cents", min_value=0, max_value=100000000)

# Allowed values
validator.expect_column_values_to_be_in_set("status", ["pending","completed","cancelled","refunded"])

# Uniqueness
validator.expect_column_values_to_be_unique("order_id")

validator.save_expectation_suite(discard_failed_expectations=False)
```

## Running Validations

Run validations as part of your pipeline:

```bash
python3 run_validation.py
```

```text
results = context.run_checkpoint(checkpoint_name="daily_orders_check")

if not results["success"]:
    # Trigger alert
    import requests
    requests.post(
        "https://oneuptime.example.com/api/alert",
        json={"message": "ClickHouse orders data quality check failed", "severity": "warning"}
    )
```

## Custom SQL Expectations

For ClickHouse-specific checks, define custom SQL expectations:

```sql
-- Expect no orders with a future created_at timestamp
SELECT count() FROM orders WHERE created_at > now()
-- Expected result: 0
```

In GX, wire this up via `expect_column_max_to_be_between` (with `max_value=datetime.utcnow()`) or register a custom query expectation class that runs the SQL above.

## Generating Data Docs

Build and publish data docs to S3 for team visibility:

```bash
great_expectations docs build
aws s3 sync great_expectations/uncommitted/data_docs/ \
  s3://my-company-data-docs/clickhouse/
```

The docs show pass/fail history for each expectation over time.

## Summary

Great Expectations with ClickHouse brings a formal, documented data quality framework to your analytical pipeline, enabling team-wide visibility into data contract compliance and automated validation gates before data reaches dashboards.
