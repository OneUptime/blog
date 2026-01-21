# How to Orchestrate ClickHouse Pipelines with Apache Airflow

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Apache Airflow, Data Pipelines, ETL Orchestration, Workflow Automation, Data Engineering

Description: A comprehensive guide to orchestrating ClickHouse data pipelines with Apache Airflow, covering DAG patterns, operators, and production best practices.

---

Apache Airflow is the standard for orchestrating data pipelines. This guide covers integrating Airflow with ClickHouse for reliable, scheduled data transformations.

## Architecture Overview

```mermaid
graph TB
    subgraph Airflow
        A[Scheduler]
        B[Web Server]
        C[Workers]
    end

    subgraph DAGs
        D[Extract DAG]
        E[Transform DAG]
        F[Load DAG]
    end

    subgraph ClickHouse
        G[Raw Tables]
        H[Staging Tables]
        I[Analytics Tables]
    end

    subgraph Sources
        J[APIs]
        K[Databases]
        L[Files]
    end

    A --> D
    A --> E
    A --> F
    J --> D
    K --> D
    L --> D
    D --> G
    G --> E
    E --> H
    H --> F
    F --> I
```

## Setting Up Airflow with ClickHouse

### Install ClickHouse Provider

```bash
pip install apache-airflow-providers-clickhouse
```

### Configure Connection

```python
# In Airflow UI: Admin > Connections > Add
# Or via environment variable
AIRFLOW_CONN_CLICKHOUSE_DEFAULT = 'clickhouse://user:password@clickhouse.example.com:8123/analytics'
```

### Connection Configuration

```python
from airflow.models import Connection

connection = Connection(
    conn_id='clickhouse_analytics',
    conn_type='clickhouse',
    host='clickhouse.example.com',
    port=8123,
    login='airflow_user',
    password='secure_password',
    schema='analytics',
    extra={
        'secure': True,
        'verify': True
    }
)
```

## ClickHouse Operators

### Basic SQL Execution

```python
from airflow import DAG
from airflow.providers.clickhouse.operators.clickhouse import ClickHouseOperator
from datetime import datetime, timedelta

default_args = {
    'owner': 'data-team',
    'retries': 3,
    'retry_delay': timedelta(minutes=5),
}

with DAG(
    'clickhouse_etl',
    default_args=default_args,
    schedule_interval='0 2 * * *',
    start_date=datetime(2024, 1, 1),
    catchup=False,
) as dag:

    create_staging = ClickHouseOperator(
        task_id='create_staging_table',
        clickhouse_conn_id='clickhouse_analytics',
        sql="""
            CREATE TABLE IF NOT EXISTS staging_events (
                event_id UUID,
                timestamp DateTime,
                user_id UInt64,
                event_type String,
                properties String
            ) ENGINE = MergeTree()
            ORDER BY (timestamp, user_id)
        """
    )

    load_data = ClickHouseOperator(
        task_id='load_daily_events',
        clickhouse_conn_id='clickhouse_analytics',
        sql="""
            INSERT INTO staging_events
            SELECT * FROM raw_events
            WHERE toDate(timestamp) = '{{ ds }}'
        """
    )

    create_staging >> load_data
```

### Parameterized Queries

```python
from airflow.providers.clickhouse.operators.clickhouse import ClickHouseOperator

aggregate_metrics = ClickHouseOperator(
    task_id='aggregate_daily_metrics',
    clickhouse_conn_id='clickhouse_analytics',
    sql="""
        INSERT INTO daily_metrics
        SELECT
            toDate(timestamp) AS date,
            count() AS event_count,
            uniq(user_id) AS unique_users,
            countIf(event_type = 'purchase') AS purchases,
            sumIf(amount, event_type = 'purchase') AS revenue
        FROM events
        WHERE toDate(timestamp) = toDate('{{ ds }}')
        GROUP BY date
    """,
    parameters={
        'date': '{{ ds }}'
    }
)
```

## Custom ClickHouse Hook

