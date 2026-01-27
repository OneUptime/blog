# How to Deploy Models with MLflow

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MLflow, Machine Learning, Model Deployment, MLOps, Docker, Kubernetes, SageMaker, Python

Description: Learn how to deploy machine learning models with MLflow, covering the Model Registry, deployment stages, Docker containers, Kubernetes, and AWS SageMaker integration.

---

> MLflow transforms model deployment from a chaotic, error-prone process into a standardized, reproducible workflow. By providing a unified model format and deployment APIs, MLflow lets you deploy the same model to local servers, Docker containers, Kubernetes clusters, or cloud platforms with minimal code changes.

The path from a trained model to production often involves multiple handoffs, custom scripts, and deployment-specific configurations. MLflow eliminates this complexity by standardizing how models are packaged, versioned, and deployed across different environments.

---

## Understanding the Model Registry

The MLflow Model Registry is a centralized store for managing the full lifecycle of MLflow models. It provides model lineage, versioning, stage transitions, and annotations, making it essential for production ML workflows.

### Registering a Model

The following example demonstrates how to train a simple scikit-learn model and register it with the MLflow Model Registry. The registry tracks every version of your model along with metadata, making it easy to compare and promote models through your deployment pipeline.

```python
# train_and_register.py
# Train a model and register it with MLflow Model Registry
import mlflow
import mlflow.sklearn
from sklearn.ensemble import RandomForestClassifier
from sklearn.datasets import load_iris
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score

# Set the tracking URI to your MLflow server (local or remote)
mlflow.set_tracking_uri("http://localhost:5000")

# Load sample dataset for demonstration
X, y = load_iris(return_X_y=True)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Start an MLflow run to track this experiment
with mlflow.start_run():
    # Define and train the model
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)

    # Evaluate the model and log metrics
    predictions = model.predict(X_test)
    accuracy = accuracy_score(y_test, predictions)
    mlflow.log_metric("accuracy", accuracy)  # Track model performance

    # Log model parameters for reproducibility
    mlflow.log_param("n_estimators", 100)
    mlflow.log_param("random_state", 42)

    # Log the model and register it in a single step
    # registered_model_name creates a new model or adds a version to existing
    mlflow.sklearn.log_model(
        model,
        artifact_path="model",  # Path within the run artifacts
        registered_model_name="iris-classifier"  # Name in Model Registry
    )

    print(f"Model registered with accuracy: {accuracy:.4f}")
```

### Querying the Model Registry

Once models are registered, you can programmatically query the registry to list models, versions, and their metadata. This is useful for building deployment automation and monitoring systems.

```python
# query_registry.py
# Query the Model Registry for model information
from mlflow.tracking import MlflowClient

# Initialize the MLflow client for API interactions
client = MlflowClient()

# List all registered models in the registry
registered_models = client.search_registered_models()
for model in registered_models:
    print(f"Model: {model.name}")
    print(f"  Latest versions: {[v.version for v in model.latest_versions]}")

# Get detailed information about a specific model
model_name = "iris-classifier"
model_details = client.get_registered_model(model_name)
print(f"\nModel: {model_details.name}")
print(f"Description: {model_details.description}")
print(f"Tags: {model_details.tags}")

# List all versions of a specific model with their metadata
versions = client.search_model_versions(f"name='{model_name}'")
for version in versions:
    print(f"\nVersion {version.version}:")
    print(f"  Stage: {version.current_stage}")  # None, Staging, Production, Archived
    print(f"  Run ID: {version.run_id}")  # Link to training run
    print(f"  Source: {version.source}")  # Path to model artifacts
```

---

## Managing Model Stages

MLflow provides four built-in stages for models: None, Staging, Production, and Archived. These stages enable controlled promotion of models through your deployment pipeline, ensuring proper testing before production deployment.

### Transitioning Model Stages

The stage transition API allows you to move models between stages programmatically. This enables automated CI/CD pipelines that promote models based on test results or approval workflows.

