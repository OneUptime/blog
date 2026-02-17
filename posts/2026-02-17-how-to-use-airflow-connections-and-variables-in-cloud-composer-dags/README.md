# How to Use Airflow Connections and Variables in Cloud Composer DAGs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Composer, Airflow, Connections, Variables

Description: Learn how to manage Airflow Connections and Variables in Cloud Composer to securely store credentials and configuration for your DAGs.

---

Hardcoding database credentials, API keys, and configuration values in your DAG files is a bad idea for obvious reasons. Airflow provides two mechanisms for externalizing this information: Connections (for service credentials) and Variables (for configuration values). Cloud Composer supports both, plus integration with Secret Manager for an extra layer of security.

This guide covers how to create, manage, and use Connections and Variables effectively in your Composer DAGs.

## Connections vs Variables

Before diving in, here is when to use each:

**Connections** store authentication information for external services:
- Database credentials (host, port, username, password)
- API endpoints with tokens
- Cloud service configurations
- SMTP server details

**Variables** store configuration values:
- Feature flags
- File paths
- Threshold values
- Email addresses for notifications
- Any key-value configuration

The rule of thumb: if it involves authenticating to a service, use a Connection. If it is a configuration parameter, use a Variable.

## Creating Connections

### Through the Airflow UI

The Airflow web UI is the easiest way to create connections interactively:

1. Open the Airflow UI (from the Cloud Console > Composer > your environment > Open Airflow UI)
2. Go to **Admin** > **Connections**
3. Click the **+** button to add a new connection
4. Fill in the fields (Connection ID, Connection Type, Host, Login, Password, etc.)
5. Click **Save**

### Through the gcloud CLI

For automated setup, use the gcloud CLI to run Airflow commands:

```bash
# Create a PostgreSQL connection
gcloud composer environments run my-composer-env \
  --location=us-central1 \
  connections add -- postgres_default \
  --conn-type=postgres \
  --conn-host=10.0.0.5 \
  --conn-port=5432 \
  --conn-login=airflow_user \
  --conn-password=secure_password \
  --conn-schema=production_db

# Create an HTTP connection for an API
gcloud composer environments run my-composer-env \
  --location=us-central1 \
  connections add -- my_api \
  --conn-type=http \
  --conn-host=https://api.example.com \
  --conn-extra='{"Authorization": "Bearer token123"}'

# Create a Google Cloud connection
gcloud composer environments run my-composer-env \
  --location=us-central1 \
  connections add -- google_cloud_custom \
  --conn-type=google_cloud_platform \
  --conn-extra='{"extra__google_cloud_platform__project": "my-project", "extra__google_cloud_platform__key_path": "/path/to/key.json"}'
```

### Using Connection URIs

Connections can also be specified as URIs, which is compact and useful for automation:

```bash
# Create a connection using a URI string
gcloud composer environments run my-composer-env \
  --location=us-central1 \
  connections add -- mysql_db \
  --conn-uri="mysql://user:password@10.0.0.10:3306/my_database"

# Slack webhook connection
gcloud composer environments run my-composer-env \
  --location=us-central1 \
  connections add -- slack_webhook \
  --conn-uri="https://:token@hooks.slack.com/services/T00/B00/XXXX"
```

## Using Connections in DAGs

Here is how to use connections in your DAG code:

```python
# Using connections with Airflow operators
from airflow import DAG
from airflow.providers.postgres.operators.postgres import PostgresOperator
from airflow.providers.http.operators.http import SimpleHttpOperator
from airflow.providers.google.cloud.operators.bigquery import BigQueryInsertJobOperator
from datetime import datetime

dag = DAG(
    dag_id="connections_example",
    start_date=datetime(2025, 1, 1),
    schedule_interval="@daily",
    catchup=False,
)

# Use a PostgreSQL connection - the operator looks up "postgres_default" automatically
query_pg = PostgresOperator(
    task_id="query_postgres",
    postgres_conn_id="postgres_default",  # References the connection ID
    sql="SELECT COUNT(*) FROM orders WHERE order_date = '{{ ds }}'",
    dag=dag,
)

# Use an HTTP connection for API calls
call_api = SimpleHttpOperator(
    task_id="call_api",
    http_conn_id="my_api",  # References the connection ID
    endpoint="/v1/data",
    method="GET",
    dag=dag,
)

# Use the default Google Cloud connection
bq_job = BigQueryInsertJobOperator(
    task_id="run_bq_query",
    gcp_conn_id="google_cloud_default",  # Default GCP connection
    configuration={
        "query": {
            "query": "SELECT * FROM dataset.table LIMIT 10",
            "useLegacySql": False,
        }
    },
    dag=dag,
)
```

For custom code that needs connection details directly:

```python
# Access connection details programmatically
from airflow.hooks.base import BaseHook

def use_connection(**context):
    """Access connection details in a Python function."""
    # Get the connection object
    conn = BaseHook.get_connection("postgres_default")

    # Access individual fields
    host = conn.host
    port = conn.port
    login = conn.login
    password = conn.password
    schema = conn.schema

    print(f"Connecting to {host}:{port}/{schema} as {login}")

    # Use the connection details with your preferred library
    import psycopg2
    connection = psycopg2.connect(
        host=host,
        port=port,
        user=login,
        password=password,
        dbname=schema
    )

    cursor = connection.cursor()
    cursor.execute("SELECT COUNT(*) FROM orders")
    result = cursor.fetchone()
    print(f"Total orders: {result[0]}")

    connection.close()
```

