# How to Use Cloud Composer to Orchestrate Cross-Service GCP Data Pipelines End-to-End

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Composer, Airflow, Data Pipeline, Data Engineering

Description: Learn how to use Cloud Composer 2 to orchestrate end-to-end data pipelines that span multiple GCP services including Cloud Storage, BigQuery, Dataflow, and Dataproc.

---

Most real-world data pipelines on GCP are not a single service doing one thing. They involve data landing in Cloud Storage, getting processed through Dataflow, loaded into BigQuery, transformed with dbt or SQL, and then maybe exported somewhere else. Cloud Composer, which runs Apache Airflow, is the glue that holds all of this together.

In this post, I will walk through building a complete end-to-end pipeline that touches multiple GCP services, handles errors gracefully, and is structured in a way that scales as your data platform grows.

## The Pipeline We Will Build

Here is the scenario: an e-commerce company receives daily sales data files from their point-of-sale systems. The pipeline needs to:

1. Detect when new files arrive in Cloud Storage
2. Validate the file format and content
3. Run a Dataflow job to clean and transform the data
4. Load the results into BigQuery
5. Run aggregation queries in BigQuery
6. Export a summary report to Cloud Storage
7. Send a notification when everything completes

Here is how the pipeline looks:

```mermaid
graph LR
    A[GCS File Arrival] --> B[Validate File]
    B --> C[Dataflow Transform]
    C --> D[Load to BigQuery]
    D --> E[Run Aggregations]
    E --> F[Export Report]
    F --> G[Send Notification]
```

## The Complete DAG

Let me show the complete DAG first, then break down each section:

