# How to Set Up Apache Airflow for Production

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Airflow, Data Engineering, Workflow Orchestration, Production, DevOps, Python, Docker

Description: A practical guide to setting up Apache Airflow for production environments covering architecture decisions, deployment options, security hardening, and operational best practices.

> Apache Airflow has become the go-to workflow orchestration tool for data engineering teams. But getting it running locally is very different from running it in production. This guide walks through everything you need to know to deploy Airflow reliably.

## Understanding Airflow Architecture

Before diving into production setup, you need to understand how Airflow components work together. Each component has specific resource requirements and failure modes that affect your deployment strategy.

```mermaid
flowchart TB
    subgraph "Airflow Core Components"
        webserver["Web Server<br/>(Flask UI)"]
        scheduler["Scheduler<br/>(DAG Parsing & Task Scheduling)"]
        executor["Executor<br/>(Task Distribution)"]
        workers["Workers<br/>(Task Execution)"]
    end

    subgraph "Backend Services"
        metadata[(Metadata Database<br/>PostgreSQL)]
        broker[(Message Broker<br/>Redis/RabbitMQ)]
        logs[(Log Storage<br/>S3/GCS/Local)]
    end

    subgraph "DAG Sources"
        dagfolder[DAG Folder<br/>Python Files]
    end

    webserver --> metadata
    scheduler --> metadata
    scheduler --> dagfolder
    scheduler --> broker
    executor --> broker
    workers --> broker
    workers --> logs
    workers --> dagfolder
```

**Web Server** - Serves the UI and REST API. Stateless and horizontally scalable.

**Scheduler** - The brain of Airflow. Parses DAGs, creates task instances, and sends them to the executor. This is your most critical component.

**Executor** - Determines how tasks run. Your choice here significantly impacts scalability and resource usage.

**Workers** - Execute the actual task code. Can be local processes, Celery workers, or Kubernetes pods.

**Metadata Database** - Stores all state including DAG definitions, task instances, variables, and connections. PostgreSQL is strongly recommended for production.

## Choosing the Right Executor

The executor choice is your most important architectural decision. Here is what each option offers:

| Executor | Best For | Scalability | Complexity |
|----------|----------|-------------|------------|
| LocalExecutor | Small deployments, testing | Single machine | Low |
| CeleryExecutor | Medium to large workloads | Horizontal | Medium |
| KubernetesExecutor | Dynamic workloads, isolation | Dynamic | High |
| CeleryKubernetesExecutor | Mixed workloads | Hybrid | High |

For most production deployments, **CeleryExecutor** offers the best balance of scalability and operational simplicity. If you are already running on Kubernetes and need task isolation, the **KubernetesExecutor** is worth the added complexity.

## Production Deployment with Docker Compose

Docker Compose provides a solid foundation for production deployments, especially for teams not running Kubernetes. Here is a complete production-ready configuration:

