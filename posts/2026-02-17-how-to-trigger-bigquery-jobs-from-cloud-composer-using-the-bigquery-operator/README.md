# How to Trigger BigQuery Jobs from Cloud Composer Using the BigQuery Operator

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Composer, BigQuery, Airflow, SQL

Description: Use Cloud Composer's BigQuery operators to schedule and orchestrate BigQuery queries, data loads, and table management tasks in Airflow DAGs.

---

BigQuery is the workhorse of most GCP data platforms, and Cloud Composer is how you schedule and orchestrate work against it. The Airflow BigQuery operators let you run queries, create tables, load data, export results, and check for table existence - all from your DAGs.

This article covers the most useful BigQuery operators, shows practical examples for common patterns, and explains how to handle errors and optimize performance.

## The Key BigQuery Operators

The `apache-airflow-providers-google` package includes several BigQuery operators:

- `BigQueryInsertJobOperator` - The primary operator for running queries, loads, and exports
- `BigQueryCheckOperator` - Run a query and fail if the result is falsy
- `BigQueryValueCheckOperator` - Check a query result against an expected value
- `BigQueryGetDataOperator` - Retrieve query results as Python objects
- `BigQueryTableExistenceSensor` - Wait for a table or partition to exist
- `BigQueryCreateEmptyTableOperator` - Create a new table with a specified schema

## Running a BigQuery Query

The `BigQueryInsertJobOperator` is the go-to operator for running SQL queries:

```python
# bq_query_dag.py - Run BigQuery queries from Cloud Composer
from datetime import datetime, timedelta
from airflow import DAG
from airflow.providers.google.cloud.operators.bigquery import BigQueryInsertJobOperator

default_args = {
    "owner": "data-engineering",
    "retries": 2,
    "retry_delay": timedelta(minutes=5),
}

dag = DAG(
    dag_id="bigquery_daily_etl",
    default_args=default_args,
    schedule_interval="0 6 * * *",
    start_date=datetime(2025, 1, 1),
    catchup=False,
    tags=["bigquery", "etl"],
)

# Run a query that writes results to a destination table
daily_aggregation = BigQueryInsertJobOperator(
    task_id="daily_aggregation",
    configuration={
        "query": {
            "query": """
                SELECT
                    DATE(event_timestamp) as event_date,
                    event_type,
                    COUNT(*) as event_count,
                    COUNT(DISTINCT user_id) as unique_users
                FROM `my-project.raw_data.events`
                WHERE DATE(event_timestamp) = '{{ ds }}'
                GROUP BY event_date, event_type
            """,
            "destinationTable": {
                "projectId": "my-project",
                "datasetId": "analytics",
                "tableId": "daily_events_{{ ds_nodash }}",
            },
            "writeDisposition": "WRITE_TRUNCATE",
            "useLegacySql": False,
        }
    },
    project_id="my-project",
    location="US",
    dag=dag,
)
```

## Running Queries from SQL Files

For complex queries, keep the SQL in separate files rather than embedding it in the DAG:

```sql
-- sql/daily_revenue.sql
-- Calculate daily revenue by product category
SELECT
    DATE(order_timestamp) as order_date,
    product_category,
    SUM(order_total) as total_revenue,
    COUNT(DISTINCT order_id) as order_count,
    AVG(order_total) as avg_order_value
FROM `my-project.raw_data.orders`
WHERE DATE(order_timestamp) = '{{ ds }}'
    AND order_status = 'completed'
GROUP BY order_date, product_category
```

Reference the SQL file in your DAG:

