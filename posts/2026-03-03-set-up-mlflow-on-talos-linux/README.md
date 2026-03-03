# How to Set Up MLflow on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, MLflow, MLOps, Machine Learning, Kubernetes, Experiment Tracking

Description: Deploy MLflow on Talos Linux for experiment tracking, model registry, and artifact storage in your Kubernetes-based ML infrastructure.

---

MLflow is an open-source platform for managing the end-to-end machine learning lifecycle. It provides experiment tracking, model packaging, a model registry, and deployment tools. Running MLflow on Talos Linux gives your ML team a centralized tracking server on a secure, immutable infrastructure. Every experiment, every model version, and every metric is stored in one place, making it easy to compare results, reproduce experiments, and promote models to production.

This guide covers deploying MLflow on Talos Linux with PostgreSQL for metadata storage, MinIO for artifact storage, and proper ingress configuration for team access.

## Prerequisites

You need:

- A Talos Linux Kubernetes cluster
- kubectl and Helm configured
- A storage provisioner for persistent volumes
- An ingress controller
- Optionally, cert-manager for TLS

## Architecture Overview

The MLflow deployment consists of three components:

1. **MLflow Tracking Server** - The web UI and API that tracks experiments and parameters
2. **PostgreSQL** - Stores experiment metadata, run information, and metrics
3. **MinIO** - S3-compatible object storage for model artifacts and datasets

This separation ensures that metadata queries are fast (PostgreSQL) while large artifacts are stored efficiently (MinIO).

## Deploying MinIO for Artifact Storage

Start with MinIO, which provides S3-compatible storage:

```yaml
# minio-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: minio
  namespace: mlflow
spec:
  replicas: 1
  selector:
    matchLabels:
      app: minio
  template:
    metadata:
      labels:
        app: minio
    spec:
      containers:
        - name: minio
          image: minio/minio:latest
          args:
            - server
            - /data
            - --console-address
            - ":9001"
          ports:
            - containerPort: 9000
              name: api
            - containerPort: 9001
              name: console
          env:
            - name: MINIO_ROOT_USER
              valueFrom:
                secretKeyRef:
                  name: minio-credentials
                  key: access-key
            - name: MINIO_ROOT_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: minio-credentials
                  key: secret-key
          volumeMounts:
            - name: data
              mountPath: /data
          resources:
            requests:
              cpu: 250m
              memory: 512Mi
            limits:
              cpu: "1"
              memory: 2Gi
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: minio-data
---
apiVersion: v1
kind: Service
metadata:
  name: minio
  namespace: mlflow
spec:
  ports:
    - port: 9000
      name: api
    - port: 9001
      name: console
  selector:
    app: minio
```

Create the namespace, secrets, and storage:

```bash
kubectl create namespace mlflow

# Create MinIO credentials
kubectl create secret generic minio-credentials \
  --namespace mlflow \
  --from-literal=access-key=mlflow-minio \
  --from-literal=secret-key='your-minio-secret-key'

# Create PVC for MinIO
kubectl apply -f - <<EOF
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: minio-data
  namespace: mlflow
spec:
  accessModes: ["ReadWriteOnce"]
  storageClassName: local-path
  resources:
    requests:
      storage: 50Gi
EOF

kubectl apply -f minio-deployment.yaml
```

Create the MLflow artifacts bucket:

```bash
# Create the bucket for MLflow artifacts
kubectl run minio-client --rm -it --restart=Never \
  --image=minio/mc:latest \
  --namespace=mlflow \
  -- sh -c "
    mc alias set myminio http://minio:9000 mlflow-minio your-minio-secret-key
    mc mb myminio/mlflow-artifacts
    mc policy set download myminio/mlflow-artifacts
  "
```

## Deploying PostgreSQL

Deploy PostgreSQL for MLflow metadata:

```yaml
# mlflow-postgres.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mlflow-postgres
  namespace: mlflow
spec:
  serviceName: mlflow-postgres
  replicas: 1
  selector:
    matchLabels:
      app: mlflow-postgres
  template:
    metadata:
      labels:
        app: mlflow-postgres
    spec:
      containers:
        - name: postgres
          image: postgres:15
          ports:
            - containerPort: 5432
          env:
            - name: POSTGRES_DB
              value: mlflow
            - name: POSTGRES_USER
              value: mlflow
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: mlflow-db-secret
                  key: password
          volumeMounts:
            - name: data
              mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: local-path
        resources:
          requests:
            storage: 10Gi
---
apiVersion: v1
kind: Service
metadata:
  name: mlflow-postgres
  namespace: mlflow
spec:
  ports:
    - port: 5432
  selector:
    app: mlflow-postgres
  clusterIP: None
```

```bash
# Create the database secret
kubectl create secret generic mlflow-db-secret \
  --namespace mlflow \
  --from-literal=password='your-db-password'

kubectl apply -f mlflow-postgres.yaml
```

## Deploying the MLflow Tracking Server

Now deploy the MLflow tracking server, connecting it to PostgreSQL and MinIO:

```yaml
# mlflow-server.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mlflow-server
  namespace: mlflow
spec:
  replicas: 2
  selector:
    matchLabels:
      app: mlflow-server
  template:
    metadata:
      labels:
        app: mlflow-server
    spec:
      containers:
        - name: mlflow
          image: ghcr.io/mlflow/mlflow:v2.10.0
          command:
            - mlflow
            - server
            - --backend-store-uri
            - postgresql://mlflow:$(DB_PASSWORD)@mlflow-postgres:5432/mlflow
            - --default-artifact-root
            - s3://mlflow-artifacts
            - --host
            - "0.0.0.0"
            - --port
            - "5000"
          ports:
            - containerPort: 5000
              name: http
          env:
            - name: DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: mlflow-db-secret
                  key: password
            - name: MLFLOW_S3_ENDPOINT_URL
              value: "http://minio:9000"
            - name: AWS_ACCESS_KEY_ID
              valueFrom:
                secretKeyRef:
                  name: minio-credentials
                  key: access-key
            - name: AWS_SECRET_ACCESS_KEY
              valueFrom:
                secretKeyRef:
                  name: minio-credentials
                  key: secret-key
          resources:
            requests:
              cpu: 500m
              memory: 512Mi
            limits:
              cpu: "2"
              memory: 2Gi
          readinessProbe:
            httpGet:
              path: /health
              port: 5000
            initialDelaySeconds: 10
            periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: mlflow
  namespace: mlflow
spec:
  ports:
    - port: 5000
      targetPort: 5000
  selector:
    app: mlflow-server
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: mlflow
  namespace: mlflow
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - mlflow.example.com
      secretName: mlflow-tls
  rules:
    - host: mlflow.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: mlflow
                port:
                  number: 5000
```

Apply it:

```bash
kubectl apply -f mlflow-server.yaml
```

## Using MLflow from Training Jobs

Configure your training scripts to log to the MLflow tracking server. Here is an example PyTorch training script:

```python
# train_with_mlflow.py
import mlflow
import mlflow.pytorch
import torch
import torch.nn as nn
import torchvision

# Set the MLflow tracking URI
mlflow.set_tracking_uri("http://mlflow.mlflow.svc.cluster.local:5000")
mlflow.set_experiment("cifar10-classification")

# Set S3 endpoint for artifact storage
import os
os.environ["MLFLOW_S3_ENDPOINT_URL"] = "http://minio.mlflow.svc.cluster.local:9000"
os.environ["AWS_ACCESS_KEY_ID"] = "mlflow-minio"
os.environ["AWS_SECRET_ACCESS_KEY"] = "your-minio-secret-key"

# Start a run
with mlflow.start_run(run_name="resnet18-baseline"):
    # Log hyperparameters
    mlflow.log_params({
        "model": "resnet18",
        "optimizer": "adam",
        "learning_rate": 0.001,
        "batch_size": 64,
        "epochs": 50
    })

    # Training loop
    model = torchvision.models.resnet18(num_classes=10)
    # ... training code ...

    for epoch in range(50):
        train_loss = 0.5 - (epoch * 0.008)
        train_acc = 0.5 + (epoch * 0.009)

        # Log metrics per epoch
        mlflow.log_metrics({
            "train_loss": train_loss,
            "train_accuracy": train_acc,
        }, step=epoch)

    # Log the final model
    mlflow.pytorch.log_model(model, "model")

    # Log additional artifacts
    mlflow.log_artifact("training_report.html")

    print("Run logged to MLflow")
```

Create a Kubernetes job that runs this script:

```yaml
# mlflow-training-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: mlflow-training-example
  namespace: mlflow
spec:
  template:
    spec:
      restartPolicy: OnFailure
      containers:
        - name: training
          image: pytorch/pytorch:2.2.0-cuda12.1-cudnn8-runtime
          command: ["python", "/scripts/train_with_mlflow.py"]
          env:
            - name: MLFLOW_TRACKING_URI
              value: "http://mlflow.mlflow.svc.cluster.local:5000"
            - name: MLFLOW_S3_ENDPOINT_URL
              value: "http://minio.mlflow.svc.cluster.local:9000"
            - name: AWS_ACCESS_KEY_ID
              valueFrom:
                secretKeyRef:
                  name: minio-credentials
                  key: access-key
            - name: AWS_SECRET_ACCESS_KEY
              valueFrom:
                secretKeyRef:
                  name: minio-credentials
                  key: secret-key
          resources:
            limits:
              nvidia.com/gpu: 1
          volumeMounts:
            - name: scripts
              mountPath: /scripts
      volumes:
        - name: scripts
          configMap:
            name: training-scripts
```

## MLflow Model Registry

Use the model registry to manage model versions and promote them through stages:

```python
import mlflow

client = mlflow.MlflowClient("http://mlflow.mlflow.svc.cluster.local:5000")

# Register a model from a run
result = client.create_registered_model("cifar10-classifier")
client.create_model_version(
    name="cifar10-classifier",
    source="s3://mlflow-artifacts/0/abc123/artifacts/model",
    run_id="abc123"
)

# Transition a model version to production
client.transition_model_version_stage(
    name="cifar10-classifier",
    version=1,
    stage="Production"
)
```

## Backing Up MLflow

Back up both the PostgreSQL database and MinIO storage:

```bash
# Backup PostgreSQL
kubectl exec -n mlflow mlflow-postgres-0 -- pg_dump -U mlflow mlflow > mlflow-backup.sql

# Backup MinIO using mc client
mc mirror myminio/mlflow-artifacts ./mlflow-artifacts-backup
```

## Conclusion

MLflow on Talos Linux gives your ML team a centralized experiment tracking and model management platform on secure, immutable infrastructure. With PostgreSQL for fast metadata queries, MinIO for scalable artifact storage, and the MLflow UI for visualization, you have a complete MLOps foundation. Teams can track experiments, compare model performance, and manage model versions through a clean interface, all running on the reliable Kubernetes platform that Talos Linux provides.