```python
# stage_transitions.py
# Manage model stage transitions in MLflow
from mlflow.tracking import MlflowClient
import mlflow

client = MlflowClient()

model_name = "iris-classifier"
version = 1  # The version number to transition

# Transition a model version to Staging for testing
# archive_existing_versions=True automatically archives any existing Staging versions
client.transition_model_version_stage(
    name=model_name,
    version=version,
    stage="Staging",
    archive_existing_versions=True  # Clean up old staging versions
)
print(f"Model {model_name} v{version} transitioned to Staging")

# After validation, promote to Production
# This is typically done after automated or manual testing passes
client.transition_model_version_stage(
    name=model_name,
    version=version,
    stage="Production",
    archive_existing_versions=True  # Archive previous production version
)
print(f"Model {model_name} v{version} transitioned to Production")

# Add description to document the production version
client.update_model_version(
    name=model_name,
    version=version,
    description="Production model deployed after validation. Accuracy: 96.7%"
)

# Add tags for additional metadata
client.set_model_version_tag(
    name=model_name,
    version=version,
    key="validation_status",
    value="passed"
)
```

### Loading Models by Stage

Once models are staged, you can load them by stage name rather than version number. This decouples your deployment code from specific versions, allowing seamless model updates.

```python
# load_by_stage.py
# Load models from the registry by stage name
import mlflow.pyfunc

model_name = "iris-classifier"

# Load the current Production model - always gets the latest Production version
production_model = mlflow.pyfunc.load_model(
    model_uri=f"models:/{model_name}/Production"
)

# Load the current Staging model for testing
staging_model = mlflow.pyfunc.load_model(
    model_uri=f"models:/{model_name}/Staging"
)

# You can also load by specific version number when needed
specific_version = mlflow.pyfunc.load_model(
    model_uri=f"models:/{model_name}/1"  # Version 1
)

# Make predictions with the loaded model
import pandas as pd
sample_data = pd.DataFrame({
    "sepal_length": [5.1],
    "sepal_width": [3.5],
    "petal_length": [1.4],
    "petal_width": [0.2]
})
prediction = production_model.predict(sample_data)
print(f"Prediction: {prediction}")
```

---

## Understanding MLflow Models Format

The MLflow Models format is a standard packaging format that enables deployment to multiple platforms. Each model includes a MLmodel file that describes the model's flavors (frameworks), dependencies, and signatures.

### Model Signature and Input Example

Model signatures define the expected input and output schema, enabling runtime validation and documentation. Input examples provide sample data for testing model loading and inference.

```python
# model_signature.py
# Create models with explicit signatures and input examples
import mlflow
import mlflow.sklearn
from mlflow.models.signature import infer_signature, ModelSignature
from mlflow.types.schema import Schema, ColSpec
import pandas as pd
import numpy as np
from sklearn.ensemble import GradientBoostingRegressor

# Sample training data
X_train = pd.DataFrame({
    "feature_1": [1.0, 2.0, 3.0, 4.0, 5.0],
    "feature_2": [10.0, 20.0, 30.0, 40.0, 50.0],
    "feature_3": ["a", "b", "a", "b", "a"]  # Categorical feature
})
y_train = np.array([100, 200, 300, 400, 500])

# For this example, we'll use only numeric features
X_numeric = X_train[["feature_1", "feature_2"]]

# Train a simple model
model = GradientBoostingRegressor(n_estimators=50)
model.fit(X_numeric, y_train)
predictions = model.predict(X_numeric)

# Method 1: Infer signature automatically from data
# This analyzes the data types and shapes
signature = infer_signature(X_numeric, predictions)
print(f"Inferred signature:\n{signature}")

# Method 2: Define signature explicitly for precise control
explicit_signature = ModelSignature(
    inputs=Schema([
        ColSpec("double", "feature_1"),  # Column name and type
        ColSpec("double", "feature_2")
    ]),
    outputs=Schema([
        ColSpec("double")  # Output type
    ])
)

# Log model with signature and input example
with mlflow.start_run():
    mlflow.sklearn.log_model(
        model,
        artifact_path="model",
        signature=signature,  # Schema for validation
        input_example=X_numeric.head(2),  # Sample input for testing
        registered_model_name="price-predictor"
    )
```

### Examining the MLmodel File

The MLmodel file is a YAML file that describes how to load and serve the model. Understanding this file helps when debugging deployment issues or creating custom model flavors.

