# How to Implement Airflow Sensors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Airflow, Sensors, Data Pipelines, Workflow Orchestration, Python, ETL, Data Engineering

Description: A comprehensive guide to implementing Airflow sensors for building event-driven data pipelines that wait for external conditions before proceeding.

---

> Sensors are the patient gatekeepers of your DAGs - they wait, watch, and only let the pipeline proceed when the world is ready.

Apache Airflow sensors are specialized operators that pause workflow execution until a specific condition is met. Instead of blindly running tasks on a schedule, sensors allow your pipelines to react to real-world events: a file appearing in storage, an upstream DAG completing, an API returning the right response, or a database partition becoming available.

This guide covers the essential sensor types, configuration options, and best practices for building reliable, resource-efficient data pipelines.

---

## Understanding Sensor Types

Airflow provides several built-in sensors for common use cases:

| Sensor Type | Use Case | Waits For |
|-------------|----------|-----------|
| `FileSensor` | Local file systems | File existence |
| `S3KeySensor` | AWS S3 | Object in bucket |
| `ExternalTaskSensor` | DAG dependencies | Upstream task completion |
| `HttpSensor` | REST APIs | HTTP response condition |
| `SqlSensor` | Databases | Query returning rows |
| `TimeDeltaSensor` | Time-based | Duration to pass |
| `DateTimeSensor` | Time-based | Specific datetime |

All sensors inherit from `BaseSensorOperator` and share common parameters for controlling their behavior.

---

## FileSensor: Waiting for Local Files

The `FileSensor` monitors a filesystem path and succeeds when the file or directory exists.

```python
# file_sensor_example.py
# Demonstrates using FileSensor to wait for a data file before processing

from airflow import DAG
from airflow.sensors.filesystem import FileSensor
from airflow.operators.python import PythonOperator
from datetime import datetime, timedelta

# Define default arguments applied to all tasks in this DAG
default_args = {
    'owner': 'data-team',
    'depends_on_past': False,
    'email_on_failure': True,
    'email': ['alerts@example.com'],
    'retries': 1,
    'retry_delay': timedelta(minutes=5),
}

def process_sales_data(**context):
    """
    Process the sales data file once it arrives.
    The sensor ensures this only runs after the file exists.
    """
    file_path = '/data/incoming/sales_{{ ds }}.csv'
    # Your processing logic here
    print(f"Processing file: {file_path}")

with DAG(
    dag_id='file_sensor_pipeline',
    default_args=default_args,
    description='Wait for daily sales file and process it',
    schedule_interval='@daily',
    start_date=datetime(2026, 1, 1),
    catchup=False,
    tags=['sensors', 'file-processing'],
) as dag:

    # FileSensor waits for the sales file to appear
    # Uses fs_default connection by default (can be configured in Airflow UI)
    wait_for_file = FileSensor(
        task_id='wait_for_sales_file',
        filepath='/data/incoming/sales_{{ ds }}.csv',  # Templated path
        fs_conn_id='fs_default',  # Connection ID for filesystem
        poke_interval=60,  # Check every 60 seconds
        timeout=3600,  # Fail after 1 hour if file not found
        mode='poke',  # Keep worker slot while waiting
    )

    # This task only runs after the file exists
    process_file = PythonOperator(
        task_id='process_sales_data',
        python_callable=process_sales_data,
    )

    # Define task dependency
    wait_for_file >> process_file
```

---

## ExternalTaskSensor: Cross-DAG Dependencies

The `ExternalTaskSensor` waits for a task in another DAG to complete. This is essential for coordinating pipelines that depend on each other.

