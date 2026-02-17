# How to Implement Sensors and Triggers in Cloud Composer 2 for Event-Driven Workflows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Composer, Airflow, Workflow Orchestration, Event-Driven

Description: Learn how to use sensors and triggers in Cloud Composer 2 to build event-driven workflows that react to file arrivals, API responses, and external system states.

---

Cloud Composer 2 runs Apache Airflow on GCP, and one of the most powerful patterns you can build with it is event-driven workflows. Instead of scheduling a DAG to run every five minutes and check if data is ready, you can use sensors and triggers to wait efficiently until conditions are met, then kick off your processing pipeline.

The difference between polling every few minutes and reacting to events might not sound like much, but when you are running dozens of DAGs on a Cloud Composer environment, it adds up fast in both cost and reliability.

## Sensors vs Triggers: What is the Difference?

**Sensors** are Airflow operators that wait for a condition to be true. They periodically check (poke) for the condition and block until it is satisfied or a timeout is reached. Classic sensors keep a worker slot occupied while waiting.

**Triggers** (also called deferrable operators) are the newer, more efficient approach. Instead of occupying a worker, a deferrable operator suspends itself and registers a trigger with the Airflow triggerer process. The triggerer checks the condition asynchronously, and when it is met, the task resumes. This frees up worker resources while waiting.

Cloud Composer 2 supports both, but you should prefer deferrable operators whenever available.

## Using a GCS Sensor to Wait for File Arrival

The most common event-driven pattern is waiting for a file to arrive in Cloud Storage before processing it. Here is how to do it with both the classic sensor and the deferrable version.

Classic sensor approach:

```python
# DAG that waits for a file in GCS before processing
from airflow import DAG
from airflow.providers.google.cloud.sensors.gcs import GCSObjectExistenceSensor
from airflow.providers.google.cloud.operators.dataflow import DataflowStartFlexTemplateOperator
from datetime import datetime, timedelta

default_args = {
    'owner': 'data-team',
    'retries': 2,
    'retry_delay': timedelta(minutes=5),
}

with DAG(
    'process_daily_upload',
    default_args=default_args,
    schedule_interval='@daily',
    start_date=datetime(2026, 1, 1),
    catchup=False,
) as dag:

    # Wait for the daily data file to appear in GCS
    wait_for_file = GCSObjectExistenceSensor(
        task_id='wait_for_daily_file',
        bucket='incoming-data-bucket',
        object='uploads/{{ ds }}/daily-report.csv',
        # Check every 5 minutes
        poke_interval=300,
        # Give up after 12 hours
        timeout=43200,
        mode='poke',  # or 'reschedule' to free up the worker between checks
    )

    # Process the file once it arrives
    process_file = DataflowStartFlexTemplateOperator(
        task_id='process_with_dataflow',
        project_id='my-project',
        location='us-central1',
        body={
            'launchParameter': {
                'jobName': 'process-daily-{{ ds_nodash }}',
                'containerSpecGcsPath': 'gs://my-templates/daily-processor',
                'parameters': {
                    'input': 'gs://incoming-data-bucket/uploads/{{ ds }}/daily-report.csv',
                    'output': 'gs://processed-data-bucket/{{ ds }}/',
                },
            }
        },
    )

    wait_for_file >> process_file
```

## Using Deferrable Operators for Efficiency

The deferrable version frees up the worker while waiting:

