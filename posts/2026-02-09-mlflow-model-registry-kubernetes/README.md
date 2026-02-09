# How to Deploy MLflow Model Registry and Tracking Server on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, MLflow, Model Registry, Machine Learning, MLOps

Description: Deploy MLflow model registry and tracking server on Kubernetes to manage machine learning experiments, models, and deployments in a centralized platform.

---

Tracking machine learning experiments and managing model versions becomes challenging as your team grows and the number of models increases. MLflow provides a centralized platform for experiment tracking, model versioning, and deployment management. Running MLflow on Kubernetes makes it scalable, highly available, and easy to integrate with your existing ML infrastructure.

This guide walks through deploying a production-ready MLflow setup on Kubernetes with PostgreSQL for metadata storage and S3-compatible storage for artifacts.

## Architecture Overview

The MLflow deployment consists of:

- **MLflow Tracking Server**: REST API for logging experiments and metrics
- **MLflow Model Registry**: Manages model versions and stages
- **PostgreSQL**: Stores experiment metadata
- **MinIO**: S3-compatible storage for artifacts (models, plots, etc.)
- **Nginx**: Reverse proxy with authentication

## Deploying PostgreSQL for MLflow Backend

Start with PostgreSQL for storing experiment metadata:

```yaml
# mlflow-postgres.yaml
apiVersion: v1
kind: Secret
metadata:
  name: mlflow-postgres-secret
  namespace: mlflow
type: Opaque
stringData:
  POSTGRES_USER: mlflow
  POSTGRES_PASSWORD: mlflow-secure-password
  POSTGRES_DB: mlflow
---
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
        image: postgres:15-alpine
        ports:
        - containerPort: 5432
          name: postgres
        envFrom:
        - secretRef:
            name: mlflow-postgres-secret
        resources:
          requests:
            cpu: "500m"
            memory: "1Gi"
          limits:
            cpu: "2"
            memory: "4Gi"
        volumeMounts:
        - name: postgres-data
          mountPath: /var/lib/postgresql/data
          subPath: postgres
        livenessProbe:
          exec:
            command: ["pg_isready", "-U", "mlflow"]
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          exec:
            command: ["pg_isready", "-U", "mlflow"]
          initialDelaySeconds: 5
          periodSeconds: 5
  volumeClaimTemplates:
  - metadata:
      name: postgres-data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: fast-ssd
      resources:
        requests:
          storage: 50Gi
---
apiVersion: v1
kind: Service
metadata:
  name: mlflow-postgres
  namespace: mlflow
spec:
  selector:
    app: mlflow-postgres
  ports:
  - port: 5432
    targetPort: 5432
  clusterIP: None
```

Deploy PostgreSQL:

```bash
# Create namespace
kubectl create namespace mlflow

# Deploy PostgreSQL
kubectl apply -f mlflow-postgres.yaml

# Wait for PostgreSQL to be ready
kubectl wait --for=condition=ready pod/mlflow-postgres-0 -n mlflow --timeout=5m

# Verify connection
kubectl exec -n mlflow mlflow-postgres-0 -- psql -U mlflow -c "SELECT version();"
```

## Deploying MinIO for Artifact Storage

Deploy MinIO as S3-compatible storage:

```yaml
# mlflow-minio.yaml
apiVersion: v1
kind: Secret
metadata:
  name: mlflow-minio-secret
  namespace: mlflow
type: Opaque
stringData:
  MINIO_ROOT_USER: minio-admin
  MINIO_ROOT_PASSWORD: minio-secure-password
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mlflow-minio
  namespace: mlflow
spec:
  serviceName: mlflow-minio
  replicas: 1
  selector:
    matchLabels:
      app: mlflow-minio
  template:
    metadata:
      labels:
        app: mlflow-minio
    spec:
      containers:
      - name: minio
        image: minio/minio:RELEASE.2024-01-01T00-00-00Z
        command:
        - /bin/bash
        - -c
        args:
        - minio server /data --console-address :9001
        ports:
        - containerPort: 9000
          name: api
        - containerPort: 9001
          name: console
        envFrom:
        - secretRef:
            name: mlflow-minio-secret
        resources:
          requests:
            cpu: "500m"
            memory: "1Gi"
          limits:
            cpu: "2"
            memory: "4Gi"
        volumeMounts:
        - name: minio-data
          mountPath: /data
        livenessProbe:
          httpGet:
            path: /minio/health/live
            port: 9000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /minio/health/ready
            port: 9000
          initialDelaySeconds: 10
          periodSeconds: 5
  volumeClaimTemplates:
  - metadata:
      name: minio-data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: fast-ssd
      resources:
        requests:
          storage: 100Gi
---
apiVersion: v1
kind: Service
metadata:
  name: mlflow-minio
  namespace: mlflow
spec:
  selector:
    app: mlflow-minio
  ports:
  - port: 9000
    targetPort: 9000
    name: api
  - port: 9001
    targetPort: 9001
    name: console
  type: ClusterIP
```