```python
# external_task_sensor_example.py
# Wait for an upstream DAG to complete before running downstream processing

from airflow import DAG
from airflow.sensors.external_task import ExternalTaskSensor
from airflow.operators.python import PythonOperator
from datetime import datetime, timedelta

default_args = {
    'owner': 'data-team',
    'retries': 2,
    'retry_delay': timedelta(minutes=5),
}

def run_aggregation(**context):
    """
    Runs aggregation after both upstream pipelines have completed.
    """
    execution_date = context['ds']
    print(f"Running aggregation for {execution_date}")
    # Aggregation logic here

with DAG(
    dag_id='aggregation_pipeline',
    default_args=default_args,
    description='Aggregate data after upstream pipelines complete',
    schedule_interval='@daily',
    start_date=datetime(2026, 1, 1),
    catchup=False,
) as dag:

    # Wait for the ETL DAG's final task to complete
    # The execution_delta accounts for DAGs running at different times
    wait_for_etl = ExternalTaskSensor(
        task_id='wait_for_etl_complete',
        external_dag_id='etl_pipeline',  # The DAG we depend on
        external_task_id='load_to_warehouse',  # Specific task to wait for
        # execution_delta: if this DAG runs at 6 AM and upstream runs at 2 AM
        execution_delta=timedelta(hours=4),
        # Alternative: use execution_date_fn for complex scheduling
        # execution_date_fn=lambda dt: dt - timedelta(hours=4),
        poke_interval=120,  # Check every 2 minutes
        timeout=7200,  # 2 hour timeout
        mode='reschedule',  # Free up worker slot between checks
        # allowed_states: only proceed if upstream succeeded
        allowed_states=['success'],
        # failed_states: fail immediately if upstream failed
        failed_states=['failed', 'skipped'],
    )

    # Wait for the validation DAG as well
    wait_for_validation = ExternalTaskSensor(
        task_id='wait_for_validation_complete',
        external_dag_id='data_validation_pipeline',
        external_task_id='quality_checks',
        execution_delta=timedelta(hours=2),
        poke_interval=120,
        timeout=7200,
        mode='reschedule',
        allowed_states=['success'],
    )

    aggregate_data = PythonOperator(
        task_id='run_aggregation',
        python_callable=run_aggregation,
    )

    # Both sensors must succeed before aggregation runs
    [wait_for_etl, wait_for_validation] >> aggregate_data
```

---

## HttpSensor: Monitoring API Endpoints

The `HttpSensor` makes HTTP requests and succeeds based on the response. Use it to wait for APIs to become available or return specific data.

```python
# http_sensor_example.py
# Wait for an external API to indicate data is ready

from airflow import DAG
from airflow.providers.http.sensors.http import HttpSensor
from airflow.providers.http.operators.http import SimpleHttpOperator
from airflow.operators.python import PythonOperator
from datetime import datetime, timedelta
import json

default_args = {
    'owner': 'data-team',
    'retries': 3,
    'retry_delay': timedelta(minutes=2),
}

def check_api_response(response):
    """
    Custom response check function.
    Returns True if the API indicates data is ready.
    The response object is a requests.Response instance.
    """
    try:
        data = response.json()
        # Check if the API says processing is complete
        is_ready = data.get('status') == 'complete'
        record_count = data.get('record_count', 0)

        if is_ready and record_count > 0:
            print(f"Data ready with {record_count} records")
            return True
        else:
            print(f"Data not ready. Status: {data.get('status')}")
            return False
    except json.JSONDecodeError:
        print("Invalid JSON response")
        return False

def process_api_data(**context):
    """Process data after API signals readiness."""
    ti = context['ti']
    # Retrieve data from XCom if needed
    print("Processing data from external API")

with DAG(
    dag_id='http_sensor_pipeline',
    default_args=default_args,
    description='Wait for external API data availability',
    schedule_interval='@hourly',
    start_date=datetime(2026, 1, 1),
    catchup=False,
) as dag:

    # HttpSensor checks the API endpoint
    # Requires an HTTP connection configured in Airflow (http_conn_id)
    check_data_ready = HttpSensor(
        task_id='check_data_ready',
        http_conn_id='external_api',  # Configure in Airflow UI
        endpoint='/api/v1/data-status',  # API endpoint path
        request_params={  # Query parameters
            'date': '{{ ds }}',
            'dataset': 'transactions',
        },
        headers={  # Request headers
            'Authorization': 'Bearer {{ var.value.api_token }}',
            'Content-Type': 'application/json',
        },
        response_check=check_api_response,  # Custom validation function
        poke_interval=300,  # Check every 5 minutes
        timeout=14400,  # 4 hour timeout
        mode='reschedule',  # Don't hold worker slot
    )

    # Fetch the actual data once it is ready
    fetch_data = SimpleHttpOperator(
        task_id='fetch_data',
        http_conn_id='external_api',
        endpoint='/api/v1/data',
        method='GET',
        data={'date': '{{ ds }}'},
        headers={'Authorization': 'Bearer {{ var.value.api_token }}'},
        response_filter=lambda response: response.json(),
        log_response=True,
    )

    process_data = PythonOperator(
        task_id='process_data',
        python_callable=process_api_data,
    )

    check_data_ready >> fetch_data >> process_data
```

