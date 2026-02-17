# How to Schedule Dataproc Jobs with Cloud Composer Airflow DAGs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Dataproc, Cloud Composer, Airflow, Orchestration

Description: Learn how to use Cloud Composer and Apache Airflow DAGs to schedule and orchestrate Dataproc Spark jobs on a recurring basis.

---

Running Spark jobs manually is fine for development, but production pipelines need reliable scheduling. Cloud Composer, Google's managed Apache Airflow service, is the natural choice for orchestrating Dataproc jobs on GCP. You define your pipeline as a DAG (Directed Acyclic Graph), set a schedule, and Airflow handles execution, retries, and monitoring.

This guide shows you how to write Airflow DAGs that submit Spark jobs to Dataproc clusters and Dataproc Serverless, handle dependencies between jobs, and deal with failures gracefully.

## Prerequisites

You need:
- A Cloud Composer environment (version 2 or 3)
- A Dataproc cluster or configured Serverless networking
- Your Spark scripts uploaded to Cloud Storage
- The `apache-airflow-providers-google` package installed in your Composer environment (it is included by default)

## Step 1: Submit a PySpark Job to a Dataproc Cluster

The most basic pattern is submitting a single PySpark job on a schedule. Here is a DAG that runs a daily ETL job:

```python
# daily_etl_dag.py - Submit a PySpark job to Dataproc on a daily schedule
from datetime import datetime, timedelta
from airflow import DAG
from airflow.providers.google.cloud.operators.dataproc import DataprocSubmitJobOperator

# Define default arguments for the DAG
default_args = {
    "owner": "data-engineering",
    "depends_on_past": False,
    "email_on_failure": True,
    "email": ["team@example.com"],
    "retries": 2,
    "retry_delay": timedelta(minutes=5),
}

# Create the DAG with a daily schedule
dag = DAG(
    dag_id="daily_spark_etl",
    default_args=default_args,
    description="Daily ETL pipeline running Spark on Dataproc",
    schedule_interval="0 6 * * *",  # Run at 6 AM UTC daily
    start_date=datetime(2025, 1, 1),
    catchup=False,
    tags=["dataproc", "etl", "daily"],
)

# Define the Spark job configuration
spark_job = {
    "reference": {"project_id": "my-project"},
    "placement": {"cluster_name": "prod-spark-cluster"},
    "pyspark_job": {
        "main_python_file_uri": "gs://my-bucket/scripts/daily_etl.py",
        "args": [
            "--date", "{{ ds }}",
            "--output", "gs://my-bucket/processed/{{ ds }}/",
        ],
        "properties": {
            "spark.executor.memory": "8g",
            "spark.executor.instances": "10",
            "spark.sql.shuffle.partitions": "200",
        },
    },
}

# Create the task
run_etl = DataprocSubmitJobOperator(
    task_id="run_daily_etl",
    job=spark_job,
    region="us-central1",
    project_id="my-project",
    dag=dag,
)
```

Upload this file to your Composer environment's DAGs folder:

```bash
# Upload the DAG file to Cloud Composer
gcloud composer environments storage dags import \
  --environment=my-composer-env \
  --location=us-central1 \
  --source=daily_etl_dag.py
```

## Step 2: Submit to Dataproc Serverless

For serverless batch submissions, use the `DataprocCreateBatchOperator`:

```python
# serverless_etl_dag.py - Submit a PySpark job to Dataproc Serverless
from datetime import datetime, timedelta
from airflow import DAG
from airflow.providers.google.cloud.operators.dataproc import DataprocCreateBatchOperator

default_args = {
    "owner": "data-engineering",
    "retries": 2,
    "retry_delay": timedelta(minutes=5),
}

dag = DAG(
    dag_id="serverless_spark_etl",
    default_args=default_args,
    schedule_interval="0 6 * * *",
    start_date=datetime(2025, 1, 1),
    catchup=False,
)

# Define the serverless batch configuration
batch_config = {
    "pyspark_batch": {
        "main_python_file_uri": "gs://my-bucket/scripts/daily_etl.py",
        "args": ["--date", "{{ ds }}"],
    },
    "runtime_config": {
        "version": "2.1",
        "properties": {
            "spark.executor.memory": "8g",
            "spark.executor.instances": "10",
        },
    },
    "environment_config": {
        "execution_config": {
            "subnetwork_uri": "default",
        },
    },
}

# Submit the serverless batch job
run_etl = DataprocCreateBatchOperator(
    task_id="run_serverless_etl",
    batch=batch_config,
    batch_id="daily-etl-{{ ds_nodash }}-{{ run_id | replace(':', '-') | truncate(8, True, '') }}",
    region="us-central1",
    project_id="my-project",
    dag=dag,
)
```

## Step 3: Chain Multiple Dataproc Jobs

Real pipelines usually have multiple stages with dependencies. Here is a DAG with three stages:

```python
# multi_stage_dag.py - A multi-stage Spark pipeline on Dataproc
from datetime import datetime, timedelta
from airflow import DAG
from airflow.providers.google.cloud.operators.dataproc import DataprocSubmitJobOperator
from airflow.operators.dummy import DummyOperator

default_args = {
    "owner": "data-engineering",
    "retries": 2,
    "retry_delay": timedelta(minutes=10),
}

dag = DAG(
    dag_id="multi_stage_pipeline",
    default_args=default_args,
    schedule_interval="0 4 * * *",
    start_date=datetime(2025, 1, 1),
    catchup=False,
)

# Helper function to create Dataproc job configs
def make_spark_job(script_name, extra_args=None, extra_properties=None):
    """Build a Dataproc PySpark job configuration."""
    job = {
        "reference": {"project_id": "my-project"},
        "placement": {"cluster_name": "prod-spark-cluster"},
        "pyspark_job": {
            "main_python_file_uri": f"gs://my-bucket/scripts/{script_name}",
            "args": extra_args or [],
            "properties": {
                "spark.executor.memory": "8g",
                "spark.executor.instances": "10",
                **(extra_properties or {}),
            },
        },
    }
    return job

start = DummyOperator(task_id="start", dag=dag)

# Stage 1: Ingest raw data
ingest = DataprocSubmitJobOperator(
    task_id="ingest_raw_data",
    job=make_spark_job("ingest.py", ["--date", "{{ ds }}"]),
    region="us-central1",
    project_id="my-project",
    dag=dag,
)

# Stage 2: Transform and clean
transform = DataprocSubmitJobOperator(
    task_id="transform_data",
    job=make_spark_job("transform.py", ["--date", "{{ ds }}"]),
    region="us-central1",
    project_id="my-project",
    dag=dag,
)

# Stage 3: Aggregate and write to BigQuery
aggregate = DataprocSubmitJobOperator(
    task_id="aggregate_to_bigquery",
    job=make_spark_job(
        "aggregate.py",
        ["--date", "{{ ds }}"],
        {"spark.executor.instances": "20"},
    ),
    region="us-central1",
    project_id="my-project",
    dag=dag,
)

end = DummyOperator(task_id="end", dag=dag)

# Define the execution order
start >> ingest >> transform >> aggregate >> end
```

## Step 4: Create Ephemeral Clusters

For cost optimization, create a cluster at the start of the pipeline and delete it when done:

```python
# ephemeral_cluster_dag.py - Create and delete clusters around jobs
from datetime import datetime, timedelta
from airflow import DAG
from airflow.providers.google.cloud.operators.dataproc import (
    DataprocCreateClusterOperator,
    DataprocDeleteClusterOperator,
    DataprocSubmitJobOperator,
)

default_args = {
    "owner": "data-engineering",
    "retries": 1,
}

dag = DAG(
    dag_id="ephemeral_cluster_pipeline",
    default_args=default_args,
    schedule_interval="0 2 * * *",
    start_date=datetime(2025, 1, 1),
    catchup=False,
)

# Define the cluster configuration
cluster_config = {
    "master_config": {
        "num_instances": 1,
        "machine_type_uri": "n2-standard-4",
    },
    "worker_config": {
        "num_instances": 4,
        "machine_type_uri": "n2-standard-8",
    },
    "software_config": {
        "image_version": "2.1-debian11",
    },
}

CLUSTER_NAME = "ephemeral-{{ ds_nodash }}"

# Create the cluster
create_cluster = DataprocCreateClusterOperator(
    task_id="create_cluster",
    cluster_name=CLUSTER_NAME,
    cluster_config=cluster_config,
    region="us-central1",
    project_id="my-project",
    dag=dag,
)

# Run the Spark job
run_job = DataprocSubmitJobOperator(
    task_id="run_spark_job",
    job={
        "reference": {"project_id": "my-project"},
        "placement": {"cluster_name": CLUSTER_NAME},
        "pyspark_job": {
            "main_python_file_uri": "gs://my-bucket/scripts/heavy_etl.py",
            "args": ["--date", "{{ ds }}"],
        },
    },
    region="us-central1",
    project_id="my-project",
    dag=dag,
)

# Delete the cluster (runs even if the job fails)
delete_cluster = DataprocDeleteClusterOperator(
    task_id="delete_cluster",
    cluster_name=CLUSTER_NAME,
    region="us-central1",
    project_id="my-project",
    trigger_rule="all_done",  # Run even if upstream tasks fail
    dag=dag,
)

create_cluster >> run_job >> delete_cluster
```

The `trigger_rule="all_done"` on the delete task ensures the cluster is always cleaned up, even if the Spark job fails.

## Step 5: Handle Failures and Retries

Configure retry behavior and alerting for production pipelines:

```python
# Configure robust failure handling
default_args = {
    "owner": "data-engineering",
    "retries": 3,
    "retry_delay": timedelta(minutes=10),
    "retry_exponential_backoff": True,
    "max_retry_delay": timedelta(hours=1),
    "email_on_failure": True,
    "email_on_retry": False,
    "email": ["oncall@example.com"],
    "execution_timeout": timedelta(hours=2),
}
```

## Step 6: Use Airflow Variables for Configuration

Keep environment-specific settings in Airflow Variables instead of hardcoding them:

```python
# Using Airflow Variables for flexible configuration
from airflow.models import Variable

# Retrieve settings from Airflow Variables
PROJECT_ID = Variable.get("gcp_project_id")
REGION = Variable.get("dataproc_region", default_var="us-central1")
CLUSTER_NAME = Variable.get("dataproc_cluster_name")
SCRIPTS_BUCKET = Variable.get("scripts_bucket")
```

Set these variables in the Airflow UI or via the CLI:

```bash
# Set Airflow Variables through the gcloud composer command
gcloud composer environments run my-composer-env \
  --location=us-central1 \
  variables set -- gcp_project_id my-project

gcloud composer environments run my-composer-env \
  --location=us-central1 \
  variables set -- dataproc_cluster_name prod-spark-cluster
```

## Wrapping Up

Cloud Composer and Dataproc are a powerful combination for production Spark pipelines. Airflow gives you scheduling, dependency management, retries, and monitoring, while Dataproc provides the distributed compute. Start with simple single-job DAGs, then build up to multi-stage pipelines with ephemeral clusters as your confidence grows. The key patterns - cluster lifecycle management, job chaining, and failure handling - apply to pipelines of any size.
