# How to Build Dynamic DAGs in Cloud Composer Using Configuration Files

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Composer, Airflow, Dynamic DAGs, Python

Description: Learn how to generate Airflow DAGs dynamically from YAML or JSON configuration files in Cloud Composer for scalable pipeline management.

---

When you manage 10 pipelines, writing individual DAG files is fine. When you manage 100 or 500 pipelines that follow similar patterns, it becomes a maintenance nightmare. Dynamic DAGs solve this by generating DAG objects from configuration files at parse time. You define your pipeline patterns once in code, and drive the specific instances from YAML or JSON config.

This article shows you how to build a dynamic DAG factory in Cloud Composer that creates multiple DAGs from a single configuration file.

## Why Dynamic DAGs?

Consider a team that runs daily ETL pipelines for 50 different data sources. Each pipeline follows the same pattern: extract from a source, transform, load to BigQuery. The only differences are the source connection, table names, transformation logic, and schedule.

Without dynamic DAGs, you would write and maintain 50 nearly identical Python files. With dynamic DAGs, you write one template and configure the 50 variations in a YAML file.

## Approach 1: Single File with Multiple DAGs from YAML

The simplest dynamic DAG pattern reads a YAML config and generates DAG objects in a loop.

First, create the configuration file:

```yaml
# pipeline_config.yaml - Configuration for multiple ETL pipelines
pipelines:
  - name: sales_etl
    schedule: "0 6 * * *"
    source_table: raw_sales
    destination_dataset: analytics
    destination_table: daily_sales
    owner: sales-team
    tags: ["etl", "sales"]

  - name: marketing_etl
    schedule: "0 7 * * *"
    source_table: raw_marketing_events
    destination_dataset: analytics
    destination_table: daily_marketing
    owner: marketing-team
    tags: ["etl", "marketing"]

  - name: support_etl
    schedule: "0 8 * * *"
    source_table: raw_support_tickets
    destination_dataset: analytics
    destination_table: daily_support
    owner: support-team
    tags: ["etl", "support"]

  - name: product_etl
    schedule: "30 6 * * *"
    source_table: raw_product_events
    destination_dataset: analytics
    destination_table: daily_product
    owner: product-team
    tags: ["etl", "product"]
```

Now create the DAG factory file:

```python
# dynamic_etl_dags.py - Generate multiple ETL DAGs from a YAML config
import os
import yaml
from datetime import datetime, timedelta
from airflow import DAG
from airflow.providers.google.cloud.operators.bigquery import BigQueryInsertJobOperator
from airflow.operators.python import PythonOperator

# Load the configuration file
# The config file should be in the DAGs folder alongside this script
config_path = os.path.join(os.path.dirname(__file__), "pipeline_config.yaml")

with open(config_path, "r") as f:
    config = yaml.safe_load(f)


def create_etl_dag(pipeline_config):
    """Create an ETL DAG from a pipeline configuration dictionary."""

    dag_id = f"etl_{pipeline_config['name']}"

    default_args = {
        "owner": pipeline_config.get("owner", "data-engineering"),
        "depends_on_past": False,
        "retries": 2,
        "retry_delay": timedelta(minutes=10),
        "email_on_failure": True,
    }

    dag = DAG(
        dag_id=dag_id,
        default_args=default_args,
        description=f"ETL pipeline for {pipeline_config['name']}",
        schedule_interval=pipeline_config["schedule"],
        start_date=datetime(2025, 1, 1),
        catchup=False,
        tags=pipeline_config.get("tags", ["etl"]),
    )

    # Task 1: Extract and transform data using BigQuery SQL
    extract_transform = BigQueryInsertJobOperator(
        task_id="extract_transform",
        configuration={
            "query": {
                "query": f"""
                    SELECT *
                    FROM `my-project.raw_data.{pipeline_config['source_table']}`
                    WHERE DATE(created_at) = '{{{{ ds }}}}'
                """,
                "destinationTable": {
                    "projectId": "my-project",
                    "datasetId": pipeline_config["destination_dataset"],
                    "tableId": f"{pipeline_config['destination_table']}_{{{{ ds_nodash }}}}",
                },
                "writeDisposition": "WRITE_TRUNCATE",
                "useLegacySql": False,
            }
        },
        dag=dag,
    )

    # Task 2: Validate the output
    def validate_output(**context):
        """Check that the ETL produced expected results."""
        from google.cloud import bigquery
        client = bigquery.Client()

        ds = context["ds"]
        table_ref = (
            f"my-project.{pipeline_config['destination_dataset']}"
            f".{pipeline_config['destination_table']}_{ds.replace('-', '')}"
        )

        query = f"SELECT COUNT(*) as row_count FROM `{table_ref}`"
        result = list(client.query(query).result())
        row_count = result[0].row_count

        if row_count == 0:
            raise ValueError(f"ETL for {pipeline_config['name']} produced 0 rows on {ds}")

        print(f"Validation passed: {row_count} rows in {table_ref}")

    validate = PythonOperator(
        task_id="validate",
        python_callable=validate_output,
        dag=dag,
    )

    extract_transform >> validate

    return dag


# Generate DAGs from the configuration
for pipeline in config["pipelines"]:
    dag = create_etl_dag(pipeline)
    # Register the DAG in the global namespace so Airflow discovers it
    globals()[dag.dag_id] = dag
```

