# How to Orchestrate Dataflow Pipelines from Cloud Composer DAGs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Composer, Dataflow, Airflow, Apache Beam

Description: Learn how to trigger, monitor, and manage Google Cloud Dataflow pipeline jobs from Cloud Composer Airflow DAGs for end-to-end data orchestration.

---

Dataflow and Cloud Composer are a powerful pairing. Dataflow handles the heavy-lifting of data processing with Apache Beam, while Composer handles the scheduling, dependency management, and orchestration. You write your Beam pipeline once, deploy it as a Dataflow template, and let Composer trigger it on schedule with the right parameters.

This article covers how to launch Dataflow jobs from Airflow DAGs, monitor their progress, handle failures, and integrate them into larger data pipelines.

## Understanding the Integration

There are two main ways to run Dataflow jobs from Composer:

1. **Dataflow templates** - Pre-built or custom templates stored in GCS. Composer passes parameters and launches the template.
2. **Flex templates** - Containerized Beam pipelines stored in Artifact Registry. More flexible than classic templates.

Both approaches use Airflow operators that handle job submission, monitoring, and status tracking.

## Method 1: Launch a Classic Dataflow Template

Google provides several pre-built Dataflow templates for common tasks. You can also create your own. Here is how to launch one from Composer:

```python
# dataflow_template_dag.py - Launch a Dataflow template from Composer
from datetime import datetime, timedelta
from airflow import DAG
from airflow.providers.google.cloud.operators.dataflow import (
    DataflowTemplatedJobStartOperator,
)

default_args = {
    "owner": "data-engineering",
    "retries": 1,
    "retry_delay": timedelta(minutes=10),
}

dag = DAG(
    dag_id="dataflow_template_pipeline",
    default_args=default_args,
    schedule_interval="0 4 * * *",
    start_date=datetime(2025, 1, 1),
    catchup=False,
    tags=["dataflow", "etl"],
)

# Launch a Google-provided template (GCS Text to BigQuery)
gcs_to_bq = DataflowTemplatedJobStartOperator(
    task_id="gcs_text_to_bigquery",
    template="gs://dataflow-templates/latest/GCS_Text_to_BigQuery",
    project_id="my-project",
    location="us-central1",
    parameters={
        "inputFilePattern": "gs://my-data-bucket/input/{{ ds }}/*.csv",
        "JSONPath": "gs://my-data-bucket/schemas/events_schema.json",
        "outputTable": "my-project:analytics.raw_events",
        "bigQueryLoadingTemporaryDirectory": "gs://my-temp-bucket/dataflow/bq_temp/",
    },
    environment={
        "tempLocation": "gs://my-temp-bucket/dataflow/temp/",
        "maxWorkers": 10,
        "machineType": "n2-standard-4",
    },
    dag=dag,
)
```

## Method 2: Launch a Custom Template

If you have built your own Dataflow template:

```python
# custom_template_dag.py - Launch a custom Dataflow template
from datetime import datetime, timedelta
from airflow import DAG
from airflow.providers.google.cloud.operators.dataflow import (
    DataflowTemplatedJobStartOperator,
)

default_args = {
    "owner": "data-engineering",
    "retries": 2,
    "retry_delay": timedelta(minutes=15),
}

dag = DAG(
    dag_id="custom_dataflow_pipeline",
    default_args=default_args,
    schedule_interval="0 2 * * *",
    start_date=datetime(2025, 1, 1),
    catchup=False,
)

# Launch a custom template stored in your GCS bucket
run_custom_pipeline = DataflowTemplatedJobStartOperator(
    task_id="run_etl_pipeline",
    template="gs://my-templates-bucket/dataflow/templates/event_processor",
    project_id="my-project",
    location="us-central1",
    job_name="event-processor-{{ ds_nodash }}",
    parameters={
        "input_topic": "projects/my-project/topics/raw-events",
        "output_table": "my-project:analytics.processed_events",
        "processing_date": "{{ ds }}",
        "window_duration": "60",
    },
    environment={
        "tempLocation": "gs://my-temp-bucket/dataflow/temp/",
        "maxWorkers": 20,
        "machineType": "n2-standard-8",
        "additionalExperiments": ["enable_stackdriver_agent_metrics"],
        "network": "my-vpc",
        "subnetwork": "regions/us-central1/subnetworks/my-subnet",
    },
    dag=dag,
)
```