```python
# Same DAG but using the deferrable GCS sensor
from airflow.providers.google.cloud.sensors.gcs import GCSObjectExistenceAsyncSensor

with DAG(
    'process_daily_upload_async',
    default_args=default_args,
    schedule_interval='@daily',
    start_date=datetime(2026, 1, 1),
    catchup=False,
) as dag:

    # Deferrable sensor - does not occupy a worker while waiting
    wait_for_file = GCSObjectExistenceAsyncSensor(
        task_id='wait_for_daily_file',
        bucket='incoming-data-bucket',
        object='uploads/{{ ds }}/daily-report.csv',
        # Check interval for the triggerer
        poke_interval=60,
        timeout=43200,
    )

    process_file = DataflowStartFlexTemplateOperator(
        task_id='process_with_dataflow',
        project_id='my-project',
        location='us-central1',
        body={
            'launchParameter': {
                'jobName': 'process-daily-{{ ds_nodash }}',
                'containerSpecGcsPath': 'gs://my-templates/daily-processor',
                'parameters': {
                    'input': 'gs://incoming-data-bucket/uploads/{{ ds }}/daily-report.csv',
                    'output': 'gs://processed-data-bucket/{{ ds }}/',
                },
            }
        },
    )

    wait_for_file >> process_file
```

## Building a Custom Trigger

Sometimes the built-in sensors do not cover your use case. You can build custom triggers for Cloud Composer 2. Here is an example that waits for a BigQuery table to have new rows:

```python
# custom_triggers/bigquery_row_trigger.py
from airflow.triggers.base import BaseTrigger, TriggerEvent
from google.cloud import bigquery
import asyncio
from typing import Any, AsyncIterator

class BigQueryNewRowsTrigger(BaseTrigger):
    """Trigger that fires when new rows appear in a BigQuery table."""

    def __init__(
        self,
        project_id: str,
        dataset_id: str,
        table_id: str,
        min_row_count: int,
        poll_interval: int = 60,
    ):
        super().__init__()
        self.project_id = project_id
        self.dataset_id = dataset_id
        self.table_id = table_id
        self.min_row_count = min_row_count
        self.poll_interval = poll_interval

    def serialize(self) -> tuple[str, dict[str, Any]]:
        """Serialize the trigger for storage."""
        return (
            "custom_triggers.bigquery_row_trigger.BigQueryNewRowsTrigger",
            {
                "project_id": self.project_id,
                "dataset_id": self.dataset_id,
                "table_id": self.table_id,
                "min_row_count": self.min_row_count,
                "poll_interval": self.poll_interval,
            },
        )

    async def run(self) -> AsyncIterator[TriggerEvent]:
        """Poll BigQuery until the row count threshold is met."""
        while True:
            # Run the BigQuery check in a thread to avoid blocking
            row_count = await asyncio.get_event_loop().run_in_executor(
                None, self._check_row_count
            )

            if row_count >= self.min_row_count:
                yield TriggerEvent({
                    "status": "success",
                    "row_count": row_count,
                })
                return

            await asyncio.sleep(self.poll_interval)

    def _check_row_count(self) -> int:
        """Check the current row count in the BigQuery table."""
        client = bigquery.Client(project=self.project_id)
        table_ref = f"{self.project_id}.{self.dataset_id}.{self.table_id}"
        table = client.get_table(table_ref)
        return table.num_rows
```

And the corresponding deferrable operator that uses this trigger:

```python
# custom_operators/bigquery_row_sensor.py
from airflow.sensors.base import BaseSensorOperator
from custom_triggers.bigquery_row_trigger import BigQueryNewRowsTrigger

class BigQueryNewRowsSensor(BaseSensorOperator):
    """Deferrable sensor that waits for new rows in BigQuery."""

    def __init__(
        self,
        project_id: str,
        dataset_id: str,
        table_id: str,
        min_row_count: int,
        poll_interval: int = 60,
        **kwargs,
    ):
        super().__init__(**kwargs)
        self.project_id = project_id
        self.dataset_id = dataset_id
        self.table_id = table_id
        self.min_row_count = min_row_count
        self.poll_interval = poll_interval

    def execute(self, context):
        """Start the sensor - immediately defer to the triggerer."""
        self.defer(
            trigger=BigQueryNewRowsTrigger(
                project_id=self.project_id,
                dataset_id=self.dataset_id,
                table_id=self.table_id,
                min_row_count=self.min_row_count,
                poll_interval=self.poll_interval,
            ),
            method_name="execute_complete",
        )

    def execute_complete(self, context, event=None):
        """Called when the trigger fires."""
        if event["status"] == "success":
            self.log.info(
                f"Table has {event['row_count']} rows, threshold met"
            )
            return event
        else:
            raise Exception(f"Trigger returned unexpected status: {event}")
```