Deploy MinIO and create the MLflow bucket:

```bash
# Deploy MinIO
kubectl apply -f mlflow-minio.yaml

# Wait for MinIO to be ready
kubectl wait --for=condition=ready pod/mlflow-minio-0 -n mlflow --timeout=5m

# Install MinIO client
kubectl run -n mlflow minio-client --image=minio/mc --command -- sleep 3600

# Create MLflow bucket
kubectl exec -n mlflow minio-client -- mc alias set minio http://mlflow-minio:9000 minio-admin minio-secure-password
kubectl exec -n mlflow minio-client -- mc mb minio/mlflow
kubectl exec -n mlflow minio-client -- mc policy set download minio/mlflow

# Cleanup client pod
kubectl delete pod -n mlflow minio-client
```

## Deploying MLflow Tracking Server

Create the MLflow tracking server deployment:

```yaml
# mlflow-server.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: mlflow-config
  namespace: mlflow
data:
  # Backend store (PostgreSQL)
  BACKEND_STORE_URI: "postgresql://mlflow:mlflow-secure-password@mlflow-postgres:5432/mlflow"

  # Artifact store (MinIO)
  DEFAULT_ARTIFACT_ROOT: "s3://mlflow/artifacts"

  # MinIO endpoint
  MLFLOW_S3_ENDPOINT_URL: "http://mlflow-minio:9000"
---
apiVersion: v1
kind: Secret
metadata:
  name: mlflow-s3-secret
  namespace: mlflow
type: Opaque
stringData:
  AWS_ACCESS_KEY_ID: minio-admin
  AWS_SECRET_ACCESS_KEY: minio-secure-password
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mlflow-server
  namespace: mlflow
spec:
  replicas: 3
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
        image: python:3.10-slim
        command:
        - /bin/bash
        - -c
        args:
        - |
          pip install mlflow==2.9.2 psycopg2-binary boto3
          mlflow server \
            --backend-store-uri $BACKEND_STORE_URI \
            --default-artifact-root $DEFAULT_ARTIFACT_ROOT \
            --host 0.0.0.0 \
            --port 5000
        ports:
        - containerPort: 5000
          name: http
        envFrom:
        - configMapRef:
            name: mlflow-config
        - secretRef:
            name: mlflow-s3-secret
        resources:
          requests:
            cpu: "500m"
            memory: "1Gi"
          limits:
            cpu: "2"
            memory: "4Gi"
        livenessProbe:
          httpGet:
            path: /health
            port: 5000
          initialDelaySeconds: 30
          periodSeconds: 10
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
  name: mlflow-server
  namespace: mlflow
spec:
  selector:
    app: mlflow-server
  ports:
  - port: 5000
    targetPort: 5000
    name: http
  type: ClusterIP
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: mlflow-server-hpa
  namespace: mlflow
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: mlflow-server
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

Deploy the MLflow server:

```bash
kubectl apply -f mlflow-server.yaml

# Wait for pods to be ready
kubectl wait --for=condition=ready pod -l app=mlflow-server -n mlflow --timeout=5m

# Port forward to test
kubectl port-forward -n mlflow svc/mlflow-server 5000:5000

# Test the API
curl http://localhost:5000/health
```

## Setting Up Ingress

Expose MLflow with Ingress and authentication:

```yaml
# mlflow-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: mlflow-ingress
  namespace: mlflow
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/auth-type: basic
    nginx.ingress.kubernetes.io/auth-secret: mlflow-basic-auth
    nginx.ingress.kubernetes.io/auth-realm: "MLflow Authentication"
spec:
  tls:
  - hosts:
    - mlflow.yourdomain.com
    secretName: mlflow-tls
  rules:
  - host: mlflow.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: mlflow-server
            port:
              number: 5000
```

Create basic auth credentials:

```bash
# Install htpasswd
apt-get install apache2-utils  # Ubuntu/Debian
# or
brew install httpd  # macOS

# Create credentials
htpasswd -c auth mlflow-user
# Enter password when prompted

# Create Kubernetes secret
kubectl create secret generic mlflow-basic-auth \
  --from-file=auth \
  -n mlflow