## Approach 2: JSON Config with Complex Task Dependencies

For more complex pipelines with custom task graphs, use a richer configuration format:

```json
{
    "pipelines": [
        {
            "name": "customer_360",
            "schedule": "0 5 * * *",
            "tasks": [
                {
                    "id": "extract_orders",
                    "type": "bigquery",
                    "sql_file": "sql/extract_orders.sql",
                    "dependencies": []
                },
                {
                    "id": "extract_profiles",
                    "type": "bigquery",
                    "sql_file": "sql/extract_profiles.sql",
                    "dependencies": []
                },
                {
                    "id": "join_data",
                    "type": "bigquery",
                    "sql_file": "sql/join_customer_data.sql",
                    "dependencies": ["extract_orders", "extract_profiles"]
                },
                {
                    "id": "export_to_gcs",
                    "type": "gcs_export",
                    "source_table": "analytics.customer_360",
                    "destination": "gs://exports/customer_360/",
                    "dependencies": ["join_data"]
                }
            ]
        }
    ]
}
```

The DAG factory for this format:

```python
# complex_dynamic_dags.py - Generate DAGs with complex task dependencies
import os
import json
from datetime import datetime, timedelta
from airflow import DAG
from airflow.providers.google.cloud.operators.bigquery import BigQueryInsertJobOperator
from airflow.providers.google.cloud.transfers.bigquery_to_gcs import BigQueryToGCSOperator
from airflow.operators.python import PythonOperator

config_path = os.path.join(os.path.dirname(__file__), "complex_config.json")
with open(config_path, "r") as f:
    config = json.load(f)


def read_sql_file(sql_file):
    """Read a SQL file from the DAGs directory."""
    sql_path = os.path.join(os.path.dirname(__file__), sql_file)
    with open(sql_path, "r") as f:
        return f.read()


def create_task(task_config, dag):
    """Create an Airflow task based on the task configuration."""
    task_type = task_config["type"]

    if task_type == "bigquery":
        sql = read_sql_file(task_config["sql_file"])
        return BigQueryInsertJobOperator(
            task_id=task_config["id"],
            configuration={
                "query": {
                    "query": sql,
                    "useLegacySql": False,
                }
            },
            dag=dag,
        )

    elif task_type == "gcs_export":
        return BigQueryToGCSOperator(
            task_id=task_config["id"],
            source_project_dataset_table=task_config["source_table"],
            destination_cloud_storage_uris=[
                f"{task_config['destination']}{{{{ ds }}}}/data-*.parquet"
            ],
            export_format="PARQUET",
            dag=dag,
        )

    elif task_type == "python":
        return PythonOperator(
            task_id=task_config["id"],
            python_callable=task_config["callable"],
            dag=dag,
        )

    else:
        raise ValueError(f"Unknown task type: {task_type}")


def create_complex_dag(pipeline_config):
    """Create a DAG with complex task dependencies from config."""
    dag_id = f"pipeline_{pipeline_config['name']}"

    dag = DAG(
        dag_id=dag_id,
        default_args={
            "owner": "data-engineering",
            "retries": 2,
            "retry_delay": timedelta(minutes=10),
        },
        schedule_interval=pipeline_config["schedule"],
        start_date=datetime(2025, 1, 1),
        catchup=False,
    )

    # Create all tasks
    tasks = {}
    for task_config in pipeline_config["tasks"]:
        tasks[task_config["id"]] = create_task(task_config, dag)

    # Set up dependencies
    for task_config in pipeline_config["tasks"]:
        task = tasks[task_config["id"]]
        for dep_id in task_config.get("dependencies", []):
            tasks[dep_id] >> task

    return dag


for pipeline in config["pipelines"]:
    dag = create_complex_dag(pipeline)
    globals()[dag.dag_id] = dag
```