## Creating Variables

### Through the gcloud CLI

```bash
# Create simple key-value variables
gcloud composer environments run my-composer-env \
  --location=us-central1 \
  variables set -- data_bucket "gs://my-data-bucket"

gcloud composer environments run my-composer-env \
  --location=us-central1 \
  variables set -- alert_email "team@example.com"

gcloud composer environments run my-composer-env \
  --location=us-central1 \
  variables set -- max_retries "3"

# Create a JSON variable for complex configuration
gcloud composer environments run my-composer-env \
  --location=us-central1 \
  variables set -- pipeline_config '{"batch_size": 1000, "timeout": 3600, "regions": ["us-central1", "europe-west1"]}'
```

### Importing Variables from a JSON File

For bulk setup, create a JSON file with all your variables:

```json
{
    "data_bucket": "gs://my-data-bucket",
    "alert_email": "team@example.com",
    "max_retries": "3",
    "environment": "production",
    "pipeline_config": {
        "batch_size": 1000,
        "timeout": 3600,
        "regions": ["us-central1", "europe-west1"]
    }
}
```

Import the file:

```bash
# Import variables from a JSON file
gcloud composer environments run my-composer-env \
  --location=us-central1 \
  variables import -- /path/to/variables.json
```

## Using Variables in DAGs

```python
# Using Variables in DAG code
from airflow.models import Variable

def process_data(**context):
    """Access Airflow Variables in a task."""
    # Get a simple string variable
    bucket = Variable.get("data_bucket")

    # Get a variable with a default value
    max_retries = int(Variable.get("max_retries", default_var="3"))

    # Get a JSON variable and parse it
    config = Variable.get("pipeline_config", deserialize_json=True)
    batch_size = config["batch_size"]
    timeout = config["timeout"]
    regions = config["regions"]

    print(f"Processing with batch_size={batch_size}, timeout={timeout}")
    print(f"Regions: {regions}")
    print(f"Outputting to: {bucket}")
```

Important performance tip: do not call `Variable.get()` at the DAG module level. This causes a database query every time the scheduler parses the DAG file. Instead, use Variables inside task functions or use Jinja templates:

```python
# Bad - queries the database on every DAG parse
bucket = Variable.get("data_bucket")  # Do not do this at the top level

# Good - uses Jinja template, resolved at task execution time
task = BashOperator(
    task_id="copy_data",
    bash_command="gsutil cp data.csv {{ var.value.data_bucket }}/{{ ds }}/",
    dag=dag,
)

# Good - access inside a task function
def my_task(**context):
    bucket = Variable.get("data_bucket")
    # Use bucket here
```

## Integrating with Secret Manager

For sensitive values, use Google Secret Manager instead of storing them directly in Airflow:

```bash
# Store a secret in Secret Manager
echo -n "my-database-password" | gcloud secrets create db-password \
  --data-file=- \
  --replication-policy=automatic

# Configure Composer to use Secret Manager as a backend
gcloud composer environments update my-composer-env \
  --location=us-central1 \
  --update-airflow-configs="\
secrets-backend=airflow.providers.google.cloud.secrets.secret_manager.CloudSecretManagerBackend,\
secrets-backend_kwargs={\"project_id\": \"my-project\", \"connections_prefix\": \"airflow-connections\", \"variables_prefix\": \"airflow-variables\"}"
```

With this configuration, Airflow checks Secret Manager before the metadata database. Store secrets with the appropriate prefix:

```bash
# Store a connection in Secret Manager
# Secret name format: airflow-connections-<connection_id>
echo -n "postgresql://user:pass@host:5432/dbname" | gcloud secrets create airflow-connections-postgres-prod \
  --data-file=- \
  --replication-policy=automatic

# Store a variable in Secret Manager
# Secret name format: airflow-variables-<variable_key>
echo -n "gs://production-data-bucket" | gcloud secrets create airflow-variables-data-bucket \
  --data-file=- \
  --replication-policy=automatic
```

Now your DAGs can use these secrets through the standard Connection and Variable APIs without any code changes.

## Managing Connections and Variables

```bash
# List all connections
gcloud composer environments run my-composer-env \
  --location=us-central1 \
  connections list

# List all variables
gcloud composer environments run my-composer-env \
  --location=us-central1 \
  variables list

# Delete a connection
gcloud composer environments run my-composer-env \
  --location=us-central1 \
  connections delete -- old_connection

# Delete a variable
gcloud composer environments run my-composer-env \
  --location=us-central1 \
  variables delete -- old_variable

# Export all connections for backup
gcloud composer environments run my-composer-env \
  --location=us-central1 \
  connections export -- /tmp/connections.json
```

## Wrapping Up

Connections and Variables are fundamental to building maintainable Airflow pipelines. Use Connections for service credentials, Variables for configuration, and Secret Manager for anything sensitive. The key best practices are: never hardcode credentials, never access Variables at the DAG module level, and use Secret Manager integration for production environments. With these patterns, your DAGs stay clean, your secrets stay safe, and your configuration stays manageable.