```yaml
# docker-compose.yaml
# Production Airflow deployment with CeleryExecutor

version: '3.8'

x-airflow-common: &airflow-common
  image: apache/airflow:2.8.1-python3.11
  environment: &airflow-common-env
    # Core settings
    AIRFLOW__CORE__EXECUTOR: CeleryExecutor
    AIRFLOW__CORE__FERNET_KEY: ${FERNET_KEY}
    AIRFLOW__CORE__LOAD_EXAMPLES: 'false'
    AIRFLOW__CORE__DAGS_ARE_PAUSED_AT_CREATION: 'true'

    # Database connection - use connection pooling
    AIRFLOW__DATABASE__SQL_ALCHEMY_CONN: postgresql+psycopg2://airflow:${POSTGRES_PASSWORD}@postgres:5432/airflow
    AIRFLOW__DATABASE__SQL_ALCHEMY_POOL_SIZE: 5
    AIRFLOW__DATABASE__SQL_ALCHEMY_MAX_OVERFLOW: 10

    # Celery configuration
    AIRFLOW__CELERY__BROKER_URL: redis://:${REDIS_PASSWORD}@redis:6379/0
    AIRFLOW__CELERY__RESULT_BACKEND: db+postgresql://airflow:${POSTGRES_PASSWORD}@postgres:5432/airflow

    # Scheduler settings for production
    AIRFLOW__SCHEDULER__DAG_DIR_LIST_INTERVAL: 30
    AIRFLOW__SCHEDULER__MIN_FILE_PROCESS_INTERVAL: 30
    AIRFLOW__SCHEDULER__SCHEDULER_HEARTBEAT_SEC: 5

    # Web server security
    AIRFLOW__WEBSERVER__EXPOSE_CONFIG: 'false'
    AIRFLOW__WEBSERVER__SECRET_KEY: ${WEBSERVER_SECRET_KEY}
    AIRFLOW__WEBSERVER__WORKERS: 4

    # API authentication
    AIRFLOW__API__AUTH_BACKENDS: airflow.api.auth.backend.basic_auth

    # Logging to remote storage
    AIRFLOW__LOGGING__REMOTE_LOGGING: 'true'
    AIRFLOW__LOGGING__REMOTE_BASE_LOG_FOLDER: s3://airflow-logs/
    AIRFLOW__LOGGING__REMOTE_LOG_CONN_ID: aws_default
  volumes:
    - ./dags:/opt/airflow/dags
    - ./plugins:/opt/airflow/plugins
    - ./config:/opt/airflow/config
  depends_on:
    postgres:
      condition: service_healthy
    redis:
      condition: service_healthy

services:
  # PostgreSQL database with persistence
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: airflow
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: airflow
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD", "pg_isready", "-U", "airflow"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: always
    # Resource limits prevent runaway queries from affecting other services
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '2'

  # Redis as Celery broker
  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD} --appendonly yes
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: always
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '1'

  # Airflow web server - serves UI and API
  webserver:
    <<: *airflow-common
    command: webserver
    ports:
      - "8080:8080"
    healthcheck:
      test: ["CMD", "curl", "--fail", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: always
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '2'

  # Scheduler - single instance is recommended unless using HA
  scheduler:
    <<: *airflow-common
    command: scheduler
    healthcheck:
      test: ["CMD", "airflow", "jobs", "check", "--job-type", "SchedulerJob", "--hostname", "$${HOSTNAME}"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: always
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '2'

  # Celery workers - scale these based on workload
  worker:
    <<: *airflow-common
    command: celery worker
    healthcheck:
      test: ["CMD", "celery", "--app", "airflow.providers.celery.executors.celery_executor.app", "inspect", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: always
    deploy:
      mode: replicated
      replicas: 3
      resources:
        limits:
          memory: 4G
          cpus: '2'

  # Triggerer for deferrable operators
  triggerer:
    <<: *airflow-common
    command: triggerer
    healthcheck:
      test: ["CMD", "airflow", "jobs", "check", "--job-type", "TriggererJob", "--hostname", "$${HOSTNAME}"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: always
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '1'

  # Database initialization - runs once
  airflow-init:
    <<: *airflow-common
    entrypoint: /bin/bash
    command:
      - -c
      - |
        # Initialize database schema
        airflow db upgrade
        # Create admin user if not exists
        airflow users create \
          --username admin \
          --password $${ADMIN_PASSWORD} \
          --firstname Admin \
          --lastname User \
          --role Admin \
          --email admin@example.com || true
    environment:
      <<: *airflow-common-env
      ADMIN_PASSWORD: ${ADMIN_PASSWORD}
    depends_on:
      postgres:
        condition: service_healthy

  # Flower for Celery monitoring
  flower:
    <<: *airflow-common
    command: celery flower
    ports:
      - "5555:5555"
    healthcheck:
      test: ["CMD", "curl", "--fail", "http://localhost:5555/"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: always
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'

volumes:
  postgres_data:
  redis_data:
```

Create an environment file with your secrets:

```bash
# .env file - never commit this to version control

# Generate a Fernet key for encryption
# python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
FERNET_KEY=your-32-character-fernet-key-here

# Secure random strings for secrets
WEBSERVER_SECRET_KEY=your-random-secret-key
POSTGRES_PASSWORD=strong-database-password
REDIS_PASSWORD=strong-redis-password
ADMIN_PASSWORD=admin-ui-password
```

## Security Hardening

Production Airflow requires careful attention to security. Here are the essential configurations:

### Authentication and Authorization

```python
# config/webserver_config.py
# Place this in your Airflow config directory

from flask_appbuilder.security.manager import AUTH_DB

# Use database authentication
AUTH_TYPE = AUTH_DB

# Disable signup
AUTH_USER_REGISTRATION = False

# Session configuration
SESSION_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'

# CSRF protection
WTF_CSRF_ENABLED = True
WTF_CSRF_TIME_LIMIT = 3600
```

### Connection and Variable Encryption

All connections and variables should be encrypted at rest:

```python
# dags/utils/secrets.py
# Helper functions for secure credential management

from airflow.models import Variable
from airflow.hooks.base import BaseHook

def get_secret_connection(conn_id: str) -> dict:
    """
    Retrieve connection details securely.
    Connections are encrypted using the Fernet key.
    """
    connection = BaseHook.get_connection(conn_id)
    return {
        'host': connection.host,
        'login': connection.login,
        'password': connection.password,
        'port': connection.port,
        'schema': connection.schema,
        'extra': connection.extra_dejson
    }

def get_secret_variable(key: str, default: str = None) -> str:
    """
    Retrieve variable securely with optional default.
    """
    return Variable.get(key, default_var=default)
```

### Network Security

Configure your reverse proxy (nginx) for TLS termination:

```nginx
# nginx.conf
# Reverse proxy configuration for Airflow

upstream airflow_webserver {
    server webserver:8080;
    keepalive 32;
}

server {
    listen 443 ssl http2;
    server_name airflow.yourdomain.com;

    # TLS configuration
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;

    location / {
        proxy_pass http://airflow_webserver;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support for log streaming
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## Writing Production-Ready DAGs

Your DAGs need to be idempotent, observable, and failure-tolerant. Here is a template:

```python
# dags/example_production_dag.py
# Production-ready DAG template with best practices

from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.operators.empty import EmptyOperator
from airflow.utils.task_group import TaskGroup
from airflow.models import Variable

# Default arguments applied to all tasks
default_args = {
    'owner': 'data-team',
    'depends_on_past': False,
    'email': ['alerts@yourdomain.com'],
    'email_on_failure': True,
    'email_on_retry': False,
    'retries': 3,
    'retry_delay': timedelta(minutes=5),
    'retry_exponential_backoff': True,
    'max_retry_delay': timedelta(minutes=30),
    'execution_timeout': timedelta(hours=2),
}

# DAG definition with production settings
dag = DAG(
    dag_id='production_etl_pipeline',
    default_args=default_args,
    description='Daily ETL pipeline for analytics data',
    schedule_interval='0 6 * * *',  # Run at 6 AM daily
    start_date=datetime(2024, 1, 1),
    catchup=False,  # Disable backfill on deployment
    max_active_runs=1,  # Prevent overlapping runs
    tags=['production', 'etl', 'analytics'],
    doc_md="""
    ## Production ETL Pipeline

    This DAG extracts data from source systems, transforms it,
    and loads it into the analytics warehouse.

    ### Dependencies
    - Source database connection: `source_db`
    - Target warehouse connection: `warehouse_db`

    ### SLA
    Must complete by 9 AM daily.
    """,
)

def extract_data(**context):
    """
    Extract data from source system.
    Uses XCom to pass data references between tasks.
    """
    execution_date = context['execution_date']

    # Log execution context for debugging
    context['ti'].log.info(f"Extracting data for {execution_date}")

    # Your extraction logic here
    extracted_path = f"s3://data-lake/raw/{execution_date.strftime('%Y/%m/%d')}"

    # Push result to XCom for downstream tasks
    return extracted_path