```python
# dags/daily_sales_pipeline.py
from airflow import DAG
from airflow.providers.google.cloud.sensors.gcs import GCSObjectExistenceAsyncSensor
from airflow.providers.google.cloud.operators.gcs import GCSListObjectsOperator
from airflow.providers.google.cloud.operators.dataflow import DataflowStartFlexTemplateOperator
from airflow.providers.google.cloud.operators.bigquery import (
    BigQueryInsertJobOperator,
    BigQueryCheckOperator,
)
from airflow.providers.google.cloud.transfers.gcs_to_bigquery import GCSToBigQueryOperator
from airflow.providers.google.cloud.transfers.bigquery_to_gcs import BigQueryToGCSOperator
from airflow.operators.python import PythonOperator, BranchPythonOperator
from airflow.operators.email import EmailOperator
from airflow.utils.trigger_rule import TriggerRule
from datetime import datetime, timedelta

# Configuration constants
PROJECT_ID = 'my-project'
REGION = 'us-central1'
RAW_BUCKET = 'sales-raw-data'
PROCESSED_BUCKET = 'sales-processed-data'
REPORTS_BUCKET = 'sales-reports'
BQ_DATASET = 'sales_warehouse'

default_args = {
    'owner': 'data-team',
    'retries': 2,
    'retry_delay': timedelta(minutes=10),
    'email_on_failure': True,
    'email': ['data-team@company.com'],
}

with DAG(
    'daily_sales_pipeline',
    default_args=default_args,
    description='End-to-end sales data pipeline across GCP services',
    schedule_interval='0 6 * * *',  # Run at 6 AM UTC daily
    start_date=datetime(2026, 1, 1),
    catchup=False,
    tags=['production', 'sales', 'daily'],
) as dag:

    # Step 1: Wait for the daily sales file to arrive
    wait_for_file = GCSObjectExistenceAsyncSensor(
        task_id='wait_for_sales_file',
        bucket=RAW_BUCKET,
        object='daily/{{ ds }}/sales.csv',
        poke_interval=120,
        timeout=14400,  # 4-hour timeout
    )

    # Step 2: Validate the file before processing
    def validate_file(**context):
        """Check that the file has the expected schema and row count."""
        from google.cloud import storage
        import csv
        import io

        client = storage.Client()
        bucket = client.bucket(RAW_BUCKET)
        blob = bucket.blob(f'daily/{context["ds"]}/sales.csv')
        content = blob.download_as_text()

        reader = csv.DictReader(io.StringIO(content))
        headers = reader.fieldnames

        # Verify expected columns exist
        required_columns = ['transaction_id', 'store_id', 'amount', 'timestamp']
        missing = [col for col in required_columns if col not in headers]
        if missing:
            raise ValueError(f"Missing columns: {missing}")

        # Count rows
        row_count = sum(1 for _ in reader)
        if row_count < 10:
            raise ValueError(f"File has only {row_count} rows, expected at least 10")

        context['ti'].xcom_push(key='row_count', value=row_count)
        print(f"Validation passed: {row_count} rows with correct schema")

    validate = PythonOperator(
        task_id='validate_file',
        python_callable=validate_file,
    )

    # Step 3: Run Dataflow to clean and transform the data
    transform_data = DataflowStartFlexTemplateOperator(
        task_id='transform_with_dataflow',
        project_id=PROJECT_ID,
        location=REGION,
        body={
            'launchParameter': {
                'jobName': 'sales-transform-{{ ds_nodash }}',
                'containerSpecGcsPath': f'gs://{PROCESSED_BUCKET}/templates/sales-transform',
                'parameters': {
                    'input': f'gs://{RAW_BUCKET}/daily/{{{{ ds }}}}/sales.csv',
                    'output': f'gs://{PROCESSED_BUCKET}/cleaned/{{{{ ds }}}}/',
                    'date': '{{ ds }}',
                },
                'environment': {
                    'tempLocation': f'gs://{PROCESSED_BUCKET}/temp/',
                    'maxWorkers': 10,
                },
            }
        },
    )

    # Step 4: Load cleaned data into BigQuery
    load_to_bq = GCSToBigQueryOperator(
        task_id='load_to_bigquery',
        bucket=PROCESSED_BUCKET,
        source_objects=['cleaned/{{ ds }}/*.parquet'],
        destination_project_dataset_table=f'{PROJECT_ID}.{BQ_DATASET}.sales_transactions',
        source_format='PARQUET',
        write_disposition='WRITE_APPEND',
        create_disposition='CREATE_IF_NEEDED',
        schema_fields=[
            {'name': 'transaction_id', 'type': 'STRING', 'mode': 'REQUIRED'},
            {'name': 'store_id', 'type': 'STRING', 'mode': 'REQUIRED'},
            {'name': 'amount', 'type': 'FLOAT64', 'mode': 'REQUIRED'},
            {'name': 'currency', 'type': 'STRING', 'mode': 'NULLABLE'},
            {'name': 'timestamp', 'type': 'TIMESTAMP', 'mode': 'REQUIRED'},
            {'name': 'processing_date', 'type': 'DATE', 'mode': 'REQUIRED'},
        ],
    )

    # Step 5: Run aggregation queries in BigQuery
    run_aggregations = BigQueryInsertJobOperator(
        task_id='run_daily_aggregations',
        configuration={
            'query': {
                'query': """
                    -- Aggregate daily sales by store
                    MERGE INTO `{{ params.project }}.{{ params.dataset }}.daily_store_summary` T
                    USING (
                        SELECT
                            store_id,
                            DATE('{{ ds }}') as sales_date,
                            COUNT(*) as transaction_count,
                            SUM(amount) as total_revenue,
                            AVG(amount) as avg_transaction_value
                        FROM `{{ params.project }}.{{ params.dataset }}.sales_transactions`
                        WHERE processing_date = '{{ ds }}'
                        GROUP BY store_id
                    ) S
                    ON T.store_id = S.store_id AND T.sales_date = S.sales_date
                    WHEN MATCHED THEN
                        UPDATE SET
                            transaction_count = S.transaction_count,
                            total_revenue = S.total_revenue,
                            avg_transaction_value = S.avg_transaction_value
                    WHEN NOT MATCHED THEN
                        INSERT (store_id, sales_date, transaction_count, total_revenue, avg_transaction_value)
                        VALUES (S.store_id, S.sales_date, S.transaction_count, S.total_revenue, S.avg_transaction_value)
                """,
                'useLegacySql': False,
            }
        },
        params={
            'project': PROJECT_ID,
            'dataset': BQ_DATASET,
        },
    )

    # Step 6: Data quality check
    quality_check = BigQueryCheckOperator(
        task_id='data_quality_check',
        sql=f"""
            SELECT COUNT(*) > 0
            FROM `{PROJECT_ID}.{BQ_DATASET}.daily_store_summary`
            WHERE sales_date = '{{{{ ds }}}}'
        """,
        use_legacy_sql=False,
    )

    # Step 7: Export summary report to GCS
    export_report = BigQueryToGCSOperator(
        task_id='export_summary_report',
        source_project_dataset_table=f'{PROJECT_ID}.{BQ_DATASET}.daily_store_summary',
        destination_cloud_storage_uris=[
            f'gs://{REPORTS_BUCKET}/daily/{{{{ ds }}}}/store-summary.csv'
        ],
        export_format='CSV',
        print_header=True,
    )

    # Step 8: Send completion notification
    notify_success = EmailOperator(
        task_id='notify_success',
        to='data-team@company.com',
        subject='Daily Sales Pipeline Complete - {{ ds }}',
        html_content="""
            <h3>Daily Sales Pipeline Complete</h3>
            <p>Date: {{ ds }}</p>
            <p>Report available at: gs://sales-reports/daily/{{ ds }}/store-summary.csv</p>
        """,
    )

    # Error notification with special trigger rule
    notify_failure = EmailOperator(
        task_id='notify_failure',
        to='data-team@company.com',
        subject='ALERT: Daily Sales Pipeline Failed - {{ ds }}',
        html_content='<h3>Pipeline failed. Check Airflow logs for details.</h3>',
        trigger_rule=TriggerRule.ONE_FAILED,
    )

    # Define the pipeline flow
    wait_for_file >> validate >> transform_data >> load_to_bq
    load_to_bq >> run_aggregations >> quality_check >> export_report >> notify_success

    # Failure notification can trigger from any task failure
    [validate, transform_data, load_to_bq, run_aggregations] >> notify_failure
```