```yaml
# Example MLmodel file structure
artifact_path: model
flavors:
  python_function:
    env:
      conda: conda.yaml
      virtualenv: python_env.yaml
    loader_module: mlflow.sklearn
    model_path: model.pkl
    predict_fn: predict
    python_version: 3.10.12
  sklearn:
    code: null
    pickled_model: model.pkl
    serialization_format: cloudpickle
    sklearn_version: 1.3.0
mlflow_version: 2.9.0
model_size_bytes: 125432
model_uuid: abc123def456
run_id: 1234567890abcdef
signature:
  inputs: '[{"type": "double", "name": "feature_1"}, {"type": "double", "name": "feature_2"}]'
  outputs: '[{"type": "double"}]'
utc_time_created: '2026-01-27 10:30:00.000000'
```

---

## Deploying to a Local Server

MLflow provides a built-in serving capability that launches a REST API server for your model. This is ideal for development, testing, and small-scale deployments.

### Starting the Local Server

The mlflow models serve command launches a Gunicorn server that exposes your model as a REST API. You can serve models from the registry or directly from a run.

```bash
# Serve a model from the Model Registry (Production stage)
# --env-manager=local uses the current Python environment
mlflow models serve \
    --model-uri "models:/iris-classifier/Production" \
    --host 0.0.0.0 \
    --port 5001 \
    --env-manager=local

# Serve a specific version from the registry
mlflow models serve \
    --model-uri "models:/iris-classifier/1" \
    --host 0.0.0.0 \
    --port 5001

# Serve a model directly from a run (useful for testing)
mlflow models serve \
    --model-uri "runs:/abc123def456/model" \
    --host 0.0.0.0 \
    --port 5001

# Serve with custom workers for higher throughput
mlflow models serve \
    --model-uri "models:/iris-classifier/Production" \
    --host 0.0.0.0 \
    --port 5001 \
    --workers 4  # Number of Gunicorn workers
```

### Making Predictions via REST API

Once the server is running, you can make predictions using HTTP requests. The server accepts JSON payloads in several formats for flexibility.

```python
# predict_rest.py
# Make predictions against the MLflow model server
import requests
import json

# Define the model server endpoint
MODEL_SERVER_URL = "http://localhost:5001/invocations"

# Method 1: Split-orient format (column names and values separate)
# Useful when sending multiple records efficiently
payload_split = {
    "dataframe_split": {
        "columns": ["sepal_length", "sepal_width", "petal_length", "petal_width"],
        "data": [
            [5.1, 3.5, 1.4, 0.2],  # First sample
            [6.2, 2.9, 4.3, 1.3]   # Second sample
        ]
    }
}

# Method 2: Records-orient format (list of dictionaries)
# More readable but slightly larger payload
payload_records = {
    "dataframe_records": [
        {"sepal_length": 5.1, "sepal_width": 3.5, "petal_length": 1.4, "petal_width": 0.2},
        {"sepal_length": 6.2, "sepal_width": 2.9, "petal_length": 4.3, "petal_width": 1.3}
    ]
}

# Make the prediction request
headers = {"Content-Type": "application/json"}
response = requests.post(
    MODEL_SERVER_URL,
    headers=headers,
    data=json.dumps(payload_split)
)

# Handle the response
if response.status_code == 200:
    predictions = response.json()
    print(f"Predictions: {predictions}")
else:
    print(f"Error: {response.status_code}")
    print(f"Message: {response.text}")
```

```bash
# Using curl for quick testing
curl -X POST http://localhost:5001/invocations \
    -H "Content-Type: application/json" \
    -d '{"dataframe_split": {"columns": ["sepal_length", "sepal_width", "petal_length", "petal_width"], "data": [[5.1, 3.5, 1.4, 0.2]]}}'
```

---

## Docker Deployment

MLflow can generate Docker images for your models, providing consistent deployment across environments. This is the recommended approach for production deployments.

### Building the Docker Image

The mlflow models build-docker command creates a self-contained Docker image with your model, dependencies, and serving infrastructure.

```bash
# Build a Docker image from a registered model
# The image includes the model, dependencies, and MLflow serving code
mlflow models build-docker \
    --model-uri "models:/iris-classifier/Production" \
    --name "iris-classifier" \
    --enable-mlserver  # Use MLServer instead of default Flask server

# Build with a specific tag for versioning
mlflow models build-docker \
    --model-uri "models:/iris-classifier/1" \
    --name "iris-classifier:v1"

# Build from a local run (useful for CI/CD pipelines)
mlflow models build-docker \
    --model-uri "runs:/abc123def456/model" \
    --name "my-model:latest"
```

