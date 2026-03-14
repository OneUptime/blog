# How to Deploy a Model Registry with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, MLflow, Model Registry, MLOps, Machine Learning

Description: Deploy an ML model registry to Kubernetes using Flux CD to centralize model versioning, lineage tracking, and promotion workflows.

---

## Introduction

An ML model registry is the single source of truth for trained model artifacts, versions, and metadata. It bridges the gap between model training and model serving, providing a governed workflow for registering, reviewing, and promoting models to production. MLflow is the most widely adopted open-source option, offering a rich UI, REST API, and integrations with major ML frameworks.

Deploying MLflow's model registry on Kubernetes through Flux CD ensures the registry itself is managed with the same GitOps rigor you apply to your applications. Database credentials, storage backends, and service configuration are all version-controlled and automatically reconciled.

This guide covers deploying MLflow with a PostgreSQL backend and S3-compatible artifact store using Flux CD.

## Prerequisites

- Kubernetes cluster with Flux CD v2 bootstrapped to your Git repository
- A PostgreSQL database (or the ability to deploy one in-cluster)
- An S3-compatible object store (AWS S3, MinIO, or GCS) for artifact storage
- kubectl access to the cluster

## Step 1: Create the Namespace and Secrets

```yaml
# clusters/my-cluster/mlflow/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: mlflow
  labels:
    app.kubernetes.io/managed-by: flux
```

Create secrets for database and storage credentials (use SOPS or External Secrets in production):

```bash
kubectl create secret generic mlflow-db \
  --from-literal=MLFLOW_DB_URL="postgresql://mlflow:password@postgres:5432/mlflow" \
  -n mlflow

kubectl create secret generic mlflow-s3 \
  --from-literal=AWS_ACCESS_KEY_ID=minio-access-key \
  --from-literal=AWS_SECRET_ACCESS_KEY=minio-secret-key \
  -n mlflow
```

## Step 2: Deploy MLflow Tracking Server

```yaml
# clusters/my-cluster/mlflow/deployment.yaml
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
          image: ghcr.io/mlflow/mlflow:v2.11.3
          command:
            - mlflow
            - server
            - "--host=0.0.0.0"
            - "--port=5000"
            # PostgreSQL backend for experiment tracking
            - "--backend-store-uri=$(MLFLOW_DB_URL)"
            # S3 artifact store
            - "--default-artifact-root=s3://mlflow-artifacts/"
            # Serve artifact proxy for UI downloads
            - "--serve-artifacts"
            - "--artifacts-destination=s3://mlflow-artifacts/"
          ports:
            - containerPort: 5000
              name: http
          env:
            - name: MLFLOW_DB_URL
              valueFrom:
                secretKeyRef:
                  name: mlflow-db
                  key: MLFLOW_DB_URL
            - name: AWS_ACCESS_KEY_ID
              valueFrom:
                secretKeyRef:
                  name: mlflow-s3
                  key: AWS_ACCESS_KEY_ID
            - name: AWS_SECRET_ACCESS_KEY
              valueFrom:
                secretKeyRef:
                  name: mlflow-s3
                  key: AWS_SECRET_ACCESS_KEY
            # MinIO endpoint override (remove for AWS S3)
            - name: MLFLOW_S3_ENDPOINT_URL
              value: "http://minio.minio.svc.cluster.local:9000"
          readinessProbe:
            httpGet:
              path: /health
              port: 5000
            initialDelaySeconds: 15
            periodSeconds: 10
          resources:
            requests:
              memory: "512Mi"
              cpu: "250m"
            limits:
              memory: "1Gi"
              cpu: "1"
```

## Step 3: Expose MLflow Service and Ingress

```yaml
# clusters/my-cluster/mlflow/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: mlflow
  namespace: mlflow
spec:
  selector:
    app: mlflow
  ports:
    - name: http
      port: 5000
      targetPort: 5000
---
# clusters/my-cluster/mlflow/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: mlflow
  namespace: mlflow
  annotations:
    nginx.ingress.kubernetes.io/auth-type: basic
    nginx.ingress.kubernetes.io/auth-secret: mlflow-basic-auth
spec:
  ingressClassName: nginx
  rules:
    - host: mlflow.internal.example.com
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

## Step 4: Create the Flux Kustomization

```yaml
# clusters/my-cluster/mlflow/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - namespace.yaml
  - deployment.yaml
  - service.yaml
  - ingress.yaml
---
# clusters/my-cluster/flux-kustomization-mlflow.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: mlflow
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/my-cluster/mlflow
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: mlflow
      namespace: mlflow
```

## Step 5: Register and Promote Models

```bash
# Verify MLflow is running
flux get kustomizations mlflow
kubectl rollout status deployment/mlflow -n mlflow

# Register a model via Python SDK
python3 -c "
import mlflow
mlflow.set_tracking_uri('http://mlflow.internal.example.com')
with mlflow.start_run():
    mlflow.log_param('lr', 0.001)
    mlflow.log_metric('accuracy', 0.95)
    mlflow.sklearn.log_model(model, 'model', registered_model_name='my-classifier')
"

# Promote model to production via REST API
curl -X POST http://mlflow.internal.example.com/api/2.0/mlflow/model-versions/transition-stage \
  -H "Content-Type: application/json" \
  -d '{"name": "my-classifier", "version": "1", "stage": "Production"}'
```

## Best Practices

- Use PostgreSQL as the backend store (not SQLite) for production deployments to support multiple MLflow server replicas.
- Store model artifacts in object storage (S3/GCS/MinIO) rather than local disk so artifacts are accessible across replicas and persist pod restarts.
- Enable the artifact proxy (`--serve-artifacts`) so the MLflow UI can serve artifact downloads without clients needing direct S3 credentials.
- Apply basic auth or OAuth2-proxy in front of MLflow Ingress to protect the model registry from unauthorized access.
- Use MLflow model aliases (MLflow 2.9+) instead of stages for production promotion workflows, as aliases provide more flexibility.

## Conclusion

Deploying an MLflow model registry with Flux CD establishes a governed, version-controlled foundation for your ML model lifecycle. The registry infrastructure itself is managed as code, ensuring consistency across environments and making it easy to upgrade, back up, and audit every aspect of your ML platform - from experiment tracking to production model promotion.