## Approach 3: Using Airflow Variables for Configuration

Instead of config files, you can store the configuration in Airflow Variables. This lets you update pipeline configs through the UI without redeploying DAGs:

```python
# variable_driven_dags.py - Generate DAGs from Airflow Variables
from datetime import datetime, timedelta
from airflow import DAG
from airflow.models import Variable
from airflow.operators.python import PythonOperator
import json

# Read pipeline configuration from an Airflow Variable
# Set this in the UI: Admin > Variables > pipelines_config
try:
    pipelines_config = Variable.get("pipelines_config", deserialize_json=True)
except Exception:
    # Fallback if the variable does not exist yet
    pipelines_config = {"pipelines": []}


def create_dag_from_variable(config):
    """Create a DAG from a pipeline configuration stored in a Variable."""
    dag_id = f"var_{config['name']}"

    dag = DAG(
        dag_id=dag_id,
        default_args={"retries": 1},
        schedule_interval=config.get("schedule", "@daily"),
        start_date=datetime(2025, 1, 1),
        catchup=False,
        tags=config.get("tags", []),
    )

    def run_pipeline(**context):
        """Execute the pipeline logic based on configuration."""
        print(f"Running pipeline: {config['name']}")
        print(f"Source: {config.get('source')}")
        print(f"Destination: {config.get('destination')}")
        # Your pipeline logic here

    task = PythonOperator(
        task_id="run",
        python_callable=run_pipeline,
        dag=dag,
    )

    return dag


for pipeline in pipelines_config.get("pipelines", []):
    dag = create_dag_from_variable(pipeline)
    globals()[dag.dag_id] = dag
```

## Deploying Dynamic DAGs

Upload both the DAG factory file and the configuration file to Composer:

```bash
# Upload the DAG factory and config together
gcloud composer environments storage dags import \
  --environment=my-composer-env \
  --location=us-central1 \
  --source=dynamic_etl_dags.py

gcloud composer environments storage dags import \
  --environment=my-composer-env \
  --location=us-central1 \
  --source=pipeline_config.yaml

# For SQL-based pipelines, upload the SQL files too
gcloud composer environments storage dags import \
  --environment=my-composer-env \
  --location=us-central1 \
  --source=sql/
```

## Best Practices for Dynamic DAGs

1. **Keep config files small** - Do not generate hundreds of DAGs from one file. The scheduler has to parse them all, which takes time.
2. **Use meaningful DAG IDs** - Include the pipeline name in the DAG ID so they are easy to find in the UI.
3. **Handle missing configs gracefully** - If the config file does not exist or is malformed, the factory should not crash the DAG processor.
4. **Version your configs** - Store configuration files in Git alongside your DAG code.
5. **Test locally** - Use the Composer local development tool to verify that dynamic DAGs parse correctly before deploying.

## Wrapping Up

Dynamic DAGs are essential for managing large numbers of similar pipelines. The pattern is straightforward: define your pipeline template as a function, drive it from a configuration file, and generate DAG objects in a loop. Whether you use YAML, JSON, or Airflow Variables for configuration depends on your team's workflow. The key benefit is maintainability - when you need to change how all 50 ETL pipelines behave, you update the template once instead of editing 50 files.
