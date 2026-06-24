# How to Set Up a Machine Learning Pipeline with Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Machine Learning, MLOps, Portainer, Docker, Pipeline, Airflow, MLflow

Description: Build an end-to-end machine learning pipeline using Portainer stacks, connecting data ingestion, training, evaluation, and model serving components into a managed workflow.

---

A production ML pipeline covers data ingestion, preprocessing, training, evaluation, and model registration - all as repeatable, automated stages. This guide shows how to deploy this pipeline using Portainer stacks with Airflow for orchestration and MLflow for experiment tracking.

## Pipeline Architecture

```mermaid
graph LR
    DataSource[Data Sources] --> Ingestion[Data Ingestion Container]
    Ingestion --> Storage[MinIO Object Store]
    Storage --> Training[Training Container]
    Training --> Evaluation[Evaluation Container]
    Training --> MLflow[MLflow Tracker]
    Evaluation --> MLflow
    Airflow[Airflow Orchestrator] --> Ingestion
    Airflow --> Training
    Airflow --> Evaluation
```

## Step 1: Deploy the Pipeline Infrastructure

```yaml
# ml-pipeline-stack.yml

version: "3.8"

services:
  airflow-init:
    image: apache/airflow:2.8.1
    entrypoint: /bin/bash
    command:
      - -c
      - |
        set -e
        airflow db migrate
        airflow users create \
          --username admin \
          --firstname Airflow \
          --lastname Admin \
          --role Admin \
          --email admin@example.com \
          --password airflowadmin || true
    environment:
      - AIRFLOW__CORE__EXECUTOR=LocalExecutor
      - AIRFLOW__DATABASE__SQL_ALCHEMY_CONN=postgresql+psycopg2://airflow:airflow@postgres:5432/airflow
      - AIRFLOW__CORE__FERNET_KEY=MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=
      - _PIP_ADDITIONAL_REQUIREMENTS=apache-airflow-providers-docker==3.12.0
    volumes:
      - /opt/airflow/dags:/opt/airflow/dags
      - /opt/airflow/logs:/opt/airflow/logs
    depends_on:
      - postgres
    restart: on-failure
    networks:
      - ml-pipeline

  # Workflow orchestrator
  airflow-webserver:
    image: apache/airflow:2.8.1
    command: webserver
    environment:
      - AIRFLOW__CORE__EXECUTOR=LocalExecutor
      - AIRFLOW__DATABASE__SQL_ALCHEMY_CONN=postgresql+psycopg2://airflow:airflow@postgres:5432/airflow
      - AIRFLOW__CORE__FERNET_KEY=MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=
      - _PIP_ADDITIONAL_REQUIREMENTS=apache-airflow-providers-docker==3.12.0
    volumes:
      - /opt/airflow/dags:/opt/airflow/dags
      - /opt/airflow/logs:/opt/airflow/logs
    ports:
      - "8080:8080"
    depends_on:
      - postgres
      - airflow-init
    restart: unless-stopped
    networks:
      - ml-pipeline

  airflow-scheduler:
    image: apache/airflow:2.8.1
    command: scheduler
    environment:
      - AIRFLOW__CORE__EXECUTOR=LocalExecutor
      - AIRFLOW__DATABASE__SQL_ALCHEMY_CONN=postgresql+psycopg2://airflow:airflow@postgres:5432/airflow
      - AIRFLOW__CORE__FERNET_KEY=MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=
      - _PIP_ADDITIONAL_REQUIREMENTS=apache-airflow-providers-docker==3.12.0
    volumes:
      - /opt/airflow/dags:/opt/airflow/dags
      - /opt/airflow/logs:/opt/airflow/logs
      - /var/run/docker.sock:/var/run/docker.sock
    depends_on:
      - postgres
      - airflow-init
    restart: unless-stopped
    networks:
      - ml-pipeline

  # Experiment tracking
  mlflow:
    image: ghcr.io/mlflow/mlflow:v2.11.0
    command: >
      mlflow server
      --backend-store-uri postgresql://mlflow:mlflow@postgres:5432/mlflow
      --artifacts-destination s3://ml-artifacts
      --serve-artifacts
      --host 0.0.0.0
    environment:
      - MLFLOW_S3_ENDPOINT_URL=http://minio:9000
      - AWS_ACCESS_KEY_ID=minio
      - AWS_SECRET_ACCESS_KEY=minio_secret
    ports:
      - "5000:5000"
    depends_on:
      - postgres
      - minio
      - minio-create-bucket
    restart: unless-stopped
    networks:
      - ml-pipeline

  minio-create-bucket:
    image: minio/mc:latest
    entrypoint: /bin/sh
    command:
      - -c
      - |
        set -e
        mc alias set local http://minio:9000 minio minio_secret
        mc mb --ignore-existing local/ml-artifacts
    depends_on:
      - minio
    restart: on-failure
    networks:
      - ml-pipeline

  # Object storage for datasets and artifacts
  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      - MINIO_ROOT_USER=minio
      - MINIO_ROOT_PASSWORD=minio_secret
    volumes:
      - minio-data:/data
    ports:
      - "9000:9000"
      - "9001:9001"
    restart: unless-stopped
    networks:
      - ml-pipeline

  postgres:
    image: postgres:16-alpine
    environment:
      - POSTGRES_PASSWORD=postgres_pw
    volumes:
      - /opt/ml-pipeline/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
      - postgres-data:/var/lib/postgresql/data
    restart: unless-stopped
    networks:
      - ml-pipeline

volumes:
  minio-data:
  postgres-data:

networks:
  ml-pipeline:
    name: ml-pipeline
    driver: bridge
```