```python
from airflow.providers.clickhouse.hooks.clickhouse import ClickHouseHook
from airflow.decorators import task

@task
def extract_metrics(execution_date):
    hook = ClickHouseHook(clickhouse_conn_id='clickhouse_analytics')

    result = hook.run(
        sql="""
            SELECT
                toDate(timestamp) AS date,
                count() AS events,
                uniq(user_id) AS users
            FROM events
            WHERE toDate(timestamp) = %(date)s
            GROUP BY date
        """,
        parameters={'date': execution_date}
    )

    return result

@task
def process_metrics(metrics):
    # Process the extracted data
    for row in metrics:
        print(f"Date: {row['date']}, Events: {row['events']}, Users: {row['users']}")
    return metrics

@task
def load_to_summary(metrics):
    hook = ClickHouseHook(clickhouse_conn_id='clickhouse_analytics')

    hook.run(
        sql="""
            INSERT INTO metrics_summary (date, events, users)
            VALUES
        """,
        parameters=metrics
    )
```

## Complete ETL Pipeline

```python
from airflow import DAG
from airflow.providers.clickhouse.operators.clickhouse import ClickHouseOperator
from airflow.operators.python import PythonOperator, BranchPythonOperator
from airflow.utils.task_group import TaskGroup
from datetime import datetime, timedelta

default_args = {
    'owner': 'data-team',
    'retries': 3,
    'retry_delay': timedelta(minutes=5),
    'execution_timeout': timedelta(hours=2),
}

with DAG(
    'clickhouse_analytics_pipeline',
    default_args=default_args,
    schedule_interval='0 3 * * *',
    start_date=datetime(2024, 1, 1),
    catchup=False,
    tags=['clickhouse', 'analytics'],
) as dag:

    # Check data availability
    check_source_data = ClickHouseOperator(
        task_id='check_source_data',
        clickhouse_conn_id='clickhouse_analytics',
        sql="""
            SELECT count() AS cnt
            FROM raw_events
            WHERE toDate(timestamp) = '{{ ds }}'
            HAVING cnt > 0
        """
    )

    with TaskGroup('staging') as staging_group:
        stage_events = ClickHouseOperator(
            task_id='stage_events',
            clickhouse_conn_id='clickhouse_analytics',
            sql="""
                INSERT INTO staging.events
                SELECT *
                FROM raw_events
                WHERE toDate(timestamp) = '{{ ds }}'
            """
        )

        stage_users = ClickHouseOperator(
            task_id='stage_users',
            clickhouse_conn_id='clickhouse_analytics',
            sql="""
                INSERT INTO staging.users
                SELECT DISTINCT user_id, max(timestamp) AS last_seen
                FROM raw_events
                WHERE toDate(timestamp) = '{{ ds }}'
                GROUP BY user_id
            """
        )

    with TaskGroup('transform') as transform_group:
        transform_events = ClickHouseOperator(
            task_id='transform_events',
            clickhouse_conn_id='clickhouse_analytics',
            sql="""
                INSERT INTO analytics.events_enriched
                SELECT
                    e.event_id,
                    e.timestamp,
                    e.user_id,
                    e.event_type,
                    u.segment AS user_segment,
                    u.country
                FROM staging.events e
                LEFT JOIN dim.users u ON e.user_id = u.user_id
                WHERE toDate(e.timestamp) = '{{ ds }}'
            """
        )

        aggregate_metrics = ClickHouseOperator(
            task_id='aggregate_metrics',
            clickhouse_conn_id='clickhouse_analytics',
            sql="""
                INSERT INTO analytics.daily_metrics
                SELECT
                    toDate(timestamp) AS date,
                    user_segment,
                    country,
                    count() AS events,
                    uniq(user_id) AS users,
                    countIf(event_type = 'purchase') AS purchases
                FROM analytics.events_enriched
                WHERE toDate(timestamp) = '{{ ds }}'
                GROUP BY date, user_segment, country
            """
        )

        transform_events >> aggregate_metrics

    # Cleanup staging
    cleanup_staging = ClickHouseOperator(
        task_id='cleanup_staging',
        clickhouse_conn_id='clickhouse_analytics',
        sql="""
            ALTER TABLE staging.events
            DELETE WHERE toDate(timestamp) < today() - 7
        """
    )

    # Optimize tables
    optimize_tables = ClickHouseOperator(
        task_id='optimize_tables',
        clickhouse_conn_id='clickhouse_analytics',
        sql="""
            OPTIMIZE TABLE analytics.events_enriched
            PARTITION '{{ macros.ds_format(ds, '%Y-%m-%d', '%Y%m') }}'
        """
    )

    check_source_data >> staging_group >> transform_group >> [cleanup_staging, optimize_tables]
```

