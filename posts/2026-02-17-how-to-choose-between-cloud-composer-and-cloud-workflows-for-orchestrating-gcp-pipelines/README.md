# How to Choose Between Cloud Composer and Cloud Workflows for Orchestrating GCP Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Composer, Cloud Workflows, Airflow, Orchestration, Data Pipelines

Description: A practical comparison of Cloud Composer and Cloud Workflows to help you choose the right orchestration tool for your GCP pipeline needs.

---

GCP gives you two orchestration services: Cloud Composer (managed Apache Airflow) and Cloud Workflows (a lightweight, serverless workflow engine). They both run multi-step processes, but they target very different complexity levels. Choosing between them comes down to how complex your pipelines are and how much infrastructure you want to manage.

## The Fundamental Difference

**Cloud Composer** runs a full Apache Airflow environment. You get a web UI, a scheduler, workers, a metadata database, and the entire Airflow ecosystem. DAGs are Python code that defines task dependencies. Composer runs on a GKE cluster.

**Cloud Workflows** is a serverless workflow execution service. You define workflows as YAML that chains together HTTP calls, GCP API operations, and conditional logic. There is no infrastructure - you deploy a workflow definition and invoke it.

Cloud Composer is heavy and powerful. Cloud Workflows is light and simple. Here is the trade-off in a table:

| Feature | Cloud Composer | Cloud Workflows |
|---------|---------------|----------------|
| Engine | Apache Airflow | Google proprietary |
| Configuration | Python DAGs | YAML/JSON |
| Infrastructure | GKE cluster (managed) | Serverless |
| Web UI | Yes (Airflow UI) | No (Cloud Console only) |
| Scheduling | Built-in (cron-based) | External (Cloud Scheduler) |
| Sensors/Triggers | Yes (wait for conditions) | Limited (polling) |
| Task retries | Configurable per task | Configurable per step |
| Variable/connection management | Built-in (Airflow Variables, Connections) | Workflow arguments, Secret Manager |
| Community operators | 2000+ Airflow operators | HTTP calls to any API |
| Startup time | Always running | Instant (per execution) |
| Minimum cost | ~$300/month | ~$0 (pay per execution) |
| Max execution time | Unlimited | 1 year |

## When to Use Cloud Composer

### Complex Data Pipelines

Cloud Composer is the right choice when you have complex DAGs with many tasks, dependencies, retries, and conditional branching:

```python
# A Cloud Composer DAG for a complex data pipeline
from airflow import DAG
from airflow.providers.google.cloud.operators.bigquery import (
    BigQueryInsertJobOperator,
    BigQueryCheckOperator
)
from airflow.providers.google.cloud.operators.dataflow import (
    DataflowStartFlexTemplateOperator
)
from airflow.providers.google.cloud.transfers.gcs_to_bigquery import (
    GCSToBigQueryOperator
)
from airflow.operators.python import BranchPythonOperator
from airflow.utils.trigger_rule import TriggerRule
from datetime import datetime, timedelta

default_args = {
    'owner': 'data-team',
    'retries': 3,
    'retry_delay': timedelta(minutes=5),
    'email_on_failure': True,
    'email': ['data-team@example.com']
}

dag = DAG(
    'daily_data_pipeline',
    default_args=default_args,
    schedule_interval='@daily',
    start_date=datetime(2026, 1, 1),
    catchup=False
)

# Step 1: Load raw data from GCS to BigQuery
load_raw_data = GCSToBigQueryOperator(
    task_id='load_raw_data',
    bucket='raw-data-bucket',
    source_objects=['data/{{ ds }}/*.parquet'],
    destination_project_dataset_table='raw.daily_events',
    source_format='PARQUET',
    write_disposition='WRITE_TRUNCATE',
    dag=dag
)

# Step 2: Data quality check
quality_check = BigQueryCheckOperator(
    task_id='quality_check',
    sql="""
        SELECT COUNT(*) > 0 as has_data,
               COUNT(DISTINCT user_id) > 100 as enough_users,
               MAX(event_timestamp) > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 2 DAY) as data_is_fresh
        FROM raw.daily_events
        WHERE DATE(event_timestamp) = '{{ ds }}'
    """,
    use_legacy_sql=False,
    dag=dag
)

# Step 3: Decide based on data volume
def check_volume(**context):
    """Branch based on data volume."""
    from google.cloud import bigquery
    client = bigquery.Client()
    result = list(client.query(f"""
        SELECT COUNT(*) as cnt FROM raw.daily_events
        WHERE DATE(event_timestamp) = '{context["ds"]}'
    """).result())
    count = result[0].cnt
    # Use Dataflow for large datasets, BigQuery SQL for small ones
    if count > 10000000:
        return 'transform_with_dataflow'
    return 'transform_with_sql'

branch = BranchPythonOperator(
    task_id='check_volume',
    python_callable=check_volume,
    dag=dag
)

# Step 4a: Transform with Dataflow for large datasets
transform_dataflow = DataflowStartFlexTemplateOperator(
    task_id='transform_with_dataflow',
    body={
        'launchParameter': {
            'jobName': 'transform-{{ ds_nodash }}',
            'containerSpecGcsPath': 'gs://templates/transform.json',
        }
    },
    location='us-central1',
    dag=dag
)

# Step 4b: Transform with BigQuery SQL for smaller datasets
transform_sql = BigQueryInsertJobOperator(
    task_id='transform_with_sql',
    configuration={
        'query': {
            'query': """
                CREATE OR REPLACE TABLE analytics.daily_summary AS
                SELECT DATE(event_timestamp) as day,
                       event_type, COUNT(*) as event_count
                FROM raw.daily_events
                WHERE DATE(event_timestamp) = '{{ ds }}'
                GROUP BY day, event_type
            """,
            'useLegacySql': False
        }
    },
    dag=dag
)

# Step 5: Final aggregation (runs after either transform path)
final_agg = BigQueryInsertJobOperator(
    task_id='final_aggregation',
    configuration={
        'query': {
            'query': "CALL analytics.update_dashboards('{{ ds }}')",
            'useLegacySql': False
        }
    },
    trigger_rule=TriggerRule.ONE_SUCCESS,  # Run if either transform succeeds
    dag=dag
)

# Define task dependencies
load_raw_data >> quality_check >> branch
branch >> [transform_dataflow, transform_sql]
[transform_dataflow, transform_sql] >> final_agg
```

### Sensor-Based Workflows

Airflow sensors wait for external conditions before proceeding:

```python
from airflow.providers.google.cloud.sensors.gcs import GCSObjectExistenceSensor

# Wait for a file to appear in GCS before processing
wait_for_file = GCSObjectExistenceSensor(
    task_id='wait_for_data_file',
    bucket='incoming-data',
    object='data/{{ ds }}/ready.flag',
    timeout=3600,  # Wait up to 1 hour
    poke_interval=60,  # Check every minute
    dag=dag
)

wait_for_file >> load_raw_data
```

### When You Need Airflow Features

- Backfilling historical data runs
- Complex dependency graphs
- Task-level retry and failure handling
- Built-in scheduling with catch-up
- Web UI for monitoring and debugging
- Connection management for external systems

## When to Use Cloud Workflows

### Simple Service Orchestration

Cloud Workflows is ideal for chaining API calls and GCP service operations:

```yaml
# Cloud Workflows - orchestrate a simple data processing pipeline
main:
  steps:
    # Step 1: Trigger a BigQuery load job
    - loadData:
        call: googleapis.bigquery.v2.jobs.insert
        args:
          projectId: ${sys.get_env("GOOGLE_CLOUD_PROJECT_ID")}
          body:
            configuration:
              load:
                sourceUris: ["gs://raw-data/daily/*.csv"]
                destinationTable:
                  projectId: ${sys.get_env("GOOGLE_CLOUD_PROJECT_ID")}
                  datasetId: "raw"
                  tableId: "daily_import"
                sourceFormat: "CSV"
                writeDisposition: "WRITE_TRUNCATE"
        result: loadJob

    # Step 2: Wait for the load job to complete
    - waitForLoad:
        call: googleapis.bigquery.v2.jobs.get
        args:
          projectId: ${sys.get_env("GOOGLE_CLOUD_PROJECT_ID")}
          jobId: ${loadJob.jobReference.jobId}
        result: jobStatus

    - checkLoadStatus:
        switch:
          - condition: ${jobStatus.status.state == "DONE"}
            next: runTransform
          - condition: ${jobStatus.status.state != "DONE"}
            next: waitDelay

    - waitDelay:
        call: sys.sleep
        args:
          seconds: 30
        next: waitForLoad

    # Step 3: Run transformation query
    - runTransform:
        call: googleapis.bigquery.v2.jobs.insert
        args:
          projectId: ${sys.get_env("GOOGLE_CLOUD_PROJECT_ID")}
          body:
            configuration:
              query:
                query: >
                  CREATE OR REPLACE TABLE analytics.summary AS
                  SELECT category, SUM(amount) as total
                  FROM raw.daily_import
                  GROUP BY category
                useLegacySql: false
        result: transformJob

    # Step 4: Send notification
    - notify:
        call: http.post
        args:
          url: https://hooks.slack.com/services/xxx
          body:
            text: "Daily data pipeline completed successfully"
```

### Event-Driven Workflows

Cloud Workflows integrates with Eventarc for event-driven execution:

```bash
# Trigger a workflow when a file is uploaded to Cloud Storage
gcloud eventarc triggers create file-upload-trigger \
    --location=us-central1 \
    --destination-workflow=process-upload \
    --destination-workflow-location=us-central1 \
    --event-filters="type=google.cloud.storage.object.v1.finalized" \
    --event-filters="bucket=incoming-data" \
    --service-account=workflow-sa@my-project.iam.gserviceaccount.com
```

### Lightweight API Orchestration

For calling multiple APIs in sequence with error handling:

```yaml
# Orchestrate a multi-step API process
main:
  params: [request]
  steps:
    - validateInput:
        switch:
          - condition: ${not("orderId" in request)}
            raise: "Missing orderId parameter"

    - getOrder:
        try:
          call: http.get
          args:
            url: ${"https://orders-api.example.com/orders/" + request.orderId}
            auth:
              type: OIDC
          result: order
        except:
          as: e
          steps:
            - handleOrderError:
                raise: ${"Failed to get order: " + e.message}

    - processPayment:
        call: http.post
        args:
          url: https://payments-api.example.com/charge
          body:
            orderId: ${request.orderId}
            amount: ${order.body.total}
          auth:
            type: OIDC
        result: payment

    - updateStatus:
        call: http.patch
        args:
          url: ${"https://orders-api.example.com/orders/" + request.orderId}
          body:
            status: "paid"
            paymentId: ${payment.body.paymentId}
          auth:
            type: OIDC

    - returnResult:
        return:
          orderId: ${request.orderId}
          paymentId: ${payment.body.paymentId}
          status: "completed"
```

## Cost Comparison

The cost difference is dramatic:

| Usage Pattern | Cloud Composer | Cloud Workflows |
|--------------|---------------|----------------|
| Environment running 24/7 | ~$300-500/month | $0 (no environment) |
| 10 workflow runs/day | Same (always running) | ~$0.05/month |
| 1000 workflow runs/day | Same (may need larger env) | ~$5/month |
| 10 complex DAGs | ~$300-800/month | Depends on steps |

Cloud Composer has a high base cost because it runs a GKE cluster, Cloud SQL instance, and other infrastructure continuously. Cloud Workflows charges per step execution (about $0.000025 per step for internal steps).

## Decision Summary

Choose **Cloud Composer** when:
- You have complex data pipelines with many interdependent tasks
- You need backfilling, catch-up, and scheduling built in
- You want sensor-based waiting for external conditions
- Your team knows Airflow and wants its ecosystem
- You need a web UI for pipeline monitoring

Choose **Cloud Workflows** when:
- You are orchestrating API calls and GCP services
- Your workflows are simple to moderate in complexity
- Cost efficiency matters (especially for low-volume workflows)
- You want serverless with zero infrastructure
- Workflows are triggered by events rather than schedules

Start with Cloud Workflows unless you know you need Airflow's features. You can always move to Cloud Composer later if your orchestration needs grow more complex.