```sql
-- /opt/ml-pipeline/init.sql

CREATE USER airflow WITH PASSWORD 'airflow';
CREATE DATABASE airflow OWNER airflow;

CREATE USER mlflow WITH PASSWORD 'mlflow';
CREATE DATABASE mlflow OWNER mlflow;
```

## Step 2: Create the Airflow Training DAG

```python
# /opt/airflow/dags/ml_training_pipeline.py
from datetime import datetime, timedelta
from airflow import DAG
from airflow.providers.docker.operators.docker import DockerOperator

# Define the training pipeline as an Airflow DAG
default_args = {
    "owner": "ml-team",
    "retries": 2,
    "retry_delay": timedelta(minutes=5)
}

with DAG(
    "ml_training_pipeline",
    default_args=default_args,
    schedule="@daily",
    start_date=datetime(2026, 1, 1),
    catchup=False
) as dag:

    # Stage 1: Ingest fresh training data
    ingest_data = DockerOperator(
        task_id="ingest_data",
        image="myregistry/data-ingestion:latest",
        network_mode="ml-pipeline",
        mount_tmp_dir=False,
        environment={
            "MINIO_ENDPOINT": "minio:9000",
            "DATASET_VERSION": "{{ ds }}"
        }
    )

    # Stage 2: Run model training
    train_model = DockerOperator(
        task_id="train_model",
        image="myregistry/model-trainer:latest",
        network_mode="ml-pipeline",
        mount_tmp_dir=False,
        environment={
            "MLFLOW_TRACKING_URI": "http://mlflow:5000",
            "DATASET_DATE": "{{ ds }}"
        }
    )

    # Stage 3: Evaluate and promote model
    evaluate_model = DockerOperator(
        task_id="evaluate_model",
        image="myregistry/model-evaluator:latest",
        network_mode="ml-pipeline",
        mount_tmp_dir=False,
        environment={
            "MLFLOW_TRACKING_URI": "http://mlflow:5000",
            "ACCURACY_THRESHOLD": "0.95"
        }
    )

    # Define pipeline order
    ingest_data >> train_model >> evaluate_model
```

## Step 3: Access the Pipeline UIs

After deploying the stack and waiting for `airflow-init` to finish:

- **Airflow UI**: `http://<host>:8080` - sign in with `admin` / `airflowadmin`, then trigger and monitor pipeline runs
- **MLflow UI**: `http://<host>:5000` - view experiments and model registry
- **MinIO Console**: `http://<host>:9001` - manage datasets and artifacts

## Summary

An ML pipeline deployed via Portainer stacks gives your team a reproducible, auditable, and automated model development workflow. All components are managed as a single unit, and updates are straightforward through Portainer's stack management interface.