### Running the Docker Container

Once built, you can run the container locally or push it to a container registry for deployment to orchestration platforms.

```bash
# Run the container locally for testing
# Maps port 8080 in container to 5001 on host
docker run -p 5001:8080 iris-classifier

# Run with environment variables for configuration
docker run -p 5001:8080 \
    -e GUNICORN_CMD_ARGS="--timeout 60 --workers 4" \
    iris-classifier

# Run with resource limits (recommended for production)
docker run -p 5001:8080 \
    --memory="2g" \
    --cpus="2" \
    iris-classifier

# Run in detached mode with container name
docker run -d \
    --name iris-model-server \
    -p 5001:8080 \
    --restart unless-stopped \
    iris-classifier
```

### Custom Dockerfile

For more control over the deployment environment, you can create a custom Dockerfile based on MLflow's generated image or from scratch.

```dockerfile
# Dockerfile
# Custom Dockerfile for MLflow model deployment
FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Install system dependencies required by ML libraries
RUN apt-get update && apt-get install -y \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
# Pin versions for reproducibility
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the model artifacts
# These are exported from MLflow using mlflow.artifacts.download_artifacts()
COPY model/ /app/model/

# Copy the serving script
COPY serve.py .

# Expose the serving port
EXPOSE 8080

# Health check for orchestration platforms
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Run the model server
# Using gunicorn for production-grade serving
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "--workers", "2", "--timeout", "120", "serve:app"]
```

```python
# serve.py
# Custom Flask serving script for MLflow models
from flask import Flask, request, jsonify
import mlflow.pyfunc
import pandas as pd
import os

app = Flask(__name__)

# Load the model at startup (not per-request)
# The model path is set during container build
MODEL_PATH = os.getenv("MODEL_PATH", "/app/model")
model = mlflow.pyfunc.load_model(MODEL_PATH)

@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint for load balancers and orchestration"""
    return jsonify({"status": "healthy"})

@app.route("/invocations", methods=["POST"])
def predict():
    """Prediction endpoint compatible with MLflow serving format"""
    try:
        # Parse the incoming JSON payload
        data = request.get_json()

        # Handle different input formats
        if "dataframe_split" in data:
            df = pd.DataFrame(
                data["dataframe_split"]["data"],
                columns=data["dataframe_split"]["columns"]
            )
        elif "dataframe_records" in data:
            df = pd.DataFrame(data["dataframe_records"])
        else:
            return jsonify({"error": "Invalid input format"}), 400

        # Make predictions
        predictions = model.predict(df)

        # Return predictions as JSON
        return jsonify({"predictions": predictions.tolist()})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
```

---

## Kubernetes Deployment

Deploying MLflow models to Kubernetes enables auto-scaling, high availability, and integration with your existing infrastructure. This section covers creating the necessary Kubernetes resources.

### Kubernetes Deployment Manifest

The Deployment resource defines how your model container runs in Kubernetes, including replicas, resource limits, and health checks.

```yaml
# k8s/deployment.yaml
# Kubernetes Deployment for MLflow model serving
apiVersion: apps/v1
kind: Deployment
metadata:
  name: iris-classifier
  labels:
    app: iris-classifier
    version: v1
spec:
  replicas: 3  # Number of pod replicas for high availability
  selector:
    matchLabels:
      app: iris-classifier
  template:
    metadata:
      labels:
        app: iris-classifier
        version: v1
    spec:
      containers:
        - name: model-server
          image: your-registry.com/iris-classifier:v1
          ports:
            - containerPort: 8080
              name: http
          # Resource requests and limits for scheduling and stability
          resources:
            requests:
              memory: "512Mi"
              cpu: "500m"
            limits:
              memory: "2Gi"
              cpu: "2000m"
          # Liveness probe restarts unhealthy pods
          livenessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 30  # Time for model loading
            periodSeconds: 10
            failureThreshold: 3
          # Readiness probe controls traffic routing
          readinessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 5
          # Environment variables for configuration
          env:
            - name: GUNICORN_WORKERS
              value: "2"
            - name: MODEL_NAME
              value: "iris-classifier"
```

