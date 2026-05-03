# How to Deploy MLflow via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MLflow, Machine Learning, Portainer, Docker, Experiment Tracking, MLOps, Python

Description: Deploy MLflow tracking server with PostgreSQL metadata storage and S3-compatible artifact storage using Portainer to manage machine learning experiments and model registry.

---

MLflow is the standard open-source platform for managing the ML lifecycle - experiment tracking, model packaging, and model registry. Deploying it via Portainer gives your ML team a persistent, team-shared tracking server with proper backend storage.

## Step 1: Deploy the MLflow Stack

```yaml
# mlflow-stack.yml

version: "3.8"

services:
  mlflow:
    image: ghcr.io/mlflow/mlflow:v2.11.0
    command: >
      mlflow server
      --backend-store-uri postgresql://mlflow:mlflow_pw@postgres:5432/mlflow
      --default-artifact-root s3://mlflow-artifacts
      --host 0.0.0.0
      --port 5000
    environment:
      # S3-compatible artifact storage (using MinIO here)
      - MLFLOW_S3_ENDPOINT_URL=http://minio:9000
      - AWS_ACCESS_KEY_ID=minio_access
      - AWS_SECRET_ACCESS_KEY=minio_secret
    ports:
      - "5000:5000"
    depends_on:
      - postgres
      - minio
    restart: unless-stopped
    networks:
      - mlflow-net

  postgres:
    image: postgres:16-alpine
    environment:
      - POSTGRES_DB=mlflow
      - POSTGRES_USER=mlflow
      - POSTGRES_PASSWORD=mlflow_pw
    volumes:
      - postgres-data:/var/lib/postgresql/data
    restart: unless-stopped
    networks:
      - mlflow-net

  minio:
    image: minio/minio:RELEASE.2024-01-31T20-20-33Z
    command: server /data --console-address ":9001"
    environment:
      - MINIO_ROOT_USER=minio_access
      - MINIO_ROOT_PASSWORD=minio_secret
    volumes:
      - minio-data:/data
    ports:
      - "9000:9000"    # S3 API
      - "9001:9001"    # MinIO Console
    restart: unless-stopped
    networks:
      - mlflow-net

  # Create the MLflow bucket in MinIO on startup
  minio-init:
    image: minio/mc:latest
    depends_on:
      - minio
    entrypoint: >
      /bin/sh -c "
      sleep 5;
      mc alias set local http://minio:9000 minio_access minio_secret;
      mc mb --ignore-existing local/mlflow-artifacts;
      exit 0;
      "
    networks:
      - mlflow-net

volumes:
  postgres-data:
  minio-data:

networks:
  mlflow-net:
    driver: bridge
```

## Step 2: Log Experiments from Python

Configure your ML scripts to log to the Portainer-deployed MLflow server:

```python
import mlflow
import mlflow.sklearn
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score
from sklearn.datasets import load_iris
from sklearn.model_selection import train_test_split

# Point MLflow at your Portainer-deployed server
mlflow.set_tracking_uri("http://localhost:5000")
mlflow.set_experiment("iris-classification")

with mlflow.start_run(run_name="random-forest-v1"):
    # Log hyperparameters
    n_estimators = 100
    max_depth = 5
    mlflow.log_param("n_estimators", n_estimators)
    mlflow.log_param("max_depth", max_depth)

    # Train model
    X, y = load_iris(return_X_y=True)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)
    model = RandomForestClassifier(n_estimators=n_estimators, max_depth=max_depth)
    model.fit(X_train, y_train)

    # Log metrics
    accuracy = accuracy_score(y_test, model.predict(X_test))
    mlflow.log_metric("accuracy", accuracy)

    # Log the trained model to the registry
    mlflow.sklearn.log_model(model, "random-forest-model")
    print(f"Run logged with accuracy: {accuracy:.4f}")
```

## Step 3: Register and Serve Models

After training, register the best model:

```python
# Register model in the MLflow Model Registry
mlflow.register_model(
    "runs:/your-run-id/random-forest-model",
    "IrisClassifier"
)

# Transition to production stage
client = mlflow.tracking.MlflowClient()
client.transition_model_version_stage(
    name="IrisClassifier",
    version=1,
    stage="Production"
)
```

Serve the model as a REST API:

```bash
# Run this via a Portainer stack or container
mlflow models serve \
  -m models:/IrisClassifier/Production \
  -p 8080 \
  --env-manager conda
```

## Step 4: Access the MLflow UI

Open `http://<host>:5000` to view:

- All experiments and runs
- Parameter and metric comparisons
- Artifact browser (links to MinIO)
- Model registry with version history

## Summary

MLflow deployed via Portainer gives ML teams a shared, persistent experiment tracking and model registry. The PostgreSQL backend ensures metadata durability, and MinIO provides scalable artifact storage - all managed as a single Portainer stack.