---

## S3KeySensor: Watching Cloud Storage

The `S3KeySensor` monitors AWS S3 for objects, making it essential for cloud-native data pipelines.

```python
# s3_sensor_example.py
# Wait for data files to arrive in S3 before processing

from airflow import DAG
from airflow.providers.amazon.aws.sensors.s3 import S3KeySensor
from airflow.providers.amazon.aws.operators.s3 import S3CopyObjectOperator
from airflow.operators.python import PythonOperator
from datetime import datetime, timedelta

default_args = {
    'owner': 'data-team',
    'retries': 2,
    'retry_delay': timedelta(minutes=5),
}

def process_s3_data(**context):
    """
    Process data after S3 file is confirmed to exist.
    """
    bucket = 'my-data-bucket'
    key = f"raw/transactions/{{ ds }}/data.parquet"
    print(f"Processing s3://{bucket}/{key}")

with DAG(
    dag_id='s3_sensor_pipeline',
    default_args=default_args,
    description='Process data files from S3',
    schedule_interval='@daily',
    start_date=datetime(2026, 1, 1),
    catchup=False,
) as dag:

    # Wait for the raw data file to appear in S3
    wait_for_s3_file = S3KeySensor(
        task_id='wait_for_raw_data',
        aws_conn_id='aws_default',  # AWS connection in Airflow
        bucket_name='my-data-bucket',
        bucket_key='raw/transactions/{{ ds }}/data.parquet',
        # Use wildcard to match any file with a pattern
        # bucket_key='raw/transactions/{{ ds }}/*.parquet',
        # wildcard_match=True,
        poke_interval=120,  # Check every 2 minutes
        timeout=10800,  # 3 hour timeout
        mode='reschedule',  # Free worker between checks
    )

    # Wait for multiple files using wildcard matching
    wait_for_all_partitions = S3KeySensor(
        task_id='wait_for_all_partitions',
        aws_conn_id='aws_default',
        bucket_name='my-data-bucket',
        bucket_key='raw/transactions/{{ ds }}/partition_*/data.parquet',
        wildcard_match=True,  # Enable glob-style matching
        poke_interval=120,
        timeout=10800,
        mode='reschedule',
    )

    # Copy to processed location
    copy_to_processed = S3CopyObjectOperator(
        task_id='copy_to_processed',
        aws_conn_id='aws_default',
        source_bucket_name='my-data-bucket',
        source_bucket_key='raw/transactions/{{ ds }}/data.parquet',
        dest_bucket_name='my-data-bucket',
        dest_bucket_key='processed/transactions/{{ ds }}/data.parquet',
    )

    process_data = PythonOperator(
        task_id='process_data',
        python_callable=process_s3_data,
    )

    wait_for_s3_file >> wait_for_all_partitions >> copy_to_processed >> process_data
```

---

## Building Custom Sensors

When built-in sensors do not meet your needs, create custom sensors by extending `BaseSensorOperator`.

