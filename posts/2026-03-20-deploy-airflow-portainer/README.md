# How to Deploy Apache Airflow via Portainer - Deploy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Apache Airflow, Workflow, Docker, Data Engineering

Description: Deploy Apache Airflow workflow orchestration platform using Portainer for data pipeline scheduling.

## Introduction

Apache Airflow is a platform to programmatically author, schedule, and monitor data pipelines as DAGs (Directed Acyclic Graphs). This guide deploys Airflow using the official `apache/airflow` Docker image via a Portainer Stack.

## Prerequisites

- Portainer installed with Docker
- At least 4 GB RAM available

## Step 1: Create the Stack in Portainer

Navigate to **Stacks** > **Add Stack**:

```yaml
# docker-compose.yml - Apache Airflow (LocalExecutor)

version: "3.8"

x-airflow-common: &airflow-common
  image: apache/airflow:2.9.3
  environment:
    - AIRFLOW__CORE__EXECUTOR=LocalExecutor
    - AIRFLOW__DATABASE__SQL_ALCHEMY_CONN=postgresql+psycopg2://airflow:${POSTGRES_PASSWORD}@postgres:5432/airflow
    - AIRFLOW__CORE__FERNET_KEY=${FERNET_KEY}
    - AIRFLOW__WEBSERVER__SECRET_KEY=${WEBSERVER_SECRET_KEY}
    - AIRFLOW__CORE__DAGS_ARE_PAUSED_AT_CREATION=true
    - AIRFLOW__CORE__LOAD_EXAMPLES=false
  volumes:
    - airflow_dags:/opt/airflow/dags
    - airflow_logs:/opt/airflow/logs
    - airflow_plugins:/opt/airflow/plugins
  depends_on:
    postgres:
      condition: service_healthy

services:
  postgres:
    image: postgres:16-alpine
    container_name: airflow_postgres
    restart: unless-stopped
    environment:
      - POSTGRES_USER=airflow
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=airflow
    volumes:
      - airflow_postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U airflow"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - airflow_net

  airflow-webserver:
    <<: *airflow-common
    container_name: airflow_webserver
    restart: unless-stopped
    ports:
      - "8080:8080"
    command: webserver
    healthcheck:
      test: ["CMD", "curl", "--fail", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 5
    networks:
      - airflow_net

  airflow-scheduler:
    <<: *airflow-common
    container_name: airflow_scheduler
    restart: unless-stopped
    command: scheduler
    networks:
      - airflow_net

  airflow-init:
    <<: *airflow-common
    container_name: airflow_init
    command: >
      bash -c "airflow db migrate && airflow users create
        --username admin --password ${ADMIN_PASSWORD}
        --firstname Admin --lastname User
        --role Admin --email admin@example.com"
    restart: on-failure
    networks:
      - airflow_net

volumes:
  airflow_dags:
  airflow_logs:
  airflow_plugins:
  airflow_postgres_data:

networks:
  airflow_net:
    driver: bridge
```

## Step 2: Set Environment Variables in Portainer

```text
POSTGRES_PASSWORD=your-secure-postgres-password
FERNET_KEY=<base64-32-byte-key>
WEBSERVER_SECRET_KEY=your-webserver-secret
ADMIN_PASSWORD=your-admin-password
```

Generate a Fernet key:

```bash
python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

## Step 3: Access the Airflow UI

Open `http://<host>:8080` and log in with `admin` / your `ADMIN_PASSWORD`.

## Step 4: Add a DAG

Place a Python DAG file in the `airflow_dags` volume:

```python
# example_dag.py
from airflow import DAG
from airflow.operators.python import PythonOperator
from datetime import datetime

def print_hello():
    print("Hello from Airflow!")

with DAG(
    dag_id="hello_world",
    start_date=datetime(2024, 1, 1),
    schedule="@daily",
    catchup=False,
) as dag:
    task = PythonOperator(
        task_id="say_hello",
        python_callable=print_hello,
    )
```

```bash
# Copy DAG into the volume
docker cp example_dag.py airflow_webserver:/opt/airflow/dags/
```

## Step 5: Monitor and Trigger DAGs

```bash
# List DAGs
docker exec airflow_scheduler airflow dags list

# Trigger a DAG manually
docker exec airflow_scheduler airflow dags trigger hello_world

# Check task logs from the logs volume
docker exec airflow_scheduler ls /opt/airflow/logs/dag_id=hello_world/
```

## Conclusion

Apache Airflow with `LocalExecutor` is suitable for single-node deployments. The `x-airflow-common` YAML anchor avoids duplicating environment variables across services. For production workloads requiring horizontal scaling, replace `LocalExecutor` with `CeleryExecutor` and add a Redis broker and Celery worker services.
