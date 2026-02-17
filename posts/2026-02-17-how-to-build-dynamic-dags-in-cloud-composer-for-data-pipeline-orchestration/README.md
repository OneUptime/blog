# How to Build Dynamic DAGs in Cloud Composer for Data Pipeline Orchestration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Composer, Airflow, Dynamic DAGs, Data Pipelines

Description: Learn how to build dynamic DAGs in Cloud Composer that generate pipeline tasks programmatically based on configuration, database queries, or external metadata.

---

Static Airflow DAGs work fine when your pipeline has a fixed number of tasks that rarely change. But real-world data pipelines are rarely that simple. You might need to process a different set of database tables each day, run tasks for each customer account, or generate pipeline stages based on a configuration file that changes weekly. Dynamic DAGs handle this by generating tasks programmatically at parse time.

I started using dynamic DAGs in Cloud Composer when I needed to build an ETL pipeline that processed data from over 200 source tables. Maintaining a separate task for each table in a static DAG would have been a maintenance nightmare. Instead, I generate the tasks from a configuration file, and adding a new source table is just adding a line to the config.

## How Dynamic DAGs Work in Airflow

Airflow parses DAG files every 30 seconds (configurable) to detect changes. During parsing, your Python code executes and generates the DAG object. This means you can use any Python logic - loops, conditionals, reading files, querying databases - to construct your DAG dynamically.

The key constraint is that DAG generation must be deterministic for a given input. If your DAG structure changes randomly between parses, Airflow gets confused about task states and dependencies.

## Dynamic Tasks from a Configuration File

The simplest approach is reading a YAML or JSON configuration file:

```python
# dags/dynamic_from_config.py
# Generate DAG tasks from a YAML configuration file
import yaml
from datetime import datetime
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.providers.google.cloud.operators.bigquery import BigQueryInsertJobOperator

# Load the configuration file from the DAGs folder
# In Cloud Composer, this file lives in the dags/ bucket
import os
config_path = os.path.join(os.path.dirname(__file__), "config", "etl_tables.yaml")

with open(config_path, "r") as f:
    config = yaml.safe_load(f)

# The config file looks like:
# tables:
#   - name: users
#     source: raw_data.users
#     destination: analytics.dim_users
#     schedule: daily
#     transform_sql: sql/users_transform.sql
#   - name: orders
#     source: raw_data.orders
#     destination: analytics.fact_orders
#     schedule: daily
#     transform_sql: sql/orders_transform.sql

default_args = {
    "owner": "data-engineering",
    "start_date": datetime(2026, 1, 1),
    "retries": 2,
}

with DAG(
    dag_id="dynamic_etl_pipeline",
    default_args=default_args,
    schedule_interval="@daily",
    catchup=False,
    tags=["etl", "dynamic"],
) as dag:

    # Generate a task for each table in the configuration
    for table_config in config.get("tables", []):
        table_name = table_config["name"]

        # Read the SQL template for this table
        sql_path = os.path.join(
            os.path.dirname(__file__), table_config["transform_sql"]
        )

        extract_task = BigQueryInsertJobOperator(
            task_id=f"extract_{table_name}",
            configuration={
                "query": {
                    "query": f"SELECT * FROM `{table_config['source']}`",
                    "useLegacySql": False,
                    "destinationTable": {
                        "projectId": "my-project",
                        "datasetId": "staging",
                        "tableId": f"stg_{table_name}",
                    },
                    "writeDisposition": "WRITE_TRUNCATE",
                }
            },
        )

        transform_task = BigQueryInsertJobOperator(
            task_id=f"transform_{table_name}",
            configuration={
                "query": {
                    "query": open(sql_path).read() if os.path.exists(sql_path) else f"SELECT * FROM `staging.stg_{table_name}`",
                    "useLegacySql": False,
                    "destinationTable": {
                        "projectId": "my-project",
                        "datasetId": table_config["destination"].split(".")[0],
                        "tableId": table_config["destination"].split(".")[1],
                    },
                    "writeDisposition": "WRITE_TRUNCATE",
                }
            },
        )

        # Set dependencies
        extract_task >> transform_task
```

