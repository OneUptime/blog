# How to Write Effective Airflow DAGs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Airflow, DAG, Data Engineering, Workflow, ETL, Python, Scheduling, Apache Airflow

Description: Learn how to write effective Apache Airflow DAGs with best practices for task dependencies, operators, error handling, and testing.

---

> Apache Airflow has become the de facto standard for orchestrating data pipelines. Writing effective DAGs requires understanding not just the syntax, but the patterns and practices that make pipelines reliable, maintainable, and efficient.

This guide covers everything from basic DAG structure to advanced techniques like dynamic DAG generation and performance optimization. Whether you are building your first pipeline or refining existing workflows, these practices will help you write better Airflow DAGs.

---

## Prerequisites

Before we begin, ensure you have:
- Python 3.8 or higher
- Apache Airflow 2.x installed
- Basic understanding of Python and data pipelines
- A monitoring solution like [OneUptime](https://oneuptime.com) for observability

---

## DAG Structure and Best Practices

A well-structured DAG is easy to understand, maintain, and debug. Start with a clean template that follows Airflow conventions.

### Basic DAG Template

```python
# dags/example_dag.py
from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.operators.bash import BashOperator

# Define default arguments applied to all tasks
# These provide consistent behavior across the DAG
default_args = {
    'owner': 'data-team',
    'depends_on_past': False,
    'email': ['alerts@example.com'],
    'email_on_failure': True,
    'email_on_retry': False,
    'retries': 3,
    'retry_delay': timedelta(minutes=5),
}

# Create the DAG with clear naming and documentation
# The dag_id should be descriptive and follow a naming convention
with DAG(
    dag_id='etl_sales_daily',
    default_args=default_args,
    description='Daily ETL pipeline for sales data',
    schedule_interval='0 6 * * *',  # Run at 6 AM daily
    start_date=datetime(2026, 1, 1),
    catchup=False,  # Disable backfilling on DAG creation
    tags=['etl', 'sales', 'production'],
    max_active_runs=1,  # Prevent concurrent runs
) as dag:

    # Define tasks here
    pass
```

### Naming Conventions

Follow consistent naming patterns to make DAGs discoverable:

```python
# Good: Clear, descriptive names with prefixes
dag_id = 'etl_customer_data_daily'
dag_id = 'ml_model_training_weekly'
dag_id = 'report_sales_summary_monthly'

# Bad: Vague or inconsistent names
dag_id = 'my_dag'
dag_id = 'process_stuff'
dag_id = 'dag1'
```

---

## Task Dependencies and Branching

Defining clear task dependencies is crucial for correct execution order and parallelization.

### Basic Dependencies

```python
from airflow.operators.python import PythonOperator

def extract_data():
    print("Extracting data from source")
    return {"records": 100}

def transform_data():
    print("Transforming data")
    return {"transformed": 100}

def load_data():
    print("Loading data to warehouse")

with DAG(...) as dag:

    # Create task instances
    extract = PythonOperator(
        task_id='extract_data',
        python_callable=extract_data,
    )

    transform = PythonOperator(
        task_id='transform_data',
        python_callable=transform_data,
    )

    load = PythonOperator(
        task_id='load_data',
        python_callable=load_data,
    )

    # Set dependencies - transform runs after extract, load after transform
    extract >> transform >> load

    # Alternative syntax for complex dependencies
    # extract.set_downstream(transform)
    # transform.set_downstream(load)
```

### Parallel and Fan-out Dependencies

```python
from airflow.operators.python import PythonOperator
from airflow.operators.empty import EmptyOperator

with DAG(...) as dag:

    start = EmptyOperator(task_id='start')
    end = EmptyOperator(task_id='end')

    # Tasks that can run in parallel
    extract_users = PythonOperator(
        task_id='extract_users',
        python_callable=lambda: print("Extracting users"),
    )

    extract_orders = PythonOperator(
        task_id='extract_orders',
        python_callable=lambda: print("Extracting orders"),
    )

    extract_products = PythonOperator(
        task_id='extract_products',
        python_callable=lambda: print("Extracting products"),
    )

    # Fan-out: start triggers multiple parallel tasks
    # Fan-in: all tasks must complete before end
    start >> [extract_users, extract_orders, extract_products] >> end
```

### Conditional Branching

Use BranchPythonOperator to choose execution paths at runtime:

```python
from airflow.operators.python import BranchPythonOperator, PythonOperator
from airflow.operators.empty import EmptyOperator

def choose_branch(**context):
    """Decide which branch to execute based on runtime conditions"""
    execution_date = context['execution_date']

    # Run full load on Mondays, incremental otherwise
    if execution_date.weekday() == 0:
        return 'full_load'
    return 'incremental_load'

with DAG(...) as dag:

    branch = BranchPythonOperator(
        task_id='choose_load_type',
        python_callable=choose_branch,
    )

    full_load = PythonOperator(
        task_id='full_load',
        python_callable=lambda: print("Running full load"),
    )

    incremental_load = PythonOperator(
        task_id='incremental_load',
        python_callable=lambda: print("Running incremental load"),
    )

    # Join point after branching
    # trigger_rule='none_failed_min_one_success' ensures this runs
    # even when one branch is skipped
    complete = EmptyOperator(
        task_id='complete',
        trigger_rule='none_failed_min_one_success',
    )

    branch >> [full_load, incremental_load] >> complete
```

---

## Common Operators

Airflow provides operators for various tasks. Choose the right operator for each use case.

### PythonOperator

The most flexible operator for running Python code:

```python
from airflow.operators.python import PythonOperator

def process_data(data_source, batch_size, **context):
    """Process data with configurable parameters"""
    # Access execution context
    execution_date = context['execution_date']
    task_instance = context['ti']

    print(f"Processing {data_source} with batch size {batch_size}")
    print(f"Execution date: {execution_date}")

    # Return value is automatically pushed to XCom
    return {"processed_records": 1000, "status": "success"}

with DAG(...) as dag:

    process = PythonOperator(
        task_id='process_data',
        python_callable=process_data,
        # Pass arguments to the callable
        op_kwargs={
            'data_source': 'postgresql',
            'batch_size': 1000,
        },
    )
```

### BashOperator

Execute shell commands and scripts:

```python
from airflow.operators.bash import BashOperator

with DAG(...) as dag:

    # Simple command
    check_disk = BashOperator(
        task_id='check_disk_space',
        bash_command='df -h /data',
    )

    # Command with Jinja templating
    # {{ ds }} is the execution date in YYYY-MM-DD format
    run_script = BashOperator(
        task_id='run_etl_script',
        bash_command='python /opt/scripts/etl.py --date {{ ds }}',
    )

    # Command with environment variables
    export_data = BashOperator(
        task_id='export_data',
        bash_command='./export.sh',
        env={
            'OUTPUT_PATH': '/data/exports/{{ ds }}',
            'FORMAT': 'parquet',
        },
    )
```

### Sensors

Sensors wait for external conditions before proceeding:

```python
from airflow.sensors.filesystem import FileSensor
from airflow.sensors.external_task import ExternalTaskSensor
from airflow.providers.http.sensors.http import HttpSensor
from datetime import timedelta

with DAG(...) as dag:

    # Wait for a file to appear
    wait_for_file = FileSensor(
        task_id='wait_for_data_file',
        filepath='/data/incoming/sales_{{ ds }}.csv',
        poke_interval=60,  # Check every 60 seconds
        timeout=3600,  # Timeout after 1 hour
        mode='poke',  # Use 'reschedule' for long waits to free worker
    )

    # Wait for another DAG to complete
    wait_for_upstream = ExternalTaskSensor(
        task_id='wait_for_upstream_dag',
        external_dag_id='upstream_data_pipeline',
        external_task_id='final_task',
        execution_delta=timedelta(hours=0),  # Same execution date
        timeout=7200,
        mode='reschedule',  # Free worker while waiting
    )

    # Wait for an API to be available
    wait_for_api = HttpSensor(
        task_id='wait_for_api',
        http_conn_id='api_connection',
        endpoint='/health',
        response_check=lambda response: response.status_code == 200,
        poke_interval=30,
        timeout=600,
    )
```

---

## XCom for Task Communication

XCom (cross-communication) allows tasks to share small amounts of data.

### Pushing and Pulling XCom Values

```python
from airflow.operators.python import PythonOperator

def extract_task(**context):
    """Extract data and push results to XCom"""
    data = {
        'record_count': 1500,
        'file_path': '/data/extracted/sales_20260127.parquet',
        'checksum': 'abc123',
    }

    # Method 1: Return value is automatically pushed with key 'return_value'
    return data

def transform_task(**context):
    """Pull data from upstream task and process it"""
    ti = context['ti']

    # Pull the return value from extract_task
    extracted_data = ti.xcom_pull(task_ids='extract', key='return_value')

    print(f"Processing {extracted_data['record_count']} records")
    print(f"File: {extracted_data['file_path']}")

    # Push multiple values with custom keys
    ti.xcom_push(key='transformed_count', value=1450)
    ti.xcom_push(key='output_path', value='/data/transformed/sales.parquet')

    return {'status': 'transformed'}

def load_task(**context):
    """Pull from multiple upstream tasks"""
    ti = context['ti']

    # Pull specific key from transform task
    output_path = ti.xcom_pull(task_ids='transform', key='output_path')
    transformed_count = ti.xcom_pull(task_ids='transform', key='transformed_count')

    # Pull from multiple tasks at once
    all_results = ti.xcom_pull(task_ids=['extract', 'transform'], key='return_value')

    print(f"Loading {transformed_count} records from {output_path}")

with DAG(...) as dag:

    extract = PythonOperator(
        task_id='extract',
        python_callable=extract_task,
    )

    transform = PythonOperator(
        task_id='transform',
        python_callable=transform_task,
    )

    load = PythonOperator(
        task_id='load',
        python_callable=load_task,
    )

    extract >> transform >> load
```

### XCom Best Practices

```python
# Good: Small metadata and references
return {
    'file_path': 's3://bucket/data/file.parquet',
    'record_count': 10000,
    'schema_version': '2.0',
}

# Bad: Passing large datasets through XCom
# XCom is stored in the metadata database and has size limits
return large_dataframe.to_dict()  # Avoid this

# Better: Store data externally, pass reference
def process_large_data(**context):
    # Process and save to external storage
    output_path = 's3://bucket/processed/data.parquet'
    df.to_parquet(output_path)

    # Only pass the reference
    return {'output_path': output_path, 'row_count': len(df)}
```

---

## Variables and Connections

Use Airflow Variables and Connections to manage configuration securely.

### Working with Variables

```python
from airflow.models import Variable

def task_with_variables(**context):
    # Get a single variable
    api_key = Variable.get('api_key')

    # Get with default value
    batch_size = Variable.get('batch_size', default_var=1000)

    # Get JSON variable and deserialize
    config = Variable.get('etl_config', deserialize_json=True)
    # config = {'source': 'postgres', 'target': 'bigquery', 'tables': [...]}

    print(f"Running with batch size: {batch_size}")
    print(f"Source: {config['source']}")

# In DAG definition, use Jinja templating for variables
with DAG(...) as dag:

    run_etl = BashOperator(
        task_id='run_etl',
        # Access variable in template
        bash_command='python etl.py --env {{ var.value.environment }}',
    )

    # Access JSON variable in template
    configure = BashOperator(
        task_id='configure',
        bash_command='echo {{ var.json.etl_config.source }}',
    )
```

### Working with Connections

```python
from airflow.hooks.base import BaseHook
from airflow.providers.postgres.hooks.postgres import PostgresHook

def task_with_connection(**context):
    # Get connection details
    conn = BaseHook.get_connection('my_postgres')
    print(f"Host: {conn.host}")
    print(f"Schema: {conn.schema}")

    # Use a typed hook for database operations
    pg_hook = PostgresHook(postgres_conn_id='my_postgres')

    # Execute query
    records = pg_hook.get_records("SELECT COUNT(*) FROM users")
    print(f"User count: {records[0][0]}")

    # Get pandas DataFrame
    df = pg_hook.get_pandas_df("SELECT * FROM users LIMIT 100")
    return {'row_count': len(df)}
```

---

## Error Handling and Retries

Robust error handling ensures pipelines recover gracefully from failures.

### Configuring Retries

```python
from datetime import timedelta
from airflow.operators.python import PythonOperator

default_args = {
    'retries': 3,
    'retry_delay': timedelta(minutes=5),
    'retry_exponential_backoff': True,  # Increase delay between retries
    'max_retry_delay': timedelta(minutes=30),  # Cap the retry delay
}

with DAG(..., default_args=default_args) as dag:

    # Override retry settings for specific tasks
    critical_task = PythonOperator(
        task_id='critical_task',
        python_callable=critical_function,
        retries=5,  # More retries for critical tasks
        retry_delay=timedelta(minutes=2),
    )

    # Task that should not retry
    idempotent_check = PythonOperator(
        task_id='idempotent_check',
        python_callable=check_function,
        retries=0,  # No retries
    )
```

### Custom Error Handling

```python
from airflow.operators.python import PythonOperator
from airflow.exceptions import AirflowException

def task_with_error_handling(**context):
    """Task with comprehensive error handling"""
    try:
        result = perform_operation()

        # Validate result
        if result['status'] != 'success':
            # Raise Airflow exception to trigger retry
            raise AirflowException(f"Operation failed: {result['error']}")

        return result

    except ConnectionError as e:
        # Log and re-raise for retry
        print(f"Connection failed: {e}")
        raise

    except ValueError as e:
        # Don't retry on validation errors
        context['ti'].xcom_push(key='error', value=str(e))
        raise AirflowException(f"Validation error (no retry): {e}")

def on_failure_callback(context):
    """Called when task fails after all retries"""
    task_instance = context['task_instance']
    exception = context.get('exception')

    # Send alert to monitoring system
    print(f"Task {task_instance.task_id} failed: {exception}")
    # send_alert_to_oneuptime(task_instance, exception)

def on_success_callback(context):
    """Called when task succeeds"""
    task_instance = context['task_instance']
    print(f"Task {task_instance.task_id} completed successfully")

with DAG(...) as dag:

    task = PythonOperator(
        task_id='task_with_callbacks',
        python_callable=task_with_error_handling,
        on_failure_callback=on_failure_callback,
        on_success_callback=on_success_callback,
    )
```

### Trigger Rules

Control task execution based on upstream task states:

```python
from airflow.operators.python import PythonOperator
from airflow.operators.empty import EmptyOperator
from airflow.utils.trigger_rule import TriggerRule

with DAG(...) as dag:

    task_a = PythonOperator(task_id='task_a', python_callable=func_a)
    task_b = PythonOperator(task_id='task_b', python_callable=func_b)

    # Runs only if ALL upstream tasks succeed (default)
    all_success = EmptyOperator(
        task_id='all_success',
        trigger_rule=TriggerRule.ALL_SUCCESS,
    )

    # Runs if at least one upstream succeeds
    one_success = EmptyOperator(
        task_id='one_success',
        trigger_rule=TriggerRule.ONE_SUCCESS,
    )

    # Always runs regardless of upstream state - useful for cleanup
    cleanup = PythonOperator(
        task_id='cleanup',
        python_callable=cleanup_function,
        trigger_rule=TriggerRule.ALL_DONE,
    )

    # Runs only if ALL upstream tasks fail
    all_failed = EmptyOperator(
        task_id='alert_on_failure',
        trigger_rule=TriggerRule.ALL_FAILED,
    )

    [task_a, task_b] >> all_success
    [task_a, task_b] >> one_success
    [task_a, task_b] >> cleanup
    [task_a, task_b] >> all_failed
```

---

## Dynamic DAG Generation

Generate DAGs programmatically for repetitive patterns or configuration-driven pipelines.

### Factory Pattern

```python
# dags/dag_factory.py
from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.python import PythonOperator

def create_etl_dag(table_name, schedule, source_conn, target_conn):
    """Factory function to create ETL DAGs for different tables"""

    dag_id = f'etl_{table_name}_daily'

    default_args = {
        'owner': 'data-team',
        'retries': 3,
        'retry_delay': timedelta(minutes=5),
    }

    dag = DAG(
        dag_id=dag_id,
        default_args=default_args,
        description=f'ETL pipeline for {table_name}',
        schedule_interval=schedule,
        start_date=datetime(2026, 1, 1),
        catchup=False,
        tags=['etl', 'generated', table_name],
    )

    def extract(table, conn_id, **context):
        print(f"Extracting from {table} using {conn_id}")
        return {'records': 1000}

    def load(table, conn_id, **context):
        print(f"Loading to {table} using {conn_id}")

    with dag:
        extract_task = PythonOperator(
            task_id='extract',
            python_callable=extract,
            op_kwargs={'table': table_name, 'conn_id': source_conn},
        )

        load_task = PythonOperator(
            task_id='load',
            python_callable=load,
            op_kwargs={'table': table_name, 'conn_id': target_conn},
        )

        extract_task >> load_task

    return dag

# Configuration for tables to process
TABLE_CONFIG = [
    {'table': 'users', 'schedule': '0 6 * * *', 'source': 'postgres', 'target': 'bigquery'},
    {'table': 'orders', 'schedule': '0 7 * * *', 'source': 'postgres', 'target': 'bigquery'},
    {'table': 'products', 'schedule': '0 8 * * *', 'source': 'mysql', 'target': 'bigquery'},
]

# Generate DAGs and add to global namespace
for config in TABLE_CONFIG:
    dag_id = f"etl_{config['table']}_daily"
    globals()[dag_id] = create_etl_dag(
        table_name=config['table'],
        schedule=config['schedule'],
        source_conn=config['source'],
        target_conn=config['target'],
    )
```

### Configuration-Driven DAGs

```python
# dags/config_driven_dag.py
import yaml
from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.python import PythonOperator

# Load configuration from YAML file
# config.yaml:
# pipelines:
#   - name: customer_sync
#     schedule: "0 6 * * *"
#     tasks:
#       - extract_customers
#       - transform_customers
#       - load_customers

def load_config():
    with open('/opt/airflow/config/pipelines.yaml', 'r') as f:
        return yaml.safe_load(f)

def create_task_callable(task_name):
    """Create a callable for each task"""
    def task_function(**context):
        print(f"Executing task: {task_name}")
        return {'task': task_name, 'status': 'success'}
    return task_function

def create_dag_from_config(pipeline_config):
    """Create a DAG from configuration"""
    dag_id = f"pipeline_{pipeline_config['name']}"

    dag = DAG(
        dag_id=dag_id,
        schedule_interval=pipeline_config['schedule'],
        start_date=datetime(2026, 1, 1),
        catchup=False,
        tags=['config-driven'],
    )

    with dag:
        tasks = []
        for task_name in pipeline_config['tasks']:
            task = PythonOperator(
                task_id=task_name,
                python_callable=create_task_callable(task_name),
            )
            tasks.append(task)

        # Chain tasks sequentially
        for i in range(len(tasks) - 1):
            tasks[i] >> tasks[i + 1]

    return dag

# Generate DAGs from configuration
try:
    config = load_config()
    for pipeline in config.get('pipelines', []):
        dag_id = f"pipeline_{pipeline['name']}"
        globals()[dag_id] = create_dag_from_config(pipeline)
except FileNotFoundError:
    pass  # Config file not found, skip DAG generation
```

---

## Testing DAGs

Testing ensures your DAGs work correctly before deployment.

### Unit Testing Tasks

```python
# tests/test_etl_tasks.py
import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime

# Import your task functions
from dags.etl_dag import extract_data, transform_data, load_data

class TestExtractData:

    def test_extract_returns_data(self):
        """Test that extract returns expected structure"""
        result = extract_data()

        assert 'records' in result
        assert isinstance(result['records'], int)

    @patch('dags.etl_dag.get_database_connection')
    def test_extract_with_mock_db(self, mock_conn):
        """Test extract with mocked database"""
        mock_conn.return_value.execute.return_value = [
            {'id': 1, 'name': 'Alice'},
            {'id': 2, 'name': 'Bob'},
        ]

        result = extract_data()

        assert result['records'] == 2
        mock_conn.assert_called_once()

class TestTransformData:

    def test_transform_filters_invalid_records(self):
        """Test that transform removes invalid records"""
        input_data = [
            {'id': 1, 'value': 100},
            {'id': 2, 'value': -1},  # Invalid
            {'id': 3, 'value': 50},
        ]

        result = transform_data(input_data)

        assert len(result) == 2
        assert all(r['value'] >= 0 for r in result)
```

### Testing DAG Structure

```python
# tests/test_dag_structure.py
import pytest
from airflow.models import DagBag

class TestDagStructure:

    @pytest.fixture
    def dagbag(self):
        return DagBag(dag_folder='dags/', include_examples=False)

    def test_no_import_errors(self, dagbag):
        """Test that all DAGs load without import errors"""
        assert len(dagbag.import_errors) == 0, f"Import errors: {dagbag.import_errors}"

    def test_dag_exists(self, dagbag):
        """Test that expected DAG exists"""
        assert 'etl_sales_daily' in dagbag.dags

    def test_dag_has_expected_tasks(self, dagbag):
        """Test DAG contains required tasks"""
        dag = dagbag.get_dag('etl_sales_daily')
        task_ids = [task.task_id for task in dag.tasks]

        assert 'extract' in task_ids
        assert 'transform' in task_ids
        assert 'load' in task_ids

    def test_task_dependencies(self, dagbag):
        """Test task dependencies are correct"""
        dag = dagbag.get_dag('etl_sales_daily')

        extract = dag.get_task('extract')
        transform = dag.get_task('transform')
        load = dag.get_task('load')

        # Check downstream tasks
        assert transform.task_id in [t.task_id for t in extract.downstream_list]
        assert load.task_id in [t.task_id for t in transform.downstream_list]

    def test_dag_tags(self, dagbag):
        """Test DAG has required tags"""
        dag = dagbag.get_dag('etl_sales_daily')
        assert 'etl' in dag.tags
        assert 'production' in dag.tags
```

### Integration Testing

```python
# tests/test_dag_integration.py
import pytest
from airflow.models import DagBag, TaskInstance
from airflow.utils.state import State
from datetime import datetime

class TestDagIntegration:

    @pytest.fixture
    def dag(self):
        dagbag = DagBag(dag_folder='dags/', include_examples=False)
        return dagbag.get_dag('etl_sales_daily')

    def test_task_execution(self, dag):
        """Test individual task execution"""
        execution_date = datetime(2026, 1, 27)

        # Get the extract task
        task = dag.get_task('extract')

        # Create a task instance
        ti = TaskInstance(task=task, execution_date=execution_date)

        # Run the task (in test mode)
        ti.run(ignore_ti_state=True, test_mode=True)

        # Check task succeeded
        assert ti.state == State.SUCCESS

        # Check XCom output
        result = ti.xcom_pull(task_ids='extract')
        assert result is not None
```

---

## Scheduling and Catchup

Proper scheduling configuration prevents unexpected behavior and resource issues.

### Schedule Interval Options

```python
from datetime import timedelta
from airflow import DAG

# Cron expressions
with DAG(
    dag_id='hourly_dag',
    schedule_interval='0 * * * *',  # Every hour at minute 0
    ...
) as dag:
    pass

with DAG(
    dag_id='daily_dag',
    schedule_interval='0 6 * * *',  # Daily at 6 AM
    ...
) as dag:
    pass

with DAG(
    dag_id='weekly_dag',
    schedule_interval='0 0 * * 0',  # Weekly on Sunday at midnight
    ...
) as dag:
    pass

# Timedelta for intervals
with DAG(
    dag_id='every_30_minutes',
    schedule_interval=timedelta(minutes=30),
    ...
) as dag:
    pass

# Preset schedules
with DAG(
    dag_id='preset_daily',
    schedule_interval='@daily',  # Same as '0 0 * * *'
    ...
) as dag:
    pass

# Available presets: @once, @hourly, @daily, @weekly, @monthly, @yearly
```

### Catchup Configuration

```python
from datetime import datetime
from airflow import DAG

# Catchup enabled - will run for all missed intervals
# Use when historical data processing is required
with DAG(
    dag_id='backfill_enabled_dag',
    schedule_interval='@daily',
    start_date=datetime(2026, 1, 1),
    catchup=True,  # Default behavior
    max_active_runs=3,  # Limit concurrent backfill runs
    ...
) as dag:
    pass

# Catchup disabled - only runs for current/future intervals
# Use for operational tasks that don't need backfilling
with DAG(
    dag_id='no_backfill_dag',
    schedule_interval='@daily',
    start_date=datetime(2026, 1, 1),
    catchup=False,  # Skip missed runs
    ...
) as dag:
    pass
```

### Data Interval Awareness

```python
from airflow.operators.python import PythonOperator

def process_data_interval(**context):
    """Process data for the specific interval"""
    # Data interval start/end represent the data being processed
    data_interval_start = context['data_interval_start']
    data_interval_end = context['data_interval_end']

    # Logical date is the start of the data interval
    logical_date = context['logical_date']

    print(f"Processing data from {data_interval_start} to {data_interval_end}")
    print(f"Logical date: {logical_date}")

    # Use these for querying data
    query = f"""
        SELECT * FROM events
        WHERE event_time >= '{data_interval_start}'
        AND event_time < '{data_interval_end}'
    """
    return {'query': query}

with DAG(...) as dag:

    process = PythonOperator(
        task_id='process_interval',
        python_callable=process_data_interval,
    )
```

---

## Performance Optimization

Optimize DAGs for faster execution and efficient resource usage.

### Task Parallelization

```python
from airflow import DAG
from airflow.operators.python import PythonOperator

with DAG(
    dag_id='parallel_processing',
    # DAG-level parallelism settings
    max_active_tasks=16,  # Max concurrent tasks in this DAG
    max_active_runs=2,    # Max concurrent DAG runs
    ...
) as dag:

    # Tasks without dependencies run in parallel automatically
    tasks = []
    for i in range(10):
        task = PythonOperator(
            task_id=f'process_partition_{i}',
            python_callable=process_partition,
            op_kwargs={'partition': i},
            # Task-level pool assignment for resource management
            pool='data_processing_pool',
        )
        tasks.append(task)

    # All tasks can run in parallel (limited by pool and executor)
    start >> tasks >> end
```

### Using Pools

```python
# Create pools via CLI or UI:
# airflow pools set data_processing 10 "Pool for data processing tasks"

from airflow.operators.python import PythonOperator

with DAG(...) as dag:

    # Resource-intensive tasks share a pool
    heavy_task_1 = PythonOperator(
        task_id='heavy_task_1',
        python_callable=heavy_function,
        pool='data_processing',  # Limited to pool size
        pool_slots=2,  # This task uses 2 slots
    )

    heavy_task_2 = PythonOperator(
        task_id='heavy_task_2',
        python_callable=heavy_function,
        pool='data_processing',
        pool_slots=2,
    )

    # Lightweight tasks can use default pool
    light_task = PythonOperator(
        task_id='light_task',
        python_callable=light_function,
        # No pool specified - uses default_pool
    )
```

### Efficient Sensor Usage

```python
from airflow.sensors.filesystem import FileSensor

with DAG(...) as dag:

    # Bad: Poke mode keeps worker occupied
    wait_poke = FileSensor(
        task_id='wait_poke',
        filepath='/data/file.csv',
        mode='poke',  # Worker stays occupied
        poke_interval=60,
    )

    # Good: Reschedule mode frees worker between checks
    wait_reschedule = FileSensor(
        task_id='wait_reschedule',
        filepath='/data/file.csv',
        mode='reschedule',  # Worker freed between checks
        poke_interval=300,  # Can use longer intervals
        timeout=86400,  # 24 hours
    )

    # Best: Use deferrable operators (Airflow 2.2+)
    # These use the triggerer instead of workers
    from airflow.sensors.filesystem import FileSensor

    wait_deferrable = FileSensor(
        task_id='wait_deferrable',
        filepath='/data/file.csv',
        deferrable=True,  # Uses triggerer, not workers
        poke_interval=60,
    )
```

### Minimizing DAG Parsing Time

```python
# Bad: Heavy imports at module level
import pandas as pd  # Loaded every time DAG file is parsed
import tensorflow as tf

# Good: Import inside task functions
def process_data(**context):
    import pandas as pd  # Only loaded when task runs
    df = pd.read_parquet('/data/input.parquet')
    return df.shape[0]

# Bad: Database queries during DAG parsing
with DAG(...) as dag:
    tables = get_tables_from_database()  # Called every parse
    for table in tables:
        create_task(table)

# Good: Use static configuration or lazy evaluation
TABLE_CONFIG = ['users', 'orders', 'products']  # Static list
with DAG(...) as dag:
    for table in TABLE_CONFIG:
        create_task(table)
```

---

## Best Practices Summary

Follow these practices for maintainable and reliable DAGs:

### DAG Design
- Use descriptive dag_ids with consistent naming conventions
- Set appropriate default_args for retries and notifications
- Add tags for easy filtering and organization
- Document DAGs with descriptions

### Task Design
- Keep tasks atomic and idempotent
- Use meaningful task_ids
- Choose the right operator for each task type
- Set appropriate timeouts and retries

### Dependencies
- Use clear dependency syntax (>>)
- Avoid circular dependencies
- Use trigger_rules for conditional execution
- Consider task groups for complex DAGs

### Data Handling
- Use XCom only for small metadata
- Store large data externally and pass references
- Use Variables for configuration, not runtime data
- Secure sensitive data in Connections

### Testing
- Test task logic with unit tests
- Validate DAG structure with integration tests
- Use Airflow's test mode for local development

### Performance
- Enable parallelization where possible
- Use pools to manage resource-intensive tasks
- Prefer reschedule mode for sensors
- Minimize DAG parsing time

---

## Conclusion

Writing effective Airflow DAGs requires balancing simplicity with robustness. Start with clear structure and naming, define explicit dependencies, and implement proper error handling. As your pipelines grow, leverage dynamic DAG generation and performance optimization techniques.

Key takeaways:
- Structure DAGs for readability and maintainability
- Use the right operators and sensors for each task type
- Implement comprehensive error handling and retries
- Test DAGs thoroughly before deployment
- Monitor pipeline health with proper observability

Well-designed DAGs are easier to debug, maintain, and scale. Invest time in following these practices and your data pipelines will be more reliable and efficient.

---

*Need to monitor your Airflow pipelines? [OneUptime](https://oneuptime.com) provides comprehensive observability for data infrastructure, including DAG execution monitoring, alerting on failures, and performance tracking. Get started with our free tier today.*