def transform_data(**context):
    """
    Transform extracted data.
    Pulls input path from upstream task via XCom.
    """
    ti = context['ti']

    # Pull data reference from extract task
    source_path = ti.xcom_pull(task_ids='extract')
    ti.log.info(f"Transforming data from {source_path}")

    # Your transformation logic here
    transformed_path = source_path.replace('/raw/', '/transformed/')

    return transformed_path

def load_data(**context):
    """
    Load transformed data to warehouse.
    """
    ti = context['ti']
    source_path = ti.xcom_pull(task_ids='transform')
    ti.log.info(f"Loading data from {source_path}")

    # Your loading logic here
    rows_loaded = 10000  # Example

    # Record metrics for monitoring
    ti.log.info(f"Successfully loaded {rows_loaded} rows")
    return rows_loaded

def validate_data(**context):
    """
    Run data quality checks after loading.
    """
    ti = context['ti']
    rows_loaded = ti.xcom_pull(task_ids='load')

    # Data quality assertions
    if rows_loaded < 100:
        raise ValueError(f"Too few rows loaded: {rows_loaded}")

    ti.log.info("Data validation passed")

# Define task flow
with dag:
    start = EmptyOperator(task_id='start')

    extract = PythonOperator(
        task_id='extract',
        python_callable=extract_data,
        provide_context=True,
    )

    transform = PythonOperator(
        task_id='transform',
        python_callable=transform_data,
        provide_context=True,
    )

    load = PythonOperator(
        task_id='load',
        python_callable=load_data,
        provide_context=True,
        # SLA for this critical task
        sla=timedelta(hours=2),
    )

    validate = PythonOperator(
        task_id='validate',
        python_callable=validate_data,
        provide_context=True,
    )

    end = EmptyOperator(
        task_id='end',
        trigger_rule='all_success',
    )

    # Define dependencies
    start >> extract >> transform >> load >> validate >> end
```

## Monitoring and Alerting

Set up comprehensive monitoring to catch issues before they impact your pipelines:

### StatsD Metrics to Prometheus

```yaml
# prometheus/statsd-mapping.yaml
# Map Airflow StatsD metrics to Prometheus format

mappings:
  - match: "airflow.dagrun.duration.success.*"
    name: "airflow_dagrun_duration_success"
    labels:
      dag_id: "$1"

  - match: "airflow.dagrun.duration.failed.*"
    name: "airflow_dagrun_duration_failed"
    labels:
      dag_id: "$1"

  - match: "airflow.dag_processing.total_parse_time"
    name: "airflow_dag_processing_total_parse_time"

  - match: "airflow.scheduler.tasks.running"
    name: "airflow_scheduler_tasks_running"

  - match: "airflow.scheduler.tasks.starving"
    name: "airflow_scheduler_tasks_starving"

  - match: "airflow.pool.open_slots.*"
    name: "airflow_pool_open_slots"
    labels:
      pool: "$1"
```

### Key Metrics to Alert On

```yaml
# alertmanager/airflow-alerts.yaml
# Critical alerts for Airflow operations

groups:
  - name: airflow
    rules:
      # Scheduler health
      - alert: AirflowSchedulerDown
        expr: up{job="airflow-scheduler"} == 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Airflow scheduler is down"

      # Task failures
      - alert: AirflowHighTaskFailureRate
        expr: |
          rate(airflow_ti_failures[1h]) /
          (rate(airflow_ti_failures[1h]) + rate(airflow_ti_successes[1h])) > 0.1
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "Task failure rate exceeds 10%"

      # DAG parsing issues
      - alert: AirflowDAGParseErrors
        expr: airflow_dag_processing_import_errors > 0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "DAG parsing errors detected"

      # Pool exhaustion
      - alert: AirflowPoolExhausted
        expr: airflow_pool_open_slots < 2
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Airflow pool running low on slots"
```

## Database Maintenance

PostgreSQL requires regular maintenance for optimal Airflow performance:

```sql
-- maintenance/cleanup.sql
-- Run these queries periodically to keep your database healthy

