# How to Deploy MLflow on Kubernetes with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, MLflow, Machine Learning, Experiment Tracking, HelmRelease

Description: Learn how to deploy MLflow experiment tracking server to Kubernetes using Flux CD HelmRelease for a GitOps-managed ML platform.

---

## Introduction

MLflow is the leading open-source platform for managing the machine learning lifecycle, including experiment tracking, model registry, and artifact storage. Running MLflow on Kubernetes enables your ML team to share a centralized tracking server, version models in a shared registry, and store artifacts in object storage - all from their local training scripts.

Managing MLflow's Kubernetes deployment through Flux CD ensures that infrastructure changes (database backends, artifact storage configuration, authentication, scaling) go through the same Git review process as your application code. The Bitnami MLflow Helm chart packages all dependencies (MLflow server, PostgreSQL for metadata, and MinIO for artifacts) into a single deployable unit that Flux can manage.

In this guide you will deploy MLflow with PostgreSQL backend and S3-compatible artifact storage using Flux CD, configure authentication, and expose the tracking server via ingress.

## Prerequisites

- A Kubernetes cluster with Flux CD installed
- `kubectl` and `flux` CLI tools installed
- A StorageClass supporting PersistentVolumeClaims
- An S3-compatible object store (AWS S3 or MinIO) for artifact storage
- Basic understanding of MLflow concepts (experiments, runs, model registry)

## Step 1: Add the Bitnami HelmRepository

```yaml
# clusters/production/sources/bitnami.yaml

apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: bitnami
  namespace: flux-system
spec:
  interval: 1h
  type: oci
  url: oci://registry-1.docker.io/bitnamicharts
```

## Step 2: Create MLflow Secrets

```yaml
# clusters/production/secrets/mlflow-secrets.yaml
# Encrypt with SOPS before committing
apiVersion: v1
kind: Namespace
metadata:
  name: mlflow
---
apiVersion: v1
kind: Secret
metadata:
  name: mlflow-secrets
  namespace: mlflow
type: Opaque
stringData:
  # PostgreSQL connection
  postgres-password: "change-me-in-production"
  password: "change-me-in-production"
  # S3 credentials for artifact storage
  aws-access-key-id: "your-access-key"
  aws-secret-access-key: "your-secret-key"
  # MLflow basic auth
  admin-user: "admin"
  admin-password: "change-me-in-production"
  flask-server-secret-key: "replace-with-a-long-random-string"
```

## Step 3: Deploy MLflow with Flux HelmRelease

```yaml
# clusters/production/apps/mlflow-helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: mlflow
  namespace: flux-system
spec:
  interval: 1h
  targetNamespace: mlflow
  chart:
    spec:
      chart: mlflow
      version: "5.x"
      sourceRef:
        kind: HelmRepository
        name: bitnami
  install:
    createNamespace: true
    timeout: 10m
  upgrade:
    timeout: 10m
  values:
    # MLflow tracking server configuration
    tracking:
      auth:
        enabled: true
        username: admin
        existingSecret: mlflow-secrets
        existingSecretUserKey: admin-user
        existingSecretPasswordKey: admin-password
        existingSecretFlaskServerSecretKey: flask-server-secret-key

      # Number of tracking server replicas
      replicaCount: 2
      persistence:
        enabled: false

      resources:
        requests:
          cpu: 200m
          memory: 512Mi
        limits:
          cpu: 1000m
          memory: 1Gi

      ingress:
        enabled: true
        ingressClassName: nginx
        hostname: mlflow.myorg.com
        annotations:
          cert-manager.io/cluster-issuer: letsencrypt-prod
        tls: true

    # Disable the example "run" deployment; this guide only needs the tracking server
    run:
      enabled: false

    # External S3-compatible artifact storage
    externalS3:
      host: s3.amazonaws.com
      port: 443
      protocol: https
      bucket: my-mlflow-bucket
      existingSecret: mlflow-secrets
      existingSecretAccessKeyIDKey: aws-access-key-id
      existingSecretKeySecretKey: aws-secret-access-key
      serveArtifacts: true

    # PostgreSQL backend for metadata storage
    postgresql:
      enabled: true
      auth:
        database: mlflow
        username: mlflow
        existingSecret: mlflow-secrets
      primary:
        persistence:
          enabled: true
          size: 20Gi
        resources:
          requests:
            cpu: 100m
            memory: 256Mi
          limits:
            cpu: 500m
            memory: 512Mi

    # MinIO for local artifact storage (alternative to S3)
    minio:
      enabled: false  # Disabled when using external S3
```

