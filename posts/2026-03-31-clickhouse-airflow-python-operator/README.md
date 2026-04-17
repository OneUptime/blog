# How to Use ClickHouse with Airflow PythonOperator

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Airflow, PythonOperator, Orchestration, Data Pipeline

Description: Orchestrate ClickHouse data pipelines with Apache Airflow using the PythonOperator - run queries, insert data, and chain tasks with proper error handling.

---

## Why Airflow with ClickHouse?

Airflow provides scheduling, retry logic, dependency management, and observability for your ClickHouse pipelines. While there is a `clickhouse-connect` Airflow provider, the `PythonOperator` gives you full flexibility with any Python ClickHouse library.

## Setup

```bash
pip install apache-airflow clickhouse-connect
```

Store ClickHouse connection details in Airflow Connections (UI: Admin > Connections):

```text
Conn Id: clickhouse_default
Conn Type: generic
Host: clickhouse.internal
Port: 8123
Login: default
Password: secret
```

## DAG with PythonOperator Tasks

```python
# dags/clickhouse_daily_pipeline.py
from datetime import datetime, timedelta
from airflow import DAG
from airflow.providers.standard.operators.python import PythonOperator
import clickhouse_connect

def get_ch_client():
    return clickhouse_connect.get_client(
        host="clickhouse.internal",
        port=8123,
        username="default",
        password="secret"
    )

def extract_and_load(**context):
    execution_date = context["ds"]   # YYYY-MM-DD
    client = get_ch_client()

    # Example: aggregate yesterday's raw events into summary table
    client.command(f"""
        INSERT INTO event_summary
        SELECT
            toDate(event_time) AS event_date,
            event_type,
            count() AS event_count,
            countDistinct(user_id) AS unique_users
        FROM events
        WHERE toDate(event_time) = '{execution_date}'
        GROUP BY event_date, event_type
    """)
    return f"Aggregated events for {execution_date}"

def validate_results(**context):
    execution_date = context["ds"]
    client = get_ch_client()

    result = client.query(
        f"SELECT count() FROM event_summary WHERE event_date = '{execution_date}'"
    )
    count = result.first_row[0]
    if count == 0:
        raise ValueError(f"No rows found in event_summary for {execution_date}")
    print(f"Validation passed: {count} rows in event_summary")

def cleanup_raw_data(**context):
    execution_date = context["ds"]
    client = get_ch_client()
    # Delete raw events older than 90 days to manage storage
    cutoff = (datetime.strptime(execution_date, "%Y-%m-%d") - timedelta(days=90)).strftime("%Y-%m-%d")
    client.command(f"ALTER TABLE events DROP PARTITION '{cutoff[:7].replace('-', '')}'")

default_args = {
    "owner": "data-eng",
    "retries": 3,
    "retry_delay": timedelta(minutes=5),
}

with DAG(
    dag_id="clickhouse_daily_pipeline",
    default_args=default_args,
    schedule="0 2 * * *",   # 2 AM daily
    start_date=datetime(2024, 1, 1),
    catchup=False
) as dag:

    aggregate = PythonOperator(
        task_id="aggregate_events",
        python_callable=extract_and_load,
    )

    validate = PythonOperator(
        task_id="validate_results",
        python_callable=validate_results,
    )

    cleanup = PythonOperator(
        task_id="cleanup_raw_data",
        python_callable=cleanup_raw_data,
    )

    aggregate >> validate >> cleanup
```

## Passing Data Between Tasks with XCom

```python
def get_row_count(**context):
    client = get_ch_client()
    result = client.query("SELECT count() FROM events WHERE event_date = today()")
    context["ti"].xcom_push(key="row_count", value=result.first_row[0])

def alert_if_low(**context):
    count = context["ti"].xcom_pull(task_ids="get_row_count", key="row_count")
    if count < 1000:
        raise ValueError(f"Low event count: {count}")
```

## Summary

Airflow PythonOperator tasks can call `clickhouse-connect` directly to run queries, insert data, and validate results. Task dependencies and Airflow's retry logic make ClickHouse ETL pipelines resilient. XCom passes intermediate results between tasks without needing an external state store.