## Dynamic DAGs from Database Metadata

Generate tasks based on what exists in your database:

```python
# dags/dynamic_from_metadata.py
# Generate tasks dynamically by querying metadata tables
from datetime import datetime
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.providers.google.cloud.hooks.bigquery import BigQueryHook

def get_active_pipelines():
    """Query a metadata table to get the list of active pipelines."""
    hook = BigQueryHook(gcp_conn_id="google_cloud_default")
    # Read from a configuration table in BigQuery
    sql = """
        SELECT pipeline_id, source_table, target_table, transform_type
        FROM `my-project.metadata.pipeline_config`
        WHERE is_active = TRUE
        ORDER BY pipeline_id
    """
    result = hook.get_pandas_df(sql)
    return result.to_dict("records")

# Get the pipeline configurations at parse time
# This runs every time Airflow parses the DAG file
try:
    pipelines = get_active_pipelines()
except Exception:
    # Fallback to empty list if metadata query fails
    # This prevents the DAG from disappearing during transient errors
    pipelines = []

def run_pipeline(pipeline_config, **context):
    """Execute a single pipeline based on its configuration."""
    print(f"Running pipeline: {pipeline_config['pipeline_id']}")
    print(f"Source: {pipeline_config['source_table']}")
    print(f"Target: {pipeline_config['target_table']}")
    # Add your pipeline logic here

default_args = {
    "owner": "data-engineering",
    "start_date": datetime(2026, 1, 1),
    "retries": 1,
}

with DAG(
    dag_id="metadata_driven_pipeline",
    default_args=default_args,
    schedule_interval="@daily",
    catchup=False,
    tags=["dynamic", "metadata-driven"],
) as dag:

    for pipeline in pipelines:
        task = PythonOperator(
            task_id=f"pipeline_{pipeline['pipeline_id']}",
            python_callable=run_pipeline,
            op_kwargs={"pipeline_config": pipeline},
        )
```

## Generating Multiple DAGs from One File

Sometimes you need entirely separate DAGs for different entities:

```python
# dags/multi_dag_generator.py
# Generate multiple DAGs from a single Python file
from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.providers.google.cloud.operators.dataproc import DataprocSubmitJobOperator

# Customer configurations - each gets their own DAG
customers = [
    {"id": "acme", "schedule": "0 6 * * *", "sla_hours": 2, "priority": "high"},
    {"id": "globex", "schedule": "0 8 * * *", "sla_hours": 4, "priority": "medium"},
    {"id": "initech", "schedule": "0 10 * * *", "sla_hours": 6, "priority": "low"},
    {"id": "umbrella", "schedule": "0 7 * * *", "sla_hours": 3, "priority": "high"},
]

def create_customer_dag(customer):
    """Factory function that creates a DAG for a specific customer."""

    default_args = {
        "owner": "data-engineering",
        "start_date": datetime(2026, 1, 1),
        "retries": 3 if customer["priority"] == "high" else 1,
        "retry_delay": timedelta(minutes=5),
        "sla": timedelta(hours=customer["sla_hours"]),
    }

    dag = DAG(
        dag_id=f"customer_etl_{customer['id']}",
        default_args=default_args,
        schedule_interval=customer["schedule"],
        catchup=False,
        tags=["customer-etl", customer["priority"]],
        description=f"ETL pipeline for customer {customer['id']}",
    )

    with dag:
        extract = PythonOperator(
            task_id="extract_data",
            python_callable=lambda cid=customer["id"]: print(f"Extracting for {cid}"),
        )

        transform = DataprocSubmitJobOperator(
            task_id="transform_data",
            project_id="my-project",
            region="us-central1",
            job={
                "pyspark_job": {
                    "main_python_file_uri": f"gs://my-bucket/scripts/transform.py",
                    "args": [f"--customer={customer['id']}"],
                },
                "placement": {"cluster_name": "etl-cluster"},
            },
        )

        validate = PythonOperator(
            task_id="validate_output",
            python_callable=lambda cid=customer["id"]: print(f"Validating for {cid}"),
        )

        extract >> transform >> validate

    return dag

# Generate a DAG for each customer
# The globals() trick registers each DAG with Airflow
for customer in customers:
    dag_id = f"customer_etl_{customer['id']}"
    globals()[dag_id] = create_customer_dag(customer)
```