```python
# custom_sensor_example.py
# Create a custom sensor to check database record counts

from airflow.sensors.base import BaseSensorOperator
from airflow.hooks.postgres_hook import PostgresHook
from airflow.utils.decorators import apply_defaults
from airflow import DAG
from airflow.operators.python import PythonOperator
from datetime import datetime, timedelta
from typing import Any


class RecordCountSensor(BaseSensorOperator):
    """
    Custom sensor that waits until a table has at least a minimum number of records
    for a specific date partition.

    :param postgres_conn_id: Connection ID for PostgreSQL
    :param table_name: Name of the table to check
    :param date_column: Column containing the date partition
    :param min_records: Minimum number of records required
    """

    # Template fields allow Jinja templating in these parameters
    template_fields = ('table_name', 'date_column', 'target_date')

    # Define UI color for this sensor in the Airflow graph view
    ui_color = '#7c8ac9'

    @apply_defaults
    def __init__(
        self,
        postgres_conn_id: str,
        table_name: str,
        date_column: str,
        min_records: int = 1,
        target_date: str = '{{ ds }}',
        **kwargs: Any,
    ) -> None:
        super().__init__(**kwargs)
        self.postgres_conn_id = postgres_conn_id
        self.table_name = table_name
        self.date_column = date_column
        self.min_records = min_records
        self.target_date = target_date

    def poke(self, context: dict) -> bool:
        """
        The poke method is called repeatedly until it returns True.
        This is where you implement the condition check logic.

        :param context: Airflow context dictionary with execution info
        :return: True if condition is met, False otherwise
        """
        # Get the PostgreSQL hook for database connection
        hook = PostgresHook(postgres_conn_id=self.postgres_conn_id)

        # Build and execute the count query
        # Using parameterized queries to prevent SQL injection
        query = f"""
            SELECT COUNT(*) as record_count
            FROM {self.table_name}
            WHERE {self.date_column} = %s
        """

        self.log.info(f"Checking record count for {self.table_name} on {self.target_date}")

        # Execute query and fetch result
        result = hook.get_first(query, parameters=(self.target_date,))
        record_count = result[0] if result else 0

        self.log.info(f"Found {record_count} records (minimum required: {self.min_records})")

        # Return True if we have enough records
        if record_count >= self.min_records:
            self.log.info("Record count threshold met!")
            return True

        return False


class ApiHealthSensor(BaseSensorOperator):
    """
    Custom sensor that checks if an API is healthy and responsive.
    Useful for ensuring dependent services are available before processing.
    """

    template_fields = ('endpoint',)
    ui_color = '#66c2a5'

    @apply_defaults
    def __init__(
        self,
        http_conn_id: str,
        endpoint: str,
        expected_status_codes: list = None,
        response_check_key: str = None,
        response_check_value: Any = None,
        **kwargs: Any,
    ) -> None:
        super().__init__(**kwargs)
        self.http_conn_id = http_conn_id
        self.endpoint = endpoint
        self.expected_status_codes = expected_status_codes or [200]
        self.response_check_key = response_check_key
        self.response_check_value = response_check_value

    def poke(self, context: dict) -> bool:
        """Check if the API endpoint is healthy."""
        from airflow.providers.http.hooks.http import HttpHook
        import json

        hook = HttpHook(http_conn_id=self.http_conn_id, method='GET')

        try:
            self.log.info(f"Checking API health at {self.endpoint}")
            response = hook.run(self.endpoint)

            # Check status code
            if response.status_code not in self.expected_status_codes:
                self.log.warning(f"Unexpected status code: {response.status_code}")
                return False

            # Optionally check response body
            if self.response_check_key:
                try:
                    data = response.json()
                    actual_value = data.get(self.response_check_key)
                    if actual_value != self.response_check_value:
                        self.log.info(
                            f"Response check failed: {self.response_check_key}="
                            f"{actual_value}, expected {self.response_check_value}"
                        )
                        return False
                except json.JSONDecodeError:
                    self.log.warning("Could not parse JSON response")
                    return False

            self.log.info("API health check passed!")
            return True

        except Exception as e:
            self.log.warning(f"API health check failed: {str(e)}")
            return False


# Example DAG using custom sensors
default_args = {
    'owner': 'data-team',
    'retries': 2,
    'retry_delay': timedelta(minutes=5),
}

with DAG(
    dag_id='custom_sensor_pipeline',
    default_args=default_args,
    description='Pipeline using custom sensors',
    schedule_interval='@daily',
    start_date=datetime(2026, 1, 1),
    catchup=False,
) as dag:

    # Use custom record count sensor
    wait_for_data = RecordCountSensor(
        task_id='wait_for_data',
        postgres_conn_id='postgres_warehouse',
        table_name='staging.transactions',
        date_column='transaction_date',
        min_records=1000,  # Wait for at least 1000 records
        target_date='{{ ds }}',
        poke_interval=300,
        timeout=7200,
        mode='reschedule',
    )

    # Use custom API health sensor
    check_api_health = ApiHealthSensor(
        task_id='check_api_health',
        http_conn_id='downstream_api',
        endpoint='/health',
        expected_status_codes=[200],
        response_check_key='status',
        response_check_value='healthy',
        poke_interval=60,
        timeout=1800,
        mode='poke',  # Quick checks can use poke mode
    )

    process_data = PythonOperator(
        task_id='process_data',
        python_callable=lambda: print("Processing data..."),
    )

    [wait_for_data, check_api_health] >> process_data
```