### Service and Ingress

The Service exposes your deployment internally, while the Ingress provides external access with TLS termination.

```yaml
# k8s/service.yaml
# Service for internal load balancing
apiVersion: v1
kind: Service
metadata:
  name: iris-classifier
  labels:
    app: iris-classifier
spec:
  type: ClusterIP  # Internal service
  ports:
    - port: 80
      targetPort: 8080
      protocol: TCP
      name: http
  selector:
    app: iris-classifier
---
# k8s/ingress.yaml
# Ingress for external access with TLS
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: iris-classifier
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod  # Automatic TLS
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"  # Allow larger payloads
spec:
  tls:
    - hosts:
        - ml.example.com
      secretName: iris-classifier-tls
  rules:
    - host: ml.example.com
      http:
        paths:
          - path: /iris-classifier
            pathType: Prefix
            backend:
              service:
                name: iris-classifier
                port:
                  number: 80
```

### Horizontal Pod Autoscaler

The HPA automatically scales your deployment based on CPU or custom metrics, ensuring your model can handle varying load.

```yaml
# k8s/hpa.yaml
# Horizontal Pod Autoscaler for automatic scaling
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: iris-classifier
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: iris-classifier
  minReplicas: 2  # Minimum for high availability
  maxReplicas: 10  # Maximum during peak load
  metrics:
    # Scale based on CPU utilization
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70  # Scale up when CPU exceeds 70%
    # Scale based on memory (optional)
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
  behavior:
    # Control how quickly to scale up
    scaleUp:
      stabilizationWindowSeconds: 60  # Wait before scaling up
      policies:
        - type: Percent
          value: 100  # Can double pods
          periodSeconds: 60
    # Control how quickly to scale down
    scaleDown:
      stabilizationWindowSeconds: 300  # Wait 5 minutes before scaling down
      policies:
        - type: Percent
          value: 50  # Remove at most 50% of pods
          periodSeconds: 60
```

### Deploying to Kubernetes

Use kubectl to apply the manifests and deploy your model to the cluster.

```bash
# Apply all Kubernetes resources
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml
kubectl apply -f k8s/hpa.yaml

# Check deployment status
kubectl get deployments iris-classifier
kubectl get pods -l app=iris-classifier

# View logs from a pod
kubectl logs -l app=iris-classifier --tail=100

# Test the service internally
kubectl run curl --image=curlimages/curl -it --rm -- \
    curl -X POST http://iris-classifier/invocations \
    -H "Content-Type: application/json" \
    -d '{"dataframe_split": {"columns": ["sepal_length", "sepal_width", "petal_length", "petal_width"], "data": [[5.1, 3.5, 1.4, 0.2]]}}'

# Scale manually if needed
kubectl scale deployment iris-classifier --replicas=5
```

---

## SageMaker Integration

MLflow integrates with AWS SageMaker for managed model deployment. This provides auto-scaling, A/B testing, and integration with the AWS ecosystem.

### Prerequisites and Setup

Before deploying to SageMaker, ensure you have the necessary AWS credentials and permissions configured.

```bash
# Install the required packages
pip install mlflow[sagemaker] boto3

# Configure AWS credentials (if not already configured)
aws configure

# Verify access to SageMaker
aws sagemaker list-endpoints
```

### Deploying to SageMaker

MLflow provides the mlflow.sagemaker module for deploying models directly to SageMaker endpoints.

```python
# deploy_sagemaker.py
# Deploy an MLflow model to AWS SageMaker
import mlflow.sagemaker

# Define deployment configuration
app_name = "iris-classifier"  # SageMaker endpoint name
model_uri = "models:/iris-classifier/Production"  # Model to deploy
region = "us-west-2"  # AWS region

# The execution role needs SageMaker permissions
# Create this role in IAM with SageMaker execution policy
execution_role_arn = "arn:aws:iam::123456789012:role/SageMakerExecutionRole"

# S3 bucket for model artifacts (SageMaker requirement)
bucket = "my-mlflow-models"

# Deploy to SageMaker
# This creates a SageMaker endpoint with the specified configuration
mlflow.sagemaker.deploy(
    app_name=app_name,
    model_uri=model_uri,
    region_name=region,
    mode="create",  # Use "replace" to update existing endpoint
    execution_role_arn=execution_role_arn,
    bucket=bucket,
    image_url=None,  # Use default MLflow image
    instance_type="ml.m5.large",  # Instance type for inference
    instance_count=1,  # Number of instances
    vpc_config=None,  # Optional VPC configuration
    data_capture_config=None,  # Optional data capture for monitoring
    synchronous=True,  # Wait for deployment to complete
    timeout_seconds=1200  # Timeout for deployment
)

print(f"Model deployed to SageMaker endpoint: {app_name}")
```