# Apply ingress
kubectl apply -f mlflow-ingress.yaml
```

## Using MLflow for Experiment Tracking

Create a training script that logs to MLflow:

```python
# train_with_mlflow.py
import mlflow
import mlflow.sklearn
from sklearn.ensemble import RandomForestClassifier
from sklearn.datasets import make_classification
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score
import numpy as np

# Set MLflow tracking URI
mlflow.set_tracking_uri("http://mlflow.yourdomain.com")

# Set experiment name
mlflow.set_experiment("customer-churn-prediction")

# Start MLflow run
with mlflow.start_run(run_name="random-forest-v1") as run:

    # Log parameters
    n_estimators = 100
    max_depth = 10
    min_samples_split = 5

    mlflow.log_param("n_estimators", n_estimators)
    mlflow.log_param("max_depth", max_depth)
    mlflow.log_param("min_samples_split", min_samples_split)
    mlflow.log_param("random_state", 42)

    # Generate data
    X, y = make_classification(
        n_samples=10000,
        n_features=20,
        n_informative=15,
        n_redundant=5,
        random_state=42
    )

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    # Train model
    model = RandomForestClassifier(
        n_estimators=n_estimators,
        max_depth=max_depth,
        min_samples_split=min_samples_split,
        random_state=42
    )

    model.fit(X_train, y_train)

    # Make predictions
    y_pred = model.predict(X_test)

    # Calculate metrics
    accuracy = accuracy_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred)
    recall = recall_score(y_test, y_pred)

    # Log metrics
    mlflow.log_metric("accuracy", accuracy)
    mlflow.log_metric("f1_score", f1)
    mlflow.log_metric("precision", precision)
    mlflow.log_metric("recall", recall)

    # Log feature importances as a chart
    import matplotlib.pyplot as plt

    feature_importance = model.feature_importances_
    fig, ax = plt.subplots(figsize=(10, 6))
    ax.bar(range(len(feature_importance)), feature_importance)
    ax.set_xlabel("Feature Index")
    ax.set_ylabel("Importance")
    ax.set_title("Feature Importances")

    mlflow.log_figure(fig, "feature_importances.png")
    plt.close()

    # Log the model
    mlflow.sklearn.log_model(
        model,
        "model",
        registered_model_name="churn-prediction-model"
    )

    # Log additional artifacts
    mlflow.log_dict(
        {
            "training_samples": len(X_train),
            "test_samples": len(X_test),
            "features": list(range(X.shape[1]))
        },
        "dataset_info.json"
    )

    print(f"Run ID: {run.info.run_id}")
    print(f"Accuracy: {accuracy:.4f}")
    print(f"F1 Score: {f1:.4f}")
```

Run the training script:

```bash
# Install MLflow client
pip install mlflow scikit-learn matplotlib

# Set environment variables
export MLFLOW_TRACKING_URI=http://mlflow.yourdomain.com
export MLFLOW_TRACKING_USERNAME=mlflow-user
export MLFLOW_TRACKING_PASSWORD=your-password

# Run training
python train_with_mlflow.py
```

## Managing Model Versions in the Registry

Interact with the model registry programmatically:

```python
# model_registry_ops.py
import mlflow
from mlflow.tracking import MlflowClient

# Initialize client
client = MlflowClient("http://mlflow.yourdomain.com")

# List all registered models
models = client.search_registered_models()
for model in models:
    print(f"Model: {model.name}")
    print(f"  Latest version: {model.latest_versions}")

# Get specific model version
model_name = "churn-prediction-model"
model_version = 1

model_details = client.get_model_version(
    name=model_name,
    version=model_version
)

print(f"Model Version Details:")
print(f"  Status: {model_details.status}")
print(f"  Stage: {model_details.current_stage}")
print(f"  Run ID: {model_details.run_id}")

# Transition model to staging
client.transition_model_version_stage(
    name=model_name,
    version=model_version,
    stage="Staging"
)

print(f"Model version {model_version} moved to Staging")

# Add description
client.update_model_version(
    name=model_name,
    version=model_version,
    description="Random Forest model with 100 estimators, trained on 10k samples"
)

# Transition to production after validation
client.transition_model_version_stage(
    name=model_name,
    version=model_version,
    stage="Production",
    archive_existing_versions=True  # Archive previous production versions
)

print(f"Model version {model_version} moved to Production")

# Load production model for inference
model_uri = f"models:/{model_name}/Production"
model = mlflow.sklearn.load_model(model_uri)