## Using TaskGroup for Organized Dynamic Tasks

When you have many dynamic tasks, use TaskGroups to keep the UI clean:

```python
# dags/dynamic_with_taskgroups.py
# Dynamic tasks organized into TaskGroups for readability
from datetime import datetime
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.utils.task_group import TaskGroup

data_sources = {
    "web": ["clickstream", "page_views", "sessions"],
    "mobile": ["app_events", "crashes", "installs"],
    "backend": ["api_logs", "errors", "performance"],
}

default_args = {
    "owner": "data-engineering",
    "start_date": datetime(2026, 1, 1),
}

with DAG(
    dag_id="grouped_dynamic_pipeline",
    default_args=default_args,
    schedule_interval="@daily",
    catchup=False,
) as dag:

    start = PythonOperator(
        task_id="start",
        python_callable=lambda: print("Pipeline starting"),
    )

    end = PythonOperator(
        task_id="end",
        python_callable=lambda: print("Pipeline complete"),
    )

    # Create a TaskGroup for each data source category
    for source_name, tables in data_sources.items():
        with TaskGroup(group_id=f"process_{source_name}") as source_group:
            for table in tables:
                extract = PythonOperator(
                    task_id=f"extract_{table}",
                    python_callable=lambda t=table, s=source_name: print(
                        f"Extracting {s}.{t}"
                    ),
                )
                load = PythonOperator(
                    task_id=f"load_{table}",
                    python_callable=lambda t=table, s=source_name: print(
                        f"Loading {s}.{t}"
                    ),
                )
                extract >> load

        start >> source_group >> end
```

## Dynamic Task Mapping (Airflow 2.3+)

Cloud Composer 2 supports dynamic task mapping, which generates tasks at runtime instead of parse time:

```python
# dags/dynamic_task_mapping.py
# Use dynamic task mapping for runtime-determined task counts
from datetime import datetime
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.decorators import task

default_args = {
    "owner": "data-engineering",
    "start_date": datetime(2026, 1, 1),
}

with DAG(
    dag_id="dynamic_task_mapping_example",
    default_args=default_args,
    schedule_interval="@daily",
    catchup=False,
) as dag:

    @task
    def get_partitions(**context):
        """Determine at runtime which partitions to process."""
        # This could query a database or list files in GCS
        execution_date = context["ds"]
        return [
            {"partition": f"{execution_date}/part_{i}", "priority": i % 3}
            for i in range(10)
        ]

    @task
    def process_partition(partition_info):
        """Process a single partition. This task is mapped dynamically."""
        print(f"Processing partition: {partition_info['partition']}")
        return {"status": "success", "partition": partition_info["partition"]}

    @task
    def summarize(results):
        """Aggregate results from all dynamic tasks."""
        success_count = sum(1 for r in results if r["status"] == "success")
        print(f"Processed {success_count}/{len(results)} partitions successfully")

    # Dynamic task mapping: process_partition runs once per item
    # returned by get_partitions
    partitions = get_partitions()
    results = process_partition.expand(partition_info=partitions)
    summarize(results)
```

## Summary

Dynamic DAGs in Cloud Composer let you build data pipelines that adapt to changing requirements without manual DAG file updates. Generate tasks from configuration files for maintainability, from database metadata for self-service, or use factory functions to create multiple DAGs from a single file. TaskGroups keep the Airflow UI manageable when you have many generated tasks, and dynamic task mapping in Airflow 2.3+ lets you defer task generation to runtime for truly dynamic workloads. The key best practice is making sure your DAG generation is deterministic and handles errors gracefully - if the configuration source is unavailable, your DAG should degrade gracefully rather than disappear from the Airflow UI.