### Making Predictions with SageMaker

Once deployed, you can invoke the SageMaker endpoint using the AWS SDK or MLflow's prediction API.

```python
# predict_sagemaker.py
# Make predictions against a SageMaker endpoint
import boto3
import json
import pandas as pd

# Method 1: Using boto3 SageMaker runtime
sagemaker_runtime = boto3.client("sagemaker-runtime", region_name="us-west-2")

# Prepare the input data
input_data = {
    "dataframe_split": {
        "columns": ["sepal_length", "sepal_width", "petal_length", "petal_width"],
        "data": [[5.1, 3.5, 1.4, 0.2]]
    }
}

# Invoke the endpoint
response = sagemaker_runtime.invoke_endpoint(
    EndpointName="iris-classifier",
    ContentType="application/json",
    Body=json.dumps(input_data)
)

# Parse the response
predictions = json.loads(response["Body"].read().decode("utf-8"))
print(f"SageMaker predictions: {predictions}")


# Method 2: Using MLflow's SageMaker deployment client
import mlflow.sagemaker

# Get predictions using MLflow's API
result = mlflow.sagemaker.predict(
    app_name="iris-classifier",
    region_name="us-west-2",
    data=pd.DataFrame({
        "sepal_length": [5.1, 6.2],
        "sepal_width": [3.5, 2.9],
        "petal_length": [1.4, 4.3],
        "petal_width": [0.2, 1.3]
    })
)
print(f"MLflow SageMaker predictions: {result}")
```

### Updating and Deleting SageMaker Endpoints

Manage your SageMaker endpoints for model updates and cleanup.

```python
# manage_sagemaker.py
# Update and delete SageMaker endpoints
import mlflow.sagemaker

# Update an existing endpoint with a new model version
# This performs a rolling update with no downtime
mlflow.sagemaker.deploy(
    app_name="iris-classifier",
    model_uri="models:/iris-classifier/2",  # New version
    region_name="us-west-2",
    mode="replace",  # Update existing endpoint
    execution_role_arn="arn:aws:iam::123456789012:role/SageMakerExecutionRole",
    bucket="my-mlflow-models",
    instance_type="ml.m5.large",
    instance_count=2,  # Scale up during update
    synchronous=True
)

# Delete an endpoint when no longer needed
# This removes the endpoint and stops billing
mlflow.sagemaker.delete(
    app_name="iris-classifier",
    region_name="us-west-2",
    archive=False,  # Set True to keep model artifacts
    synchronous=True
)
print("SageMaker endpoint deleted")
```

---

## Best Practices Summary

1. **Use the Model Registry** - Centralize model versioning and stage management for traceability
2. **Define model signatures** - Include input/output schemas for validation and documentation
3. **Pin dependencies** - Use conda.yaml or requirements.txt with pinned versions for reproducibility
4. **Implement health checks** - Add /health endpoints for load balancers and orchestration
5. **Set resource limits** - Configure memory and CPU limits to prevent resource exhaustion
6. **Use staging environments** - Test models in Staging before promoting to Production
7. **Enable autoscaling** - Configure HPA in Kubernetes or auto-scaling in SageMaker
8. **Monitor predictions** - Log predictions and latency for model performance monitoring
9. **Version Docker images** - Tag images with model version for rollback capability
10. **Automate deployments** - Use CI/CD pipelines to automate model promotion and deployment

---

*Need to monitor your MLflow deployments? [OneUptime](https://oneuptime.com) provides comprehensive observability for ML infrastructure, including latency tracking, error alerting, and resource monitoring for your model serving endpoints.*