---

## Understanding poke_interval and timeout

The `poke_interval` and `timeout` parameters control how sensors behave over time.

```python
# sensor_timing_example.py
# Demonstrates timing configuration for sensors

from airflow import DAG
from airflow.sensors.filesystem import FileSensor
from datetime import datetime, timedelta

with DAG(
    dag_id='sensor_timing_demo',
    start_date=datetime(2026, 1, 1),
    schedule_interval='@daily',
    catchup=False,
) as dag:

    # POKE_INTERVAL: How often to check the condition
    # - Shorter intervals: More responsive but higher resource usage
    # - Longer intervals: Less resource usage but delayed detection

    # TIMEOUT: Total time to wait before failing
    # - Should account for maximum expected delay
    # - Consider business SLAs when setting this value

    # Example: File expected within 2 hours, check every minute
    frequent_check = FileSensor(
        task_id='frequent_check',
        filepath='/data/critical_file.csv',
        poke_interval=60,  # Check every 60 seconds
        timeout=7200,  # Fail after 2 hours (7200 seconds)
        # Total pokes: 7200 / 60 = 120 checks maximum
    )

    # Example: File expected within 24 hours, check every 15 minutes
    # Good for less time-sensitive data
    infrequent_check = FileSensor(
        task_id='infrequent_check',
        filepath='/data/daily_report.csv',
        poke_interval=900,  # Check every 15 minutes (900 seconds)
        timeout=86400,  # Fail after 24 hours
        # Total pokes: 86400 / 900 = 96 checks maximum
    )

    # Example: Exponential backoff pattern using soft_fail
    # If sensor times out, downstream tasks are skipped rather than failed
    lenient_check = FileSensor(
        task_id='lenient_check',
        filepath='/data/optional_file.csv',
        poke_interval=300,
        timeout=3600,
        soft_fail=True,  # Mark as skipped instead of failed on timeout
        # Useful for optional dependencies
    )
```

---

## Mode: Poke vs Reschedule

The `mode` parameter fundamentally changes how sensors use resources.

