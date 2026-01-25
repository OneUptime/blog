# How to Set Up MLflow for Experiment Tracking

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MLOps, MLflow, Machine Learning, Experiment Tracking, Python

Description: Learn how to set up MLflow for tracking machine learning experiments, logging parameters, metrics, and artifacts, and comparing model runs across your team.

---

Machine learning projects quickly become chaotic without proper experiment tracking. You run dozens of experiments with different hyperparameters, forget which configuration produced the best results, and lose track of model artifacts. MLflow solves this by providing a unified platform for tracking experiments, packaging code, and deploying models.

## What is MLflow?

MLflow is an open-source platform that manages the entire ML lifecycle. It consists of four main components:

- **MLflow Tracking**: Records parameters, metrics, and artifacts from experiments
- **MLflow Projects**: Packages ML code in a reusable format
- **MLflow Models**: Deploys models to various serving platforms
- **MLflow Registry**: Central model store with versioning and stage transitions

This guide focuses on MLflow Tracking, which is where most teams start.

## Installing MLflow

Install MLflow using pip. The base installation includes everything needed for local tracking.

```bash
# Install MLflow with all dependencies
pip install mlflow

# Verify installation
mlflow --version

# Start the MLflow UI server locally on port 5000
mlflow ui --port 5000
```

Open http://localhost:5000 in your browser to see the MLflow UI. It will be empty until you log your first experiment.

## Basic Experiment Tracking

Here is a simple example that trains a scikit-learn model and logs everything to MLflow.

```python
import mlflow
import mlflow.sklearn
from sklearn.ensemble import RandomForestClassifier
from sklearn.datasets import load_iris
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, f1_score

# Load sample data for demonstration
iris = load_iris()
X_train, X_test, y_train, y_test = train_test_split(
    iris.data, iris.target, test_size=0.2, random_state=42
)

# Set the experiment name - creates it if it does not exist
mlflow.set_experiment("iris-classification")

# Start a new run within the experiment
with mlflow.start_run(run_name="random-forest-baseline"):
    # Define hyperparameters
    n_estimators = 100
    max_depth = 5

    # Log parameters so you can reproduce this run later
    mlflow.log_param("n_estimators", n_estimators)
    mlflow.log_param("max_depth", max_depth)
    mlflow.log_param("random_state", 42)

    # Train the model
    model = RandomForestClassifier(
        n_estimators=n_estimators,
        max_depth=max_depth,
        random_state=42
    )
    model.fit(X_train, y_train)

    # Make predictions and calculate metrics
    predictions = model.predict(X_test)
    accuracy = accuracy_score(y_test, predictions)
    f1 = f1_score(y_test, predictions, average='weighted')

    # Log metrics for comparison across runs
    mlflow.log_metric("accuracy", accuracy)
    mlflow.log_metric("f1_score", f1)

    # Log the trained model as an artifact
    mlflow.sklearn.log_model(model, "model")

    print(f"Accuracy: {accuracy:.4f}, F1 Score: {f1:.4f}")
```

After running this script, refresh the MLflow UI to see your logged experiment.

## Setting Up a Remote Tracking Server

For team collaboration, run MLflow as a centralized server with a database backend and artifact storage.

```bash
# Create a directory for artifacts
mkdir -p /data/mlflow/artifacts

# Start MLflow server with PostgreSQL backend and S3 artifact storage
mlflow server \
    --backend-store-uri postgresql://mlflow:password@localhost:5432/mlflow \
    --default-artifact-root s3://my-bucket/mlflow-artifacts \
    --host 0.0.0.0 \
    --port 5000
```

Configure your Python code to use the remote server:

```python
import mlflow

# Point to your remote MLflow server
mlflow.set_tracking_uri("http://mlflow-server.example.com:5000")

# Now all experiments will be logged to the remote server
mlflow.set_experiment("production-models")
```

## Deploying MLflow on Kubernetes

For production deployments, use Kubernetes. Here is a deployment manifest:

```yaml
# mlflow-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mlflow
  namespace: mlops
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
          image: ghcr.io/mlflow/mlflow:2.10.0
          ports:
            - containerPort: 5000
          env:
            # Database connection from Kubernetes secret
            - name: BACKEND_STORE_URI
              valueFrom:
                secretKeyRef:
                  name: mlflow-secrets
                  key: database-uri
            # S3-compatible storage configuration
            - name: MLFLOW_S3_ENDPOINT_URL
              value: "https://minio.mlops.svc.cluster.local:9000"
            - name: AWS_ACCESS_KEY_ID
              valueFrom:
                secretKeyRef:
                  name: mlflow-secrets
                  key: aws-access-key
            - name: AWS_SECRET_ACCESS_KEY
              valueFrom:
                secretKeyRef:
                  name: mlflow-secrets
                  key: aws-secret-key
          command:
            - mlflow
            - server
            - --backend-store-uri
            - $(BACKEND_STORE_URI)
            - --default-artifact-root
            - s3://mlflow-artifacts/
            - --host
            - "0.0.0.0"
            - --port
            - "5000"
          resources:
            requests:
              memory: "512Mi"
              cpu: "250m"
            limits:
              memory: "1Gi"
              cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: mlflow
  namespace: mlops
spec:
  selector:
    app: mlflow
  ports:
    - port: 5000
      targetPort: 5000
  type: ClusterIP
```