## Step 4: Configure Artifact Storage with MinIO (Local S3 Alternative)

If you prefer to run the chart's bundled MinIO in-cluster for artifact storage, enable the MinIO subchart in the MLflow HelmRelease instead of configuring `externalS3`:

```yaml
# clusters/production/apps/mlflow-helmrelease.yaml
values:
  minio:
    enabled: true
    defaultBuckets: "mlflow-artifacts"
    auth:
      existingSecret: minio-secret
      rootUserSecretKey: root-user
      rootPasswordSecretKey: root-password
    persistence:
      enabled: true
      size: 100Gi
    resources:
      requests:
        cpu: 100m
        memory: 512Mi

  externalS3:
    host: ""
```

## Step 5: Create the Flux Kustomization

```yaml
# clusters/production/apps/mlflow-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: mlflow-stack
  namespace: flux-system
spec:
  interval: 30m
  sourceRef:
    kind: GitRepository
    name: app-repo
  path: ./clusters/production/apps/mlflow
  prune: true
  wait: true
  timeout: 15m
```

## Step 6: Connect Your Training Scripts to MLflow

After deployment, configure your ML training scripts to use the hosted server.

```python
import os
import mlflow
import mlflow.sklearn
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score

os.environ["MLFLOW_TRACKING_USERNAME"] = "admin"
os.environ["MLFLOW_TRACKING_PASSWORD"] = "change-me-in-production"

# Point to your Kubernetes-hosted MLflow server
mlflow.set_tracking_uri("https://mlflow.myorg.com")
mlflow.set_experiment("customer-churn-prediction")

# Artifacts go to S3 automatically
with mlflow.start_run():
    # Log hyperparameters
    mlflow.log_param("n_estimators", 100)
    mlflow.log_param("max_depth", 5)

    # Train model
    model = RandomForestClassifier(n_estimators=100, max_depth=5)
    model.fit(X_train, y_train)

    # Log metrics
    accuracy = accuracy_score(y_test, model.predict(X_test))
    mlflow.log_metric("accuracy", accuracy)

    # Log model to registry
    mlflow.sklearn.log_model(
        model,
        name="random-forest-model",
        registered_model_name="CustomerChurnModel",
    )
```

## Step 7: Verify and Monitor

```bash
# Check MLflow pods are running
kubectl get pods -n mlflow

# View MLflow server logs
kubectl logs -n mlflow -l app.kubernetes.io/component=tracking -f

# Check PostgreSQL is healthy
kubectl get pods -n mlflow -l app.kubernetes.io/name=postgresql

# Verify ingress is configured
kubectl get ingress -n mlflow

# Force reconcile after config changes
flux reconcile helmrelease mlflow --with-source -n flux-system

# Check artifact storage connectivity
kubectl exec -n mlflow -it deploy/mlflow-tracking -- \
  python -c "import boto3; s3=boto3.client('s3'); print(s3.list_buckets())"
```

## Best Practices

- Encrypt all secrets (database passwords, S3 keys) with SOPS before committing to Git
- Use PostgreSQL (not SQLite) as the backend database for any shared or production MLflow deployment
- Configure S3 lifecycle policies to archive or delete old artifacts automatically
- Enable MLflow authentication to prevent unauthorized access to experiments and models
- Back up the PostgreSQL database regularly; it contains all experiment metadata
- Use Kubernetes HorizontalPodAutoscaler on the tracking server for high-traffic deployments

## Conclusion

Deploying MLflow on Kubernetes with Flux CD gives your machine learning team a centralized, GitOps-managed experiment tracking platform. Changes to server configuration, resource limits, and authentication flow through Git pull requests, and Flux automatically applies approved changes to the cluster. With PostgreSQL as the backend and S3 for artifacts, your MLflow deployment is production-ready, highly available, and scales to support dozens of concurrent experiments and model versions.