-- Clean up old task instances (keep 90 days)
DELETE FROM task_instance
WHERE execution_date < NOW() - INTERVAL '90 days';

-- Clean up old DAG runs
DELETE FROM dag_run
WHERE execution_date < NOW() - INTERVAL '90 days';

-- Clean up old logs
DELETE FROM log
WHERE dttm < NOW() - INTERVAL '30 days';

-- Clean up old XCom data
DELETE FROM xcom
WHERE execution_date < NOW() - INTERVAL '7 days';

-- Vacuum and analyze after cleanup
VACUUM ANALYZE task_instance;
VACUUM ANALYZE dag_run;
VACUUM ANALYZE log;
VACUUM ANALYZE xcom;
```

Automate this with a maintenance DAG:

```python
# dags/maintenance/database_cleanup.py
# Automated database maintenance

from datetime import datetime, timedelta
from airflow import DAG
from airflow.providers.postgres.operators.postgres import PostgresOperator

dag = DAG(
    dag_id='airflow_db_maintenance',
    schedule_interval='0 3 * * 0',  # Weekly on Sunday at 3 AM
    start_date=datetime(2024, 1, 1),
    catchup=False,
    tags=['maintenance'],
)

cleanup = PostgresOperator(
    task_id='cleanup_old_records',
    postgres_conn_id='airflow_db',
    sql="""
        DELETE FROM task_instance WHERE execution_date < NOW() - INTERVAL '90 days';
        DELETE FROM dag_run WHERE execution_date < NOW() - INTERVAL '90 days';
        DELETE FROM log WHERE dttm < NOW() - INTERVAL '30 days';
        DELETE FROM xcom WHERE execution_date < NOW() - INTERVAL '7 days';
    """,
    dag=dag,
)

vacuum = PostgresOperator(
    task_id='vacuum_database',
    postgres_conn_id='airflow_db',
    sql="VACUUM ANALYZE;",
    dag=dag,
)

cleanup >> vacuum
```

## Scaling Considerations

As your workload grows, here is how to scale each component:

```mermaid
flowchart LR
    subgraph "Scale Horizontally"
        workers["Workers<br/>Add more replicas"]
        webserver["Web Server<br/>Add more replicas"]
    end

    subgraph "Scale Vertically"
        scheduler["Scheduler<br/>More CPU/Memory"]
        database["Database<br/>Larger instance"]
    end

    subgraph "Scale Storage"
        logs["Log Storage<br/>Use S3/GCS"]
        metadata["Metadata<br/>Read replicas"]
    end
```

**Workers** - Add more Celery workers as task volume increases. Each worker handles tasks independently.

**Scheduler** - For high DAG counts (500+), increase scheduler resources. Enable multiple schedulers for HA with Airflow 2.x.

**Database** - Use connection pooling (PgBouncer) and read replicas for heavy read loads.

**Logs** - Always use remote logging (S3/GCS) in production to avoid disk space issues.

## Final Checklist

Before going live, verify these items:

- [ ] Fernet key is set and backed up securely
- [ ] Database backups are configured and tested
- [ ] Remote logging is enabled and working
- [ ] Health checks are configured for all services
- [ ] Monitoring and alerting are in place
- [ ] Authentication is enabled with strong passwords
- [ ] TLS is configured for all external access
- [ ] Resource limits are set for all containers
- [ ] DAG cleanup is automated
- [ ] Secrets are stored securely (not in DAG files)

## Wrapping Up

Running Airflow in production requires attention to security, scalability, and operational practices. Start with the Docker Compose setup for smaller deployments, and consider Kubernetes with the official Helm chart as your needs grow. The key is building observability from day one - you cannot fix problems you cannot see.

Focus on writing idempotent, well-documented DAGs and invest time in proper monitoring. Your future self will thank you when debugging that 3 AM production issue.
