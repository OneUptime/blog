# How to Deploy MLflow on Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, MLflow, Machine Learning, Experiment Tracking, Model Registry, MLOps

Description: Deploy MLflow on Rancher with PostgreSQL backend, S3 artifact storage, and the tracking UI for managing ML experiments and model versions.

## Introduction

MLflow is an open-source platform for managing the ML lifecycle: experiment tracking, model packaging, and model registry. Deploying MLflow on Rancher provides a centralized, team-accessible platform for data scientists to log experiments and manage model versions.

## Architecture

MLflow requires:
- **Tracking Server**: Web UI and REST API
- **Backend Store**: PostgreSQL for experiment metadata
- **Artifact Store**: S3 for model files and artifacts

## Step 1: Create PostgreSQL Database

```bash
helm repo add bitnami https://charts.bitnami.com/bitnami
helm install postgresql bitnami/postgresql \
  --namespace mlflow \
  --create-namespace \
  --set auth.postgresPassword=mlflowpassword \
  --set auth.database=mlflow
```

## Step 2: Create S3 Bucket and Credentials

```bash
# Create the MLflow artifacts bucket

aws s3 mb s3://mlflow-artifacts

# Create Kubernetes secret with S3 credentials
kubectl create secret generic mlflow-s3-credentials \
  --from-literal=AWS_ACCESS_KEY_ID=YOUR_ACCESS_KEY \
  --from-literal=AWS_SECRET_ACCESS_KEY=YOUR_SECRET_KEY \
  -n mlflow
```

## Step 3: Deploy MLflow

```yaml
# mlflow-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mlflow
  namespace: mlflow
spec:
  replicas: 2
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
          image: ghcr.io/mlflow/mlflow:v2.12.1
          command:
            - mlflow
            - server
            - --backend-store-uri
            - postgresql://postgres:mlflowpassword@postgresql.mlflow.svc.cluster.local/mlflow
            - --default-artifact-root
            - s3://mlflow-artifacts
            - --host
            - "0.0.0.0"
            - --port
            - "5000"
          ports:
            - containerPort: 5000
          envFrom:
            - secretRef:
                name: mlflow-s3-credentials
          env:
            - name: MLFLOW_S3_ENDPOINT_URL
              value: "https://s3.amazonaws.com"
```

## Step 4: Create Service and Ingress

```yaml
---
apiVersion: v1
kind: Service
metadata:
  name: mlflow
  namespace: mlflow
spec:
  selector:
    app: mlflow
  ports:
    - port: 5000
      targetPort: 5000
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

## Step 5: Log an Experiment

```python
# training.py - Log experiments to MLflow
import mlflow
import mlflow.sklearn
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score

# Set MLflow tracking server
mlflow.set_tracking_uri("https://mlflow.example.com")
mlflow.set_experiment("iris-classification")

with mlflow.start_run():
    # Log parameters
    mlflow.log_param("n_estimators", 100)
    mlflow.log_param("max_depth", 5)

    # Train model
    model = RandomForestClassifier(n_estimators=100, max_depth=5)
    model.fit(X_train, y_train)

    # Log metrics
    accuracy = accuracy_score(y_test, model.predict(X_test))
    mlflow.log_metric("accuracy", accuracy)

    # Log model
    mlflow.sklearn.log_model(model, "random-forest-model")
```

## Conclusion

MLflow on Rancher centralizes experiment tracking and model management for ML teams. PostgreSQL provides reliable metadata storage with ACID guarantees, while S3 artifact storage scales to handle large model files and datasets. The web UI makes comparing experiments and promoting model versions accessible to the entire team.