Apply the deployment:

```bash
# Create namespace and secrets first
kubectl create namespace mlops
kubectl create secret generic mlflow-secrets \
    --from-literal=database-uri='postgresql://mlflow:pass@postgres:5432/mlflow' \
    --from-literal=aws-access-key='minio-access' \
    --from-literal=aws-secret-key='minio-secret' \
    -n mlops

# Deploy MLflow
kubectl apply -f mlflow-deployment.yaml
```

## Logging Custom Artifacts

Beyond models, you can log any file as an artifact. This is useful for saving plots, data samples, or configuration files.

```python
import mlflow
import matplotlib.pyplot as plt
import json
import os

with mlflow.start_run():
    # Log hyperparameters
    mlflow.log_param("learning_rate", 0.01)

    # Create and save a confusion matrix plot
    fig, ax = plt.subplots()
    ax.matshow([[50, 2], [3, 45]], cmap='Blues')
    ax.set_xlabel('Predicted')
    ax.set_ylabel('Actual')
    ax.set_title('Confusion Matrix')

    # Save plot to a temporary file and log it
    plt.savefig("confusion_matrix.png")
    mlflow.log_artifact("confusion_matrix.png")
    os.remove("confusion_matrix.png")  # Clean up local file

    # Log a JSON configuration file
    config = {
        "model_type": "random_forest",
        "preprocessing": ["normalize", "pca"],
        "feature_count": 10
    }
    with open("config.json", "w") as f:
        json.dump(config, f, indent=2)
    mlflow.log_artifact("config.json")
    os.remove("config.json")

    # Log an entire directory of artifacts
    mlflow.log_artifacts("./data_samples", artifact_path="samples")
```

## Comparing Experiments

MLflow makes it easy to compare runs programmatically:

```python
import mlflow
from mlflow.tracking import MlflowClient

client = MlflowClient()

# Get all runs from an experiment
experiment = client.get_experiment_by_name("iris-classification")
runs = client.search_runs(
    experiment_ids=[experiment.experiment_id],
    order_by=["metrics.accuracy DESC"],
    max_results=10
)

# Print comparison table
print(f"{'Run Name':<30} {'Accuracy':<10} {'F1 Score':<10}")
print("-" * 50)
for run in runs:
    name = run.info.run_name or run.info.run_id[:8]
    accuracy = run.data.metrics.get("accuracy", 0)
    f1 = run.data.metrics.get("f1_score", 0)
    print(f"{name:<30} {accuracy:<10.4f} {f1:<10.4f}")

# Get the best run
best_run = runs[0]
print(f"\nBest model run_id: {best_run.info.run_id}")
```

## Auto-Logging for Popular Frameworks

MLflow supports automatic logging for many ML frameworks. Enable it with a single line:

```python
import mlflow

# Enable auto-logging for scikit-learn
mlflow.sklearn.autolog()

# Enable auto-logging for PyTorch
mlflow.pytorch.autolog()

# Enable auto-logging for TensorFlow/Keras
mlflow.tensorflow.autolog()

# Enable auto-logging for XGBoost
mlflow.xgboost.autolog()

# Now train your model normally - MLflow logs everything automatically
from sklearn.ensemble import GradientBoostingClassifier
model = GradientBoostingClassifier(n_estimators=50)
model.fit(X_train, y_train)
# Parameters, metrics, and model are all logged automatically
```

## Best Practices

1. **Name your experiments clearly**: Use descriptive names like "fraud-detection-v2" instead of generic names
2. **Tag your runs**: Add tags for filtering runs by purpose, dataset version, or team member
3. **Log data versions**: Record which version of training data was used
4. **Set up garbage collection**: Periodically clean up old runs to save storage
5. **Use nested runs**: For hyperparameter sweeps, use nested runs to keep things organized

```python
# Example of tagging and nested runs
with mlflow.start_run(run_name="hyperparameter-sweep") as parent:
    mlflow.set_tag("purpose", "optimization")
    mlflow.set_tag("data_version", "v2.3")

    for lr in [0.001, 0.01, 0.1]:
        with mlflow.start_run(run_name=f"lr-{lr}", nested=True):
            mlflow.log_param("learning_rate", lr)
            # Train model with this learning rate
            mlflow.log_metric("accuracy", 0.85 + lr)
```

---

MLflow brings order to the chaos of ML experimentation. Start with local tracking to get familiar with the workflow, then graduate to a team server as your projects grow. The investment in proper experiment tracking pays off quickly when you need to reproduce results or compare approaches.