## Combining Multiple Sensors

Real-world workflows often need to wait for multiple conditions. Airflow handles this naturally with task dependencies:

```python
# DAG that waits for multiple conditions before starting processing
from airflow.providers.google.cloud.sensors.gcs import GCSObjectExistenceAsyncSensor
from airflow.providers.google.cloud.sensors.bigquery import BigQueryTableExistenceAsyncSensor
from airflow.operators.python import PythonOperator

with DAG(
    'multi_condition_pipeline',
    default_args=default_args,
    schedule_interval='@daily',
    start_date=datetime(2026, 1, 1),
    catchup=False,
) as dag:

    # Wait for the raw data file
    wait_for_raw_data = GCSObjectExistenceAsyncSensor(
        task_id='wait_for_raw_data',
        bucket='raw-data-bucket',
        object='daily/{{ ds }}/events.parquet',
        poke_interval=120,
        timeout=36000,
    )

    # Wait for the reference table to be updated
    wait_for_reference = GCSObjectExistenceAsyncSensor(
        task_id='wait_for_reference_data',
        bucket='reference-data-bucket',
        object='latest/customer-segments.csv',
        poke_interval=300,
        timeout=36000,
    )

    # Both conditions must be met before processing starts
    def start_processing(**context):
        print("All conditions met, starting data processing")

    process = PythonOperator(
        task_id='process_data',
        python_callable=start_processing,
    )

    # Both sensors must succeed before processing begins
    [wait_for_raw_data, wait_for_reference] >> process
```

## Pub/Sub-Triggered DAGs

For truly event-driven workflows where you do not want any polling at all, you can trigger DAGs from Pub/Sub messages using Cloud Functions:

```python
# Cloud Function that triggers a Composer DAG via Pub/Sub
import functions_framework
from google.auth.transport.requests import AuthorizedSession
from google.oauth2 import id_token
import json

# The Airflow web server URL from your Composer environment
AIRFLOW_URL = 'https://your-composer-environment-url.composer.googleusercontent.com'

@functions_framework.cloud_event
def trigger_dag(cloud_event):
    """Triggered by a Pub/Sub message to start an Airflow DAG."""
    # Decode the Pub/Sub message
    message_data = json.loads(
        cloud_event.data['message']['data'].decode('base64')
    )

    dag_id = message_data.get('dag_id', 'default_pipeline')
    conf = message_data.get('conf', {})

    # Get an authenticated session for the Airflow API
    authed_session = AuthorizedSession(
        id_token.fetch_id_token_credentials(AIRFLOW_URL)
    )

    # Trigger the DAG via the Airflow REST API
    response = authed_session.post(
        f'{AIRFLOW_URL}/api/v1/dags/{dag_id}/dagRuns',
        json={
            'conf': conf,
        },
    )

    print(f"DAG {dag_id} triggered: {response.status_code}")
```

## Reschedule Mode vs Poke Mode

If you cannot use deferrable operators, at least use `mode='reschedule'` instead of `mode='poke'` on your sensors. In reschedule mode, the sensor releases its worker slot between poke attempts:

```python
# Reschedule mode frees the worker between checks
wait_for_file = GCSObjectExistenceSensor(
    task_id='wait_for_file',
    bucket='my-bucket',
    object='data/{{ ds }}/input.csv',
    poke_interval=300,
    timeout=43200,
    mode='reschedule',  # Releases the worker between pokes
)
```

This is especially important on Cloud Composer 2 where you pay for the resources your environment uses. Deferrable operators are even better because they use the lightweight triggerer process instead of a full worker, but reschedule mode is a solid improvement over the default poke mode.

Monitoring sensor wait times and trigger efficiency in your Cloud Composer environment is important for keeping costs under control. A tool like OneUptime can help you track how long sensors wait on average and identify DAGs where switching to deferrable operators would save the most resources.