## Data Quality Checks

```python
from airflow.providers.clickhouse.operators.clickhouse import ClickHouseOperator
from airflow.operators.python import BranchPythonOperator

def check_data_quality(**context):
    from airflow.providers.clickhouse.hooks.clickhouse import ClickHouseHook

    hook = ClickHouseHook(clickhouse_conn_id='clickhouse_analytics')

    # Check row counts
    result = hook.run("""
        SELECT
            (SELECT count() FROM staging.events WHERE toDate(timestamp) = '{{ ds }}') AS staged,
            (SELECT count() FROM analytics.events_enriched WHERE toDate(timestamp) = '{{ ds }}') AS transformed
    """)

    staged = result[0]['staged']
    transformed = result[0]['transformed']

    if transformed < staged * 0.95:
        return 'alert_data_loss'
    return 'continue_pipeline'

data_quality_check = BranchPythonOperator(
    task_id='data_quality_check',
    python_callable=check_data_quality,
)

alert_data_loss = ClickHouseOperator(
    task_id='alert_data_loss',
    clickhouse_conn_id='clickhouse_analytics',
    sql="""
        INSERT INTO alerts (timestamp, alert_type, message)
        VALUES (now(), 'DATA_LOSS', 'Potential data loss detected for {{ ds }}')
    """
)
```

## Partitioned Processing

```python
from airflow.decorators import dag, task
from datetime import datetime

@dag(
    schedule_interval='0 4 * * *',
    start_date=datetime(2024, 1, 1),
    catchup=True,
)
def clickhouse_backfill_dag():

    @task
    def get_partitions_to_process(ds):
        from airflow.providers.clickhouse.hooks.clickhouse import ClickHouseHook

        hook = ClickHouseHook(clickhouse_conn_id='clickhouse_analytics')
        result = hook.run(f"""
            SELECT DISTINCT partition
            FROM system.parts
            WHERE table = 'raw_events'
              AND partition >= '{ds}'
            ORDER BY partition
            LIMIT 10
        """)

        return [row['partition'] for row in result]

    @task
    def process_partition(partition):
        from airflow.providers.clickhouse.hooks.clickhouse import ClickHouseHook

        hook = ClickHouseHook(clickhouse_conn_id='clickhouse_analytics')
        hook.run(f"""
            INSERT INTO analytics.events_processed
            SELECT * FROM raw_events
            WHERE partition = '{partition}'
        """)

        return partition

    partitions = get_partitions_to_process('{{ ds }}')
    process_partition.expand(partition=partitions)

clickhouse_backfill_dag()
```

## Monitoring and Alerting

```python
from airflow.providers.clickhouse.operators.clickhouse import ClickHouseOperator
from airflow.providers.slack.operators.slack_webhook import SlackWebhookOperator

monitor_pipeline = ClickHouseOperator(
    task_id='monitor_pipeline_metrics',
    clickhouse_conn_id='clickhouse_analytics',
    sql="""
        INSERT INTO pipeline_metrics (
            dag_id, execution_date, task_id,
            rows_processed, duration_seconds
        )
        SELECT
            '{{ dag.dag_id }}',
            '{{ ds }}',
            '{{ task.task_id }}',
            (SELECT count() FROM analytics.events_enriched WHERE toDate(timestamp) = '{{ ds }}'),
            {{ task_instance.duration }}
    """
)

alert_on_failure = SlackWebhookOperator(
    task_id='alert_on_failure',
    http_conn_id='slack_webhook',
    message='Pipeline failed: {{ dag.dag_id }} - {{ ds }}',
    trigger_rule='one_failed',
)
```

## Conclusion

Airflow with ClickHouse enables:

1. **Scheduled ETL** with reliable execution
2. **Dependency management** between tasks
3. **Backfill capability** for historical data
4. **Data quality checks** integrated into pipelines
5. **Monitoring and alerting** for pipeline health

Use Airflow to build production-grade data pipelines that keep your ClickHouse analytics up to date.