```python
# sensor_mode_example.py
# Compare poke and reschedule modes

from airflow import DAG
from airflow.sensors.filesystem import FileSensor
from airflow.providers.amazon.aws.sensors.s3 import S3KeySensor
from datetime import datetime, timedelta

with DAG(
    dag_id='sensor_mode_comparison',
    start_date=datetime(2026, 1, 1),
    schedule_interval='@daily',
    catchup=False,
) as dag:

    # POKE MODE (default)
    # - Sensor occupies a worker slot continuously
    # - Sleeps between pokes but holds the slot
    # - Best for: Short waits, frequent checks, quick conditions
    # - Risk: Can exhaust worker pool if many sensors run simultaneously

    poke_mode_sensor = FileSensor(
        task_id='poke_mode_example',
        filepath='/data/quick_file.csv',
        poke_interval=30,  # Check every 30 seconds
        timeout=600,  # 10 minute timeout
        mode='poke',  # Holds worker slot (default behavior)
        # Good for: Expected wait < 10 minutes
        # Worker slot usage: 100% of timeout duration
    )

    # RESCHEDULE MODE
    # - Sensor releases worker slot between pokes
    # - Gets rescheduled by the scheduler for each check
    # - Best for: Long waits, infrequent checks
    # - Trade-off: Slightly higher scheduler overhead

    reschedule_mode_sensor = S3KeySensor(
        task_id='reschedule_mode_example',
        aws_conn_id='aws_default',
        bucket_name='data-bucket',
        bucket_key='daily/{{ ds }}/complete.marker',
        poke_interval=300,  # Check every 5 minutes
        timeout=14400,  # 4 hour timeout
        mode='reschedule',  # Releases worker between checks
        # Good for: Expected wait > 10 minutes
        # Worker slot usage: Only during actual poke execution
    )

    # CHOOSING THE RIGHT MODE
    #
    # Use POKE when:
    # - Expected wait time is short (< 5-10 minutes)
    # - Poke interval is very short (< 60 seconds)
    # - You need immediate response when condition is met
    # - Worker pool is not a bottleneck
    #
    # Use RESCHEDULE when:
    # - Expected wait time is long (> 10 minutes)
    # - Poke interval is long (> 2-5 minutes)
    # - You have many concurrent sensors
    # - Worker pool capacity is limited
    #
    # Rule of thumb: If (timeout / poke_interval) > 10, use reschedule

    # Example calculation:
    # timeout=3600, poke_interval=60 -> 60 pokes -> use reschedule
    # timeout=300, poke_interval=30 -> 10 pokes -> poke is fine
```

---

## Best Practices Summary

### 1. Choose the Right Mode

- **Poke mode** for short waits (under 10 minutes) or rapid checking
- **Reschedule mode** for long waits (over 10 minutes) to avoid worker exhaustion
- Rule of thumb: if `timeout / poke_interval > 10`, use reschedule

### 2. Set Appropriate Timeouts

- Base timeout on actual business SLAs, not arbitrary values
- Add buffer for occasional delays (e.g., if files usually arrive within 1 hour, set timeout to 2-3 hours)
- Use `soft_fail=True` for optional dependencies to prevent cascading failures

### 3. Tune Poke Intervals

- Balance responsiveness against resource usage
- Shorter intervals for time-critical pipelines
- Longer intervals for batch processes where minutes do not matter

### 4. Handle Failures Gracefully

- Set `email_on_failure=True` for critical sensors
- Use `allowed_states` and `failed_states` with ExternalTaskSensor
- Consider `soft_fail` for optional upstream dependencies

### 5. Use Templating

- Leverage Jinja templates (`{{ ds }}`, `{{ execution_date }}`) for dynamic paths
- Keep file paths and bucket keys parameterized for reusability

### 6. Monitor Sensor Performance

- Track sensor duration in your monitoring system
- Alert on sensors that consistently approach their timeout
- Review and adjust poke intervals based on actual data arrival patterns

### 7. Avoid Common Pitfalls

- Do not set poke_interval too low (causes excessive checks and load)
- Do not forget to handle timezone differences in ExternalTaskSensor
- Do not use poke mode for sensors expected to wait hours
- Do not create circular dependencies between DAGs

---

## Conclusion

Airflow sensors transform your pipelines from rigid schedules into responsive, event-driven workflows. By choosing the right sensor type, configuring appropriate timeouts and intervals, and selecting between poke and reschedule modes, you can build data pipelines that are both reliable and resource-efficient.

Start with the built-in sensors for common use cases, and create custom sensors when you need specialized behavior. Always monitor your sensors in production and tune their parameters based on real-world performance.

For monitoring your Airflow pipelines and getting alerted when sensors time out or DAGs fail, check out [OneUptime](https://oneuptime.com) - a comprehensive observability platform that helps you track the health of your data infrastructure.