## Method 3: Launch a Flex Template

Flex templates are Docker containers that package your pipeline code. They are more flexible than classic templates:

```python
# flex_template_dag.py - Launch a Dataflow Flex Template
from datetime import datetime, timedelta
from airflow import DAG
from airflow.providers.google.cloud.operators.dataflow import (
    DataflowStartFlexTemplateOperator,
)

default_args = {
    "owner": "data-engineering",
    "retries": 2,
    "retry_delay": timedelta(minutes=10),
}

dag = DAG(
    dag_id="dataflow_flex_template",
    default_args=default_args,
    schedule_interval="0 3 * * *",
    start_date=datetime(2025, 1, 1),
    catchup=False,
)

# Launch a Flex Template
run_flex_pipeline = DataflowStartFlexTemplateOperator(
    task_id="run_flex_pipeline",
    project_id="my-project",
    location="us-central1",
    body={
        "launchParameter": {
            "jobName": "flex-etl-{{ ds_nodash }}",
            "containerSpecGcsPath": "gs://my-templates-bucket/flex-templates/event-processor.json",
            "parameters": {
                "input_path": "gs://my-data-bucket/raw/{{ ds }}/",
                "output_path": "gs://my-data-bucket/processed/{{ ds }}/",
                "date": "{{ ds }}",
            },
            "environment": {
                "tempLocation": "gs://my-temp-bucket/dataflow/temp/",
                "maxWorkers": 15,
                "machineType": "n2-standard-4",
            },
        }
    },
    dag=dag,
)
```

## Method 4: Run a Beam Pipeline Directly

For Python Beam pipelines, you can run them directly without pre-building a template:

```python
# direct_beam_dag.py - Run a Python Beam pipeline directly
from datetime import datetime, timedelta
from airflow import DAG
from airflow.providers.apache.beam.operators.beam import BeamRunPythonPipelineOperator

default_args = {
    "owner": "data-engineering",
    "retries": 1,
    "retry_delay": timedelta(minutes=10),
}

dag = DAG(
    dag_id="direct_beam_pipeline",
    default_args=default_args,
    schedule_interval="0 5 * * *",
    start_date=datetime(2025, 1, 1),
    catchup=False,
)

# Run a Python Beam pipeline directly on Dataflow
run_beam = BeamRunPythonPipelineOperator(
    task_id="run_beam_pipeline",
    py_file="gs://my-bucket/pipelines/event_pipeline.py",
    runner="DataflowRunner",
    pipeline_options={
        "project": "my-project",
        "region": "us-central1",
        "temp_location": "gs://my-temp-bucket/dataflow/temp/",
        "staging_location": "gs://my-temp-bucket/dataflow/staging/",
        "max_num_workers": 10,
        "machine_type": "n2-standard-4",
        "input_date": "{{ ds }}",
        "output_table": "my-project:analytics.processed_events",
    },
    py_requirements=["apache-beam[gcp]==2.52.0", "pandas==2.1.4"],
    py_interpreter="python3",
    py_system_site_packages=False,
    dag=dag,
)
```

## Integrating Dataflow into a Larger Pipeline

In practice, Dataflow jobs are usually part of a bigger pipeline. Here is how to chain them with other tasks:

```python
# full_pipeline_dag.py - Dataflow as part of a larger orchestrated pipeline
from datetime import datetime, timedelta
from airflow import DAG
from airflow.providers.google.cloud.operators.dataflow import (
    DataflowStartFlexTemplateOperator,
)
from airflow.providers.google.cloud.operators.bigquery import (
    BigQueryInsertJobOperator,
    BigQueryCheckOperator,
)
from airflow.providers.google.cloud.sensors.gcs import GCSObjectExistenceSensor
from airflow.operators.python import PythonOperator

default_args = {
    "owner": "data-engineering",
    "retries": 2,
    "retry_delay": timedelta(minutes=10),
    "execution_timeout": timedelta(hours=3),
}

dag = DAG(
    dag_id="full_data_pipeline",
    default_args=default_args,
    schedule_interval="0 6 * * *",
    start_date=datetime(2025, 1, 1),
    catchup=False,
    tags=["dataflow", "bigquery", "production"],
)

# Step 1: Wait for input files to arrive in GCS
wait_for_files = GCSObjectExistenceSensor(
    task_id="wait_for_input_files",
    bucket="my-data-bucket",
    object="raw/{{ ds }}/_SUCCESS",
    poke_interval=300,
    timeout=7200,
    mode="reschedule",
    dag=dag,
)

# Step 2: Run Dataflow to process raw files
process_data = DataflowStartFlexTemplateOperator(
    task_id="process_with_dataflow",
    project_id="my-project",
    location="us-central1",
    body={
        "launchParameter": {
            "jobName": "process-events-{{ ds_nodash }}",
            "containerSpecGcsPath": "gs://my-templates/flex/event-processor.json",
            "parameters": {
                "input_path": "gs://my-data-bucket/raw/{{ ds }}/",
                "output_table": "my-project:staging.processed_events",
                "date": "{{ ds }}",
            },
            "environment": {
                "tempLocation": "gs://my-temp-bucket/temp/",
                "maxWorkers": 20,
            },
        }
    },
    dag=dag,
)

# Step 3: Run BigQuery transformation on the processed data
aggregate = BigQueryInsertJobOperator(
    task_id="aggregate_in_bigquery",
    configuration={
        "query": {
            "query": """
                INSERT INTO `my-project.analytics.daily_summary`
                SELECT
                    event_date,
                    event_type,
                    COUNT(*) as count,
                    COUNT(DISTINCT user_id) as unique_users
                FROM `my-project.staging.processed_events`
                WHERE event_date = '{{ ds }}'
                GROUP BY event_date, event_type
            """,
            "useLegacySql": False,
        }
    },
    project_id="my-project",
    location="US",
    dag=dag,
)

# Step 4: Data quality check
quality_check = BigQueryCheckOperator(
    task_id="quality_check",
    sql="""
        SELECT COUNT(*) > 0
        FROM `my-project.analytics.daily_summary`
        WHERE event_date = '{{ ds }}'
    """,
    use_legacy_sql=False,
    location="US",
    dag=dag,
)

# Step 5: Notify on completion
def notify_completion(**context):
    """Send completion notification."""
    print(f"Pipeline completed for {context['ds']}")

notify = PythonOperator(
    task_id="notify_completion",
    python_callable=notify_completion,
    dag=dag,
)

# Set the execution order
wait_for_files >> process_data >> aggregate >> quality_check >> notify
```

## Monitoring Dataflow Jobs from Composer

The Dataflow operators automatically monitor the job and wait for completion. You can see the Dataflow job status in several places:

1. **Airflow task logs** - The operator logs job progress and status
2. **Dataflow Console** - View the job graph, worker logs, and metrics
3. **Cloud Monitoring** - Set up alerts on Dataflow job metrics

To get the Dataflow job ID for downstream use:

```python
# Access the Dataflow job ID from downstream tasks
def check_job_details(**context):
    """Retrieve Dataflow job details from the upstream task."""
    ti = context["ti"]
    job_id = ti.xcom_pull(task_ids="process_with_dataflow")
    print(f"Dataflow job ID: {job_id}")
    # You can use this to query Dataflow metrics or logs

check = PythonOperator(
    task_id="check_job_details",
    python_callable=check_job_details,
    dag=dag,
)
```

## Handling Job Failures

Configure retry behavior and timeouts for Dataflow tasks:

```python
# Dataflow task with robust failure handling
process_data = DataflowStartFlexTemplateOperator(
    task_id="process_data",
    project_id="my-project",
    location="us-central1",
    body={...},
    # Wait for the job to complete before marking task as done
    wait_until_finished=True,
    # Cancel the Dataflow job if the Airflow task times out
    cancel_timeout=600,  # Wait 10 minutes for graceful cancellation
    dag=dag,
)
```

## Common Pitfalls

1. **Job name collisions** - Include the execution date in job names to avoid naming conflicts
2. **Template parameter types** - All Dataflow template parameters are strings, even numeric values
3. **Region mismatch** - Make sure your Dataflow job region matches your data location
4. **Timeout settings** - Dataflow jobs can run for hours; set appropriate `execution_timeout` in your task

## Wrapping Up

Orchestrating Dataflow pipelines from Cloud Composer gives you the best of both worlds: Dataflow's scalable data processing and Composer's reliable scheduling and dependency management. Whether you use classic templates, Flex templates, or direct Beam submissions, the Airflow operators handle the complexity of job submission and monitoring. Integrate Dataflow into your broader pipeline alongside BigQuery transformations, data quality checks, and notifications for a complete, production-ready data platform.
