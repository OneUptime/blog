# How to Deploy MLflow on Rancher - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, MLflow, MLOps, Kubernetes, Experiment-tracking

Description: Guide to deploying MLflow on Rancher for ML experiment tracking, model registry, and artifact storage.

## Introduction

MLflow is an open-source MLOps platform for managing the ML lifecycle including experiment tracking, model registry, and deployment. This guide covers deploying a production-ready MLflow instance on Rancher.

## Architecture

MLflow consists of:
- **Tracking Server**: Logs experiments, metrics, parameters
- **Model Registry**: Version and stage management for models
- **Artifact Store**: Storage for model files (S3 or MinIO)
- **Backend Store**: PostgreSQL for metadata

## Step 1: Set Up Backend Storage

```yaml
# postgres-deployment.yaml

apiVersion: apps/v1
kind: Deployment
metadata:
  name: mlflow-postgres
  namespace: mlops
spec:
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
        env:
        - name: POSTGRES_DB
          value: mlflow
        - name: POSTGRES_USER
          value: mlflow
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: mlflow-db-credentials
              key: password
        ports:
        - containerPort: 5432
        volumeMounts:
        - name: pgdata
          mountPath: /var/lib/postgresql/data
      volumes:
      - name: pgdata
        persistentVolumeClaim:
          claimName: mlflow-postgres-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: mlflow-postgres
  namespace: mlops
spec:
  selector:
    app: mlflow-postgres
  ports:
  - port: 5432
```

## Step 2: Deploy MLflow Tracking Server

```yaml
# mlflow-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mlflow-server
  namespace: mlops
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
        image: ghcr.io/mlflow/mlflow:v2.9.2
        command:
        - mlflow
        - server
        args:
        - --backend-store-uri=postgresql://mlflow:$(DB_PASSWORD)@mlflow-postgres:5432/mlflow
        - --default-artifact-root=s3://mlflow-artifacts/mlflow
        - --host=0.0.0.0
        - --port=5000
        - --workers=4
        env:
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: mlflow-db-credentials
              key: password
        - name: AWS_ACCESS_KEY_ID
          valueFrom:
            secretKeyRef:
              name: s3-credentials
              key: accessKey
        - name: AWS_SECRET_ACCESS_KEY
          valueFrom:
            secretKeyRef:
              name: s3-credentials
              key: secretKey
        - name: MLFLOW_S3_ENDPOINT_URL
          value: http://minio.minio.svc.cluster.local:9000
        ports:
        - containerPort: 5000
        readinessProbe:
          httpGet:
            path: /health
            port: 5000
          initialDelaySeconds: 30
---
apiVersion: v1
kind: Service
metadata:
  name: mlflow-server
  namespace: mlops
spec:
  selector:
    app: mlflow-server
  ports:
  - port: 5000
```

## Step 3: Configure Ingress

```yaml
# mlflow-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: mlflow
  namespace: mlops
  annotations:
    nginx.ingress.kubernetes.io/auth-type: basic
    nginx.ingress.kubernetes.io/auth-secret: mlflow-basic-auth
    nginx.ingress.kubernetes.io/auth-realm: 'MLflow Authentication Required'
spec:
  rules:
  - host: mlflow.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: mlflow-server
            port:
              number: 5000
  tls:
  - hosts:
    - mlflow.example.com
    secretName: mlflow-tls
```

## Step 4: Use MLflow from Training Jobs

```python
# training_with_mlflow.py
import mlflow
import mlflow.sklearn
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, f1_score
import numpy as np

# Configure MLflow
mlflow.set_tracking_uri("http://mlflow-server.mlops.svc.cluster.local:5000")
mlflow.set_experiment("classification-experiments")

with mlflow.start_run(run_name="gradient-boosting-v1"):
    # Log parameters
    n_estimators = 200
    max_depth = 5
    learning_rate = 0.1
    
    mlflow.log_params({
        "n_estimators": n_estimators,
        "max_depth": max_depth,
        "learning_rate": learning_rate,
        "dataset": "processed_v2"
    })
    
    # Train model
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)
    
    model = GradientBoostingClassifier(
        n_estimators=n_estimators,
        max_depth=max_depth,
        learning_rate=learning_rate
    )
    model.fit(X_train, y_train)
    
    # Log metrics
    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred, average='weighted')
    
    mlflow.log_metrics({
        "accuracy": accuracy,
        "f1_score": f1
    })
    
    # Log model
    mlflow.sklearn.log_model(
        model,
        "gradient-boosting-model",
        registered_model_name="production-classifier"
    )
    
    print(f"Run completed: accuracy={accuracy:.4f}, f1={f1:.4f}")
```

## Step 5: Model Registry Workflow

```python
# promote_model.py - Promote model through stages
import mlflow
from mlflow.tracking import MlflowClient

client = MlflowClient("http://mlflow.example.com")

# Get latest model version
model_name = "production-classifier"
latest_versions = client.get_latest_versions(model_name)

for version in latest_versions:
    if version.current_stage == "Staging":
        # Promote to production
        client.transition_model_version_stage(
            name=model_name,
            version=version.version,
            stage="Production",
            archive_existing_versions=True
        )
        print(f"Promoted v{version.version} to Production")
```

## Monitoring MLflow

```bash
# Check MLflow server health
curl -s http://mlflow.example.com/health

# View experiments via CLI
mlflow experiments search   --tracking-uri http://mlflow.example.com

# Count runs per experiment (use experiment ID from the search above)
mlflow runs list   --experiment-id 1   --tracking-uri http://mlflow.example.com
```

## Conclusion

MLflow on Rancher provides a centralized platform for tracking ML experiments, managing models through staging environments, and storing artifacts in scalable object storage. With PostgreSQL as the backend and S3/MinIO for artifacts, this setup handles thousands of experiments reliably.
