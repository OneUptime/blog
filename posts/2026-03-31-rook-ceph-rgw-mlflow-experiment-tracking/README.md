# How to Use Ceph RGW with MLflow for Experiment Tracking

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, MLflow, Experiment Tracking, S3, Machine Learning

Description: Configure MLflow to use Ceph RGW as its S3-compatible artifact store for tracking ML experiments, models, and metrics in a self-hosted Kubernetes environment.

---

## Overview

MLflow is a popular platform for tracking ML experiments. By default it uses local disk or cloud S3 for artifact storage. Ceph RGW provides a self-hosted S3-compatible backend that stores all MLflow artifacts in your Ceph cluster.

## Set Up Ceph RGW User for MLflow

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  radosgw-admin user create \
  --uid=mlflow \
  --display-name="MLflow Tracking Server" \
  --max-buckets=100

# Get credentials
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  radosgw-admin user info --uid=mlflow | \
  python3 -c "
import sys, json
u = json.load(sys.stdin)
print('Access Key:', u['keys'][0]['access_key'])
print('Secret Key:', u['keys'][0]['secret_key'])
"
```

Create the MLflow artifacts bucket:

```bash
export AWS_ENDPOINT_URL=http://rook-ceph-rgw-my-store.rook-ceph.svc
aws s3 mb s3://mlflow-artifacts --endpoint-url $AWS_ENDPOINT_URL
aws s3 mb s3://mlflow-models --endpoint-url $AWS_ENDPOINT_URL
```

## Deploy MLflow Tracking Server

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mlflow-tracking-server
  namespace: mlflow
spec:
  replicas: 1
  selector:
    matchLabels:
      app: mlflow
  template:
    metadata:
      labels:
        app: mlflow
    spec:
      containers:
        - name: mlflow
          image: ghcr.io/mlflow/mlflow:v2.11.0
          command:
            - mlflow
            - server
            - --host=0.0.0.0
            - --port=5000
            - --backend-store-uri=postgresql://mlflow:password@postgres/mlflow
            - --default-artifact-root=s3://mlflow-artifacts/
            - --serve-artifacts
          env:
            - name: MLFLOW_S3_ENDPOINT_URL
              value: http://rook-ceph-rgw-my-store.rook-ceph.svc
            - name: AWS_ACCESS_KEY_ID
              valueFrom:
                secretKeyRef:
                  name: mlflow-s3-secret
                  key: access_key
            - name: AWS_SECRET_ACCESS_KEY
              valueFrom:
                secretKeyRef:
                  name: mlflow-s3-secret
                  key: secret_key
```

## Log Artifacts from Training Code

```python
import mlflow
import os

# Configure MLflow to use Ceph
os.environ["MLFLOW_S3_ENDPOINT_URL"] = "http://rook-ceph-rgw-my-store.rook-ceph.svc"
os.environ["AWS_ACCESS_KEY_ID"] = "your-access-key"
os.environ["AWS_SECRET_ACCESS_KEY"] = "your-secret-key"

mlflow.set_tracking_uri("http://mlflow-tracking-server.mlflow.svc:5000")
mlflow.set_experiment("image-classification")

with mlflow.start_run():
    # Log hyperparameters
    mlflow.log_params({"lr": 0.001, "batch_size": 64, "epochs": 100})

    # Train model
    # ... training loop ...

    # Log metrics
    mlflow.log_metric("train_loss", 0.021, step=100)
    mlflow.log_metric("val_accuracy", 0.987, step=100)

    # Log model - stored in Ceph RGW
    mlflow.pytorch.log_model(model, "model")

    # Log artifacts
    mlflow.log_artifact("confusion_matrix.png")
```

## Query Experiments Programmatically

```python
import mlflow

client = mlflow.MlflowClient("http://mlflow-tracking-server.mlflow.svc:5000")

# Get best run
runs = client.search_runs(
    experiment_ids=["1"],
    filter_string="metrics.val_accuracy > 0.98",
    order_by=["metrics.val_accuracy DESC"],
    max_results=5
)

for run in runs:
    print(f"Run: {run.info.run_id}, Accuracy: {run.data.metrics['val_accuracy']}")
    print(f"Artifact URI: {run.info.artifact_uri}")
```

## Summary

Ceph RGW integrates with MLflow as a drop-in S3-compatible artifact backend by setting `MLFLOW_S3_ENDPOINT_URL` to the RGW endpoint. All experiment artifacts and model checkpoints are stored in Ceph with replication and CRUSH placement, while metrics and parameters remain in the PostgreSQL backend store. This eliminates cloud storage costs while providing enterprise storage features for your ML experiment tracking platform.