# Make predictions
import numpy as np
X_new = np.random.randn(5, 20)
predictions = model.predict(X_new)
print(f"Predictions: {predictions}")
```

## Creating a Model Deployment Pipeline

Automate model deployment based on registry stages:

```python
# model_deployer.py
import time
import logging
from mlflow.tracking import MlflowClient
import kubernetes.client
from kubernetes import config

logging.basicConfig(level=logging.INFO)

class ModelDeployer:
    def __init__(self, mlflow_uri: str, model_name: str):
        self.client = MlflowClient(mlflow_uri)
        self.model_name = model_name

        # Load Kubernetes config
        config.load_incluster_config()
        self.apps_api = kubernetes.client.AppsV1Api()

    def check_and_deploy(self):
        """Check for new production models and deploy them"""

        # Get latest production model
        try:
            versions = self.client.get_latest_versions(
                self.model_name,
                stages=["Production"]
            )

            if not versions:
                logging.info(f"No production version for {self.model_name}")
                return

            latest_prod = versions[0]
            model_version = latest_prod.version
            run_id = latest_prod.run_id

            logging.info(f"Latest production version: {model_version}")

            # Check if already deployed
            current_deployment = self.get_current_deployment()
            if current_deployment and current_deployment == model_version:
                logging.info(f"Version {model_version} already deployed")
                return

            # Deploy new version
            logging.info(f"Deploying new version: {model_version}")
            self.deploy_model(model_version, run_id)

        except Exception as e:
            logging.error(f"Error checking/deploying model: {e}")

    def get_current_deployment(self):
        """Get currently deployed model version"""
        try:
            deployment = self.apps_api.read_namespaced_deployment(
                name=f"{self.model_name}-serving",
                namespace="ml-serving"
            )

            return deployment.metadata.labels.get("model-version")
        except kubernetes.client.exceptions.ApiException:
            return None

    def deploy_model(self, version: str, run_id: str):
        """Deploy model version to Kubernetes"""

        deployment = {
            "apiVersion": "apps/v1",
            "kind": "Deployment",
            "metadata": {
                "name": f"{self.model_name}-serving",
                "namespace": "ml-serving",
                "labels": {
                    "app": f"{self.model_name}-serving",
                    "model-version": str(version)
                }
            },
            "spec": {
                "replicas": 3,
                "selector": {
                    "matchLabels": {
                        "app": f"{self.model_name}-serving"
                    }
                },
                "template": {
                    "metadata": {
                        "labels": {
                            "app": f"{self.model_name}-serving",
                            "model-version": str(version)
                        }
                    },
                    "spec": {
                        "containers": [{
                            "name": "model-server",
                            "image": "your-registry/mlflow-model-server:v1",
                            "env": [
                                {"name": "MODEL_URI", "value": f"models:/{self.model_name}/{version}"},
                                {"name": "MLFLOW_TRACKING_URI", "value": "http://mlflow-server.mlflow.svc:5000"}
                            ],
                            "ports": [{"containerPort": 8080}],
                            "resources": {
                                "requests": {"cpu": "500m", "memory": "1Gi"},
                                "limits": {"cpu": "2", "memory": "4Gi"}
                            }
                        }]
                    }
                }
            }
        }

        try:
            # Try to update existing deployment
            self.apps_api.patch_namespaced_deployment(
                name=f"{self.model_name}-serving",
                namespace="ml-serving",
                body=deployment
            )
            logging.info(f"Updated deployment to version {version}")
        except kubernetes.client.exceptions.ApiException:
            # Create new deployment
            self.apps_api.create_namespaced_deployment(
                namespace="ml-serving",
                body=deployment
            )
            logging.info(f"Created new deployment for version {version}")

if __name__ == "__main__":
    deployer = ModelDeployer(
        mlflow_uri="http://mlflow-server.mlflow.svc:5000",
        model_name="churn-prediction-model"
    )

    while True:
        deployer.check_and_deploy()
        time.sleep(60)  # Check every minute
```

## Monitoring MLflow

Add Prometheus metrics for MLflow:

```yaml
# mlflow-servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: mlflow-metrics
  namespace: mlflow
spec:
  selector:
    matchLabels:
      app: mlflow-server
  endpoints:
  - port: http
    path: /metrics
    interval: 30s
```

## Conclusion

Deploying MLflow on Kubernetes provides a scalable, centralized platform for managing ML experiments and models. The combination of experiment tracking, model registry, and artifact storage makes it easier to collaborate across teams and maintain reproducibility. By integrating with Kubernetes, you can automate model deployments based on registry stages and build complete MLOps pipelines that handle the full model lifecycle from training to production.