```python
# Read SQL from a file and execute it
import os

def read_sql(filename):
    """Read a SQL file from the DAGs/sql directory."""
    sql_dir = os.path.join(os.path.dirname(__file__), "sql")
    with open(os.path.join(sql_dir, filename), "r") as f:
        return f.read()

daily_revenue = BigQueryInsertJobOperator(
    task_id="daily_revenue",
    configuration={
        "query": {
            "query": read_sql("daily_revenue.sql"),
            "destinationTable": {
                "projectId": "my-project",
                "datasetId": "analytics",
                "tableId": "daily_revenue",
            },
            "writeDisposition": "WRITE_APPEND",
            "useLegacySql": False,
            "timePartitioning": {
                "type": "DAY",
                "field": "order_date",
            },
        }
    },
    project_id="my-project",
    location="US",
    dag=dag,
)
```

## Data Quality Checks

Use the check operators to validate your data after transformations:

```python
# Data quality checks using BigQuery operators
from airflow.providers.google.cloud.operators.bigquery import (
    BigQueryCheckOperator,
    BigQueryValueCheckOperator,
)

# Check that the daily aggregation produced rows
check_row_count = BigQueryCheckOperator(
    task_id="check_row_count",
    sql="""
        SELECT COUNT(*) > 0
        FROM `my-project.analytics.daily_events_{{ ds_nodash }}`
    """,
    use_legacy_sql=False,
    location="US",
    dag=dag,
)

# Check that unique users count is within expected range
check_unique_users = BigQueryValueCheckOperator(
    task_id="check_unique_users",
    sql="""
        SELECT COUNT(DISTINCT user_id)
        FROM `my-project.raw_data.events`
        WHERE DATE(event_timestamp) = '{{ ds }}'
    """,
    pass_value=1000,  # Expected approximate value
    tolerance=0.5,    # Allow 50% deviation
    use_legacy_sql=False,
    location="US",
    dag=dag,
)

# Check for null values in critical columns
check_nulls = BigQueryCheckOperator(
    task_id="check_no_null_users",
    sql="""
        SELECT COUNT(*) = 0
        FROM `my-project.analytics.daily_events_{{ ds_nodash }}`
        WHERE user_id IS NULL
    """,
    use_legacy_sql=False,
    location="US",
    dag=dag,
)
```

## Waiting for Upstream Data

Use sensors to wait for tables or partitions to be available before processing:

```python
# Wait for upstream data to be available
from airflow.providers.google.cloud.sensors.bigquery import BigQueryTableExistenceSensor

# Wait for a specific partition to exist
wait_for_data = BigQueryTableExistenceSensor(
    task_id="wait_for_raw_events",
    project_id="my-project",
    dataset_id="raw_data",
    table_id="events${{ ds_nodash }}",  # Dollar sign for partition decorator
    poke_interval=300,       # Check every 5 minutes
    timeout=7200,            # Give up after 2 hours
    mode="reschedule",       # Free up the worker slot while waiting
    dag=dag,
)

# The sensor must succeed before the ETL runs
wait_for_data >> daily_aggregation >> check_row_count
```

## Building a Complete ETL Pipeline

Here is a full example putting everything together:

```python
# complete_bq_etl.py - A complete BigQuery ETL pipeline
from datetime import datetime, timedelta
from airflow import DAG
from airflow.providers.google.cloud.operators.bigquery import (
    BigQueryInsertJobOperator,
    BigQueryCheckOperator,
)
from airflow.providers.google.cloud.sensors.bigquery import BigQueryTableExistenceSensor
from airflow.operators.python import PythonOperator

default_args = {
    "owner": "data-engineering",
    "retries": 2,
    "retry_delay": timedelta(minutes=10),
    "execution_timeout": timedelta(hours=2),
}

dag = DAG(
    dag_id="complete_bq_etl",
    default_args=default_args,
    schedule_interval="0 7 * * *",
    start_date=datetime(2025, 1, 1),
    catchup=False,
    tags=["bigquery", "etl", "production"],
)

# Step 1: Wait for source data
wait_for_events = BigQueryTableExistenceSensor(
    task_id="wait_for_events",
    project_id="my-project",
    dataset_id="raw_data",
    table_id="events${{ ds_nodash }}",
    poke_interval=300,
    timeout=7200,
    mode="reschedule",
    dag=dag,
)

# Step 2: Run the main transformation
transform = BigQueryInsertJobOperator(
    task_id="transform",
    configuration={
        "query": {
            "query": """
                CREATE OR REPLACE TABLE `my-project.analytics.user_daily_summary`
                PARTITION BY event_date
                CLUSTER BY user_id AS
                SELECT
                    DATE(event_timestamp) as event_date,
                    user_id,
                    COUNTIF(event_type = 'page_view') as page_views,
                    COUNTIF(event_type = 'click') as clicks,
                    COUNTIF(event_type = 'purchase') as purchases,
                    SUM(IF(event_type = 'purchase', revenue, 0)) as total_revenue
                FROM `my-project.raw_data.events`
                WHERE DATE(event_timestamp) = '{{ ds }}'
                GROUP BY event_date, user_id
            """,
            "useLegacySql": False,
        }
    },
    project_id="my-project",
    location="US",
    dag=dag,
)

# Step 3: Data quality checks (run in parallel)
check_rows = BigQueryCheckOperator(
    task_id="check_rows_exist",
    sql="""
        SELECT COUNT(*) > 0
        FROM `my-project.analytics.user_daily_summary`
        WHERE event_date = '{{ ds }}'
    """,
    use_legacy_sql=False,
    location="US",
    dag=dag,
)

check_revenue = BigQueryCheckOperator(
    task_id="check_revenue_positive",
    sql="""
        SELECT SUM(total_revenue) >= 0
        FROM `my-project.analytics.user_daily_summary`
        WHERE event_date = '{{ ds }}'
    """,
    use_legacy_sql=False,
    location="US",
    dag=dag,
)

# Step 4: Notify on completion
def send_completion_notification(**context):
    """Send a notification that the pipeline completed."""
    ds = context["ds"]
    print(f"BigQuery ETL completed successfully for {ds}")
    # Add Slack/email notification here

notify = PythonOperator(
    task_id="notify",
    python_callable=send_completion_notification,
    dag=dag,
)

# Define the execution order
wait_for_events >> transform >> [check_rows, check_revenue] >> notify
```

## Handling Large Result Sets with XCom

If you need to use query results in downstream tasks:

```python
# Get query results and use them in downstream tasks
from airflow.providers.google.cloud.operators.bigquery import BigQueryGetDataOperator

get_top_users = BigQueryGetDataOperator(
    task_id="get_top_users",
    dataset_id="analytics",
    table_id="user_daily_summary",
    max_results=10,
    selected_fields="user_id,total_revenue",
    dag=dag,
)

def process_top_users(**context):
    """Process the top users from the BigQuery results."""
    ti = context["ti"]
    results = ti.xcom_pull(task_ids="get_top_users")
    for row in results:
        print(f"User: {row[0]}, Revenue: {row[1]}")

process = PythonOperator(
    task_id="process_top_users",
    python_callable=process_top_users,
    dag=dag,
)

get_top_users >> process
```

## Performance Tips

1. **Use partitioned tables** - Always include partition filters in your queries to avoid full table scans
2. **Set query priority** - Use `"priority": "BATCH"` for non-urgent queries to reduce costs
3. **Use the `reschedule` mode for sensors** - This frees worker slots while waiting
4. **Set appropriate timeouts** - Use `execution_timeout` on tasks to prevent runaway queries
5. **Use `WRITE_TRUNCATE` for idempotent loads** - This makes re-runs safe

## Wrapping Up

The BigQuery operators in Cloud Composer cover virtually every BigQuery operation you need in a data pipeline. The `BigQueryInsertJobOperator` handles queries, loads, and exports. The check operators validate data quality. And the sensors wait for upstream data. Together, they give you a complete toolkit for building reliable, well-tested BigQuery pipelines that run on schedule.