## Error Handling and Retries

Cloud Composer gives you several mechanisms for handling failures. The DAG above uses a few of them:

**Task retries** are configured through `default_args`. Each task retries twice with a 10-minute delay. For Dataflow jobs, you might want a longer retry delay since the job needs time to clean up:

```python
# Override retry settings for specific tasks
transform_data = DataflowStartFlexTemplateOperator(
    task_id='transform_with_dataflow',
    retries=3,
    retry_delay=timedelta(minutes=15),
    # ... other parameters
)
```

**Trigger rules** let you run tasks based on the outcome of upstream tasks. The `notify_failure` task uses `TriggerRule.ONE_FAILED`, which means it runs if any upstream task fails.

## Parameterizing for Multiple Environments

Use Airflow variables and connections to avoid hardcoding environment-specific values:

```python
# Use Airflow variables for environment-specific configuration
from airflow.models import Variable

PROJECT_ID = Variable.get('gcp_project_id')
REGION = Variable.get('gcp_region', default_var='us-central1')
BQ_DATASET = Variable.get('sales_bq_dataset', default_var='sales_warehouse')
```

## Monitoring the Pipeline

Set up Airflow metrics export to Cloud Monitoring so you can track DAG run durations, task success rates, and queue times. Cloud Composer 2 supports this natively through environment configuration.

With a monitoring tool like OneUptime, you can set up alerting on pipeline SLAs - for example, if the daily pipeline has not completed by 10 AM, trigger an alert so the data team can investigate before stakeholders notice stale dashboards.

Building cross-service pipelines with Cloud Composer takes some upfront investment, but the payoff is a reliable, observable, and maintainable data platform that can grow with your needs.
