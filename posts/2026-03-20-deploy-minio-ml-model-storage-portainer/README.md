# How to Deploy MinIO for ML Model Storage via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MinIO, S3, Machine Learning, Portainer, Docker, Object Storage, MLOps

Description: Deploy MinIO as an S3-compatible object store via Portainer to serve as persistent storage for ML datasets, trained models, and experiment artifacts.

---

MinIO is a high-performance, S3-compatible object store that you can self-host. For ML workloads, it stores training datasets, model checkpoints, experiment artifacts, and serialized models - all accessible via the standard AWS S3 API that every ML framework understands.

## Step 1: Deploy MinIO via Portainer Stack

```yaml
# minio-ml-storage-stack.yml

version: "3.8"

services:
  minio:
    image: minio/minio:RELEASE.2024-01-31T20-20-33Z
    command: server /data --console-address ":9001"
    environment:
      # Change these credentials before deploying
      - MINIO_ROOT_USER=ml-admin
      - MINIO_ROOT_PASSWORD=secure_password_here
    volumes:
      - minio-data:/data
    ports:
      - "9000:9000"    # S3 API endpoint
      - "9001:9001"    # MinIO web console
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped
    networks:
      - ml-storage

  # Create default buckets on startup
  minio-init:
    image: minio/mc:latest
    depends_on:
      minio:
        condition: service_healthy
    entrypoint: >
      /bin/sh -c "
        mc alias set local http://minio:9000 ml-admin secure_password_here;
        mc mb --ignore-existing local/ml-datasets;
        mc mb --ignore-existing local/ml-models;
        mc mb --ignore-existing local/ml-artifacts;
        mc mb --ignore-existing local/mlflow;
        echo 'Buckets created successfully';
      "
    networks:
      - ml-storage

volumes:
  minio-data:

networks:
  ml-storage:
    driver: bridge
```

## Step 2: Use MinIO with Python ML Libraries

Configure your ML scripts to use MinIO as an S3 backend:

```python
# ml_storage.py - unified storage client for ML workflows
import boto3
from botocore.client import Config

# Connect to MinIO using boto3 (the AWS S3 client)
s3_client = boto3.client(
    "s3",
    endpoint_url="http://localhost:9000",      # MinIO endpoint
    aws_access_key_id="ml-admin",
    aws_secret_access_key="secure_password_here",
    config=Config(signature_version="s3v4"),
    region_name="us-east-1"                    # Required but not used by MinIO
)

def upload_model(local_path: str, model_name: str, version: str):
    """Upload a trained model to MinIO."""
    s3_key = f"models/{model_name}/v{version}/model.pkl"
    s3_client.upload_file(local_path, "ml-models", s3_key)
    print(f"Model uploaded to minio://ml-models/{s3_key}")
    return s3_key

def download_model(model_name: str, version: str, local_path: str):
    """Download a model from MinIO for inference."""
    s3_key = f"models/{model_name}/v{version}/model.pkl"
    s3_client.download_file("ml-models", s3_key, local_path)
    print(f"Model downloaded to {local_path}")

def upload_dataset(local_path: str, dataset_name: str):
    """Upload a dataset to MinIO."""
    s3_key = f"datasets/{dataset_name}"
    s3_client.upload_file(local_path, "ml-datasets", s3_key)
```

## Step 3: Integrate with MLflow

Configure MLflow to use MinIO for artifact storage:

```bash
# Set environment variables for your training containers
# (add these in Portainer's stack environment variables)
MLFLOW_S3_ENDPOINT_URL=http://minio:9000
AWS_ACCESS_KEY_ID=ml-admin
AWS_SECRET_ACCESS_KEY=secure_password_here
```

```python
import mlflow

# MLflow automatically uses the configured S3/MinIO backend for artifacts
mlflow.set_tracking_uri("http://mlflow:5000")

with mlflow.start_run():
    # Log model - artifacts go to MinIO automatically
    mlflow.sklearn.log_model(model, "model", registered_model_name="my-model")
```

## Step 4: Set Up Lifecycle Policies

Use MinIO lifecycle rules to automatically clean up old artifacts:

```bash
# Create a lifecycle policy using mc (MinIO client)
# Run this via Portainer's container console in the minio-init service

# Delete objects in ml-artifacts bucket older than 90 days
mc ilm rule add \
  --expire-days 90 \
  local/ml-artifacts

# Transition old model versions to a remote tier after 30 days.
# First create the remote tier (e.g., AWS S3 Glacier), then reference it by name.
mc ilm tier add s3 local GLACIER_TIER \
  --endpoint https://s3.amazonaws.com \
  --access-key AKIA... \
  --secret-key ... \
  --bucket my-glacier-bucket \
  --storage-class GLACIER

mc ilm rule add \
  --transition-days 30 \
  --transition-tier GLACIER_TIER \
  local/ml-models
```

## Step 5: Monitor Storage Usage

Access the MinIO Console at `http://<host>:9001` to:

- View bucket sizes and object counts
- Monitor request rates and throughput
- Set up event notifications for model uploads
- Manage access policies per bucket

## Summary

MinIO provides S3-compatible object storage for ML workflows without cloud vendor lock-in. Deployed via Portainer, it integrates seamlessly with MLflow, PyTorch, TensorFlow, and any tool that speaks S3, giving your ML pipeline reliable, self-hosted model and dataset storage.
