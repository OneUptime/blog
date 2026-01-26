# How to Get Started with MLflow for ML Lifecycle

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MLflow, Machine Learning, MLOps, Model Registry, Experiment Tracking

Description: A beginner's guide to MLflow for machine learning lifecycle management with experiment tracking, model registry, and deployment.

---

Managing machine learning projects without proper tooling leads to lost experiments, untraceable models, and deployment nightmares. MLflow is an open-source platform that addresses these challenges by providing a unified framework for the entire ML lifecycle. This guide walks you through setting up MLflow and using its core components to bring order to your ML workflows.

## Understanding the ML Lifecycle

Before diving into MLflow, let us look at what the ML lifecycle actually involves:

```mermaid
flowchart LR
    A[Data Preparation] --> B[Experimentation]
    B --> C[Model Training]
    C --> D[Model Evaluation]
    D --> E{Good Enough?}
    E -->|No| B
    E -->|Yes| F[Model Registry]
    F --> G[Staging]
    G --> H[Production]
    H --> I[Monitoring]
    I --> A
```

MLflow provides tools for each stage of this cycle, helping you track experiments, version models, and deploy them consistently.

## MLflow Components Overview

MLflow consists of four main components that work together:

```mermaid
graph TB
    subgraph MLflow["MLflow Platform"]
        A[Tracking] --> B[Projects]
        B --> C[Models]
        C --> D[Registry]
    end

    E[Data Scientists] --> A
    F[ML Engineers] --> C
    G[Production Systems] --> D

    style MLflow fill:#f5f5f5,stroke:#333
```

- **MLflow Tracking**: Logs parameters, metrics, and artifacts from your experiments
- **MLflow Projects**: Packages ML code in a reproducible format
- **MLflow Models**: Standardizes model packaging for deployment
- **MLflow Registry**: Central hub for model versioning and lifecycle management

## Installing and Configuring MLflow

Start by installing MLflow and its dependencies:

```bash
# Install MLflow with all optional dependencies
pip install mlflow[extras]

# For a minimal installation
pip install mlflow

# Verify the installation
mlflow --version
```

Create a project structure for organized ML development:

```bash
# Create project directories
mkdir -p ml-project/{data,notebooks,src,models}
cd ml-project

# Initialize MLflow tracking
mlflow ui --backend-store-uri sqlite:///mlflow.db --port 5000
```

## Building Your First MLflow Project

Let us build a complete example that demonstrates the ML lifecycle with MLflow. We will create a simple classification model and track everything from data loading to model registration.

```python
# ml_pipeline.py
import mlflow
import mlflow.sklearn
from mlflow.tracking import MlflowClient
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
import warnings
warnings.filterwarnings('ignore')

# Configure MLflow to use a local tracking server
# Change this URI to point to a remote server for team collaboration
mlflow.set_tracking_uri("http://localhost:5000")

# Create or get an experiment
# Experiments group related runs together for easy comparison
experiment_name = "customer-churn-prediction"
mlflow.set_experiment(experiment_name)

def load_and_prepare_data():
    """
    Load and prepare the dataset for training.
    In production, this would connect to your data warehouse.
    """
    # Generate synthetic data for demonstration
    np.random.seed(42)
    n_samples = 1000

    # Create features that simulate customer behavior
    data = pd.DataFrame({
        'tenure_months': np.random.randint(1, 72, n_samples),
        'monthly_charges': np.random.uniform(20, 100, n_samples),
        'total_charges': np.random.uniform(100, 5000, n_samples),
        'num_support_tickets': np.random.poisson(2, n_samples),
        'contract_type': np.random.choice([0, 1, 2], n_samples),  # Month-to-month, One year, Two year
        'payment_method': np.random.choice([0, 1, 2, 3], n_samples),
    })

    # Create target variable with some logic
    # Customers with short tenure and high charges are more likely to churn
    churn_probability = (
        0.3 - (data['tenure_months'] / 100) +
        (data['monthly_charges'] / 200) +
        (data['num_support_tickets'] / 20)
    )
    data['churn'] = (churn_probability + np.random.normal(0, 0.1, n_samples) > 0.3).astype(int)

    return data

def preprocess_data(data):
    """
    Preprocess the data by scaling numerical features.
    """
    # Separate features and target
    X = data.drop('churn', axis=1)
    y = data['churn']

    # Split into train and test sets
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # Scale numerical features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    return X_train_scaled, X_test_scaled, y_train, y_test, scaler

def train_and_log_model(model_class, model_params, X_train, X_test, y_train, y_test, run_name):
    """
    Train a model and log everything to MLflow.
    This function demonstrates comprehensive experiment tracking.
    """
    with mlflow.start_run(run_name=run_name) as run:
        # Log the model class name as a tag for filtering
        mlflow.set_tag("model_type", model_class.__name__)
        mlflow.set_tag("developer", "data-science-team")

        # Log all hyperparameters
        # These can be used to reproduce the exact model later
        for param_name, param_value in model_params.items():
            mlflow.log_param(param_name, param_value)

        # Log dataset information
        mlflow.log_param("train_samples", len(y_train))
        mlflow.log_param("test_samples", len(y_test))
        mlflow.log_param("feature_count", X_train.shape[1])

        # Initialize and train the model
        model = model_class(**model_params)
        model.fit(X_train, y_train)

        # Make predictions
        y_pred = model.predict(X_test)
        y_pred_proba = model.predict_proba(X_test)[:, 1]

        # Calculate multiple metrics
        # Logging several metrics helps compare models across different criteria
        metrics = {
            "accuracy": accuracy_score(y_test, y_pred),
            "precision": precision_score(y_test, y_pred),
            "recall": recall_score(y_test, y_pred),
            "f1_score": f1_score(y_test, y_pred),
        }

        # Perform cross-validation and log the results
        cv_scores = cross_val_score(model, X_train, y_train, cv=5, scoring='f1')
        metrics["cv_f1_mean"] = cv_scores.mean()
        metrics["cv_f1_std"] = cv_scores.std()

        # Log all metrics
        for metric_name, metric_value in metrics.items():
            mlflow.log_metric(metric_name, metric_value)

        # Log the model with its signature
        # The signature helps validate inputs during inference
        from mlflow.models import infer_signature
        signature = infer_signature(X_train, y_pred)
        mlflow.sklearn.log_model(
            model,
            "model",
            signature=signature,
            registered_model_name=None  # We will register manually later
        )

        # Log feature importance as an artifact
        if hasattr(model, 'feature_importances_'):
            importance_df = pd.DataFrame({
                'feature': [f'feature_{i}' for i in range(len(model.feature_importances_))],
                'importance': model.feature_importances_
            }).sort_values('importance', ascending=False)

            importance_df.to_csv('feature_importance.csv', index=False)
            mlflow.log_artifact('feature_importance.csv')

        print(f"Run {run_name} completed with F1 Score: {metrics['f1_score']:.4f}")
        return run.info.run_id, metrics

if __name__ == "__main__":
    # Load and prepare data
    print("Loading and preparing data...")
    data = load_and_prepare_data()
    X_train, X_test, y_train, y_test, scaler = preprocess_data(data)

    # Define experiments to run
    # Each configuration will be logged as a separate run
    experiments = [
        {
            "model_class": RandomForestClassifier,
            "params": {"n_estimators": 100, "max_depth": 10, "random_state": 42},
            "name": "rf-baseline"
        },
        {
            "model_class": RandomForestClassifier,
            "params": {"n_estimators": 200, "max_depth": 15, "min_samples_split": 5, "random_state": 42},
            "name": "rf-tuned"
        },
        {
            "model_class": GradientBoostingClassifier,
            "params": {"n_estimators": 100, "max_depth": 5, "learning_rate": 0.1, "random_state": 42},
            "name": "gb-baseline"
        },
    ]

    # Run all experiments
    results = []
    for exp in experiments:
        run_id, metrics = train_and_log_model(
            exp["model_class"],
            exp["params"],
            X_train, X_test, y_train, y_test,
            exp["name"]
        )
        results.append({"run_id": run_id, "name": exp["name"], **metrics})

    # Print summary
    print("\n" + "="*60)
    print("Experiment Summary")
    print("="*60)
    results_df = pd.DataFrame(results)
    print(results_df[['name', 'accuracy', 'f1_score', 'cv_f1_mean']].to_string(index=False))
```

## Working with the Model Registry

The Model Registry is where models graduate from experiments to production candidates. Here is how to use it:

```mermaid
stateDiagram-v2
    [*] --> None: Model Logged
    None --> Staging: Promote for Testing
    Staging --> Production: Approved
    Staging --> Archived: Rejected
    Production --> Archived: Replaced
    Archived --> [*]
```

```python
# model_registry.py
from mlflow.tracking import MlflowClient
import mlflow

# Initialize the MLflow client
client = MlflowClient()

def register_best_model(experiment_name, model_name):
    """
    Find the best model from an experiment and register it.
    """
    # Get the experiment
    experiment = client.get_experiment_by_name(experiment_name)

    # Search for the best run based on F1 score
    runs = client.search_runs(
        experiment_ids=[experiment.experiment_id],
        filter_string="",
        order_by=["metrics.f1_score DESC"],
        max_results=1
    )

    if not runs:
        print("No runs found in the experiment")
        return None

    best_run = runs[0]
    print(f"Best run: {best_run.info.run_id}")
    print(f"F1 Score: {best_run.data.metrics.get('f1_score', 'N/A')}")

    # Register the model from the best run
    model_uri = f"runs:/{best_run.info.run_id}/model"

    # This creates a new registered model or adds a version to an existing one
    result = mlflow.register_model(model_uri, model_name)
    print(f"Registered model version: {result.version}")

    return result

def transition_model_stage(model_name, version, stage):
    """
    Transition a model version to a new stage.
    Valid stages: None, Staging, Production, Archived
    """
    client.transition_model_version_stage(
        name=model_name,
        version=version,
        stage=stage,
        archive_existing_versions=True  # Archive any existing model in this stage
    )
    print(f"Model {model_name} version {version} transitioned to {stage}")

def get_production_model(model_name):
    """
    Load the current production model for inference.
    """
    # Load model using the production alias
    model_uri = f"models:/{model_name}/Production"

    try:
        model = mlflow.sklearn.load_model(model_uri)
        print(f"Loaded production model: {model_name}")
        return model
    except Exception as e:
        print(f"No production model found: {e}")
        return None

def list_model_versions(model_name):
    """
    List all versions of a registered model with their stages.
    """
    versions = client.search_model_versions(f"name='{model_name}'")

    print(f"\nModel: {model_name}")
    print("-" * 50)
    for v in versions:
        print(f"Version {v.version}: Stage={v.current_stage}, "
              f"Created={v.creation_timestamp}, "
              f"Run ID={v.run_id[:8]}...")

# Example usage
if __name__ == "__main__":
    model_name = "churn-prediction-model"

    # Register the best model from our experiments
    result = register_best_model("customer-churn-prediction", model_name)

    if result:
        # Transition to staging for testing
        transition_model_stage(model_name, result.version, "Staging")

        # After validation, promote to production
        # In practice, this would happen after automated tests pass
        transition_model_stage(model_name, result.version, "Production")

        # List all versions
        list_model_versions(model_name)
```

## Creating Reproducible ML Projects

MLflow Projects let you package your code so anyone can run it. Create an `MLproject` file:

```yaml
# MLproject
name: customer-churn-prediction

# Use conda environment for dependencies
conda_env: conda.yaml

# Or use a Docker image for complete reproducibility
# docker_env:
#   image: ml-training:latest

entry_points:
  # Main training entry point
  train:
    parameters:
      n_estimators: {type: int, default: 100}
      max_depth: {type: int, default: 10}
      learning_rate: {type: float, default: 0.1}
      data_path: {type: str, default: "data/training.csv"}
    command: "python train.py --n_estimators {n_estimators} --max_depth {max_depth} --learning_rate {learning_rate} --data_path {data_path}"

  # Hyperparameter tuning entry point
  tune:
    parameters:
      num_trials: {type: int, default: 20}
    command: "python tune_hyperparameters.py --num_trials {num_trials}"

  # Model evaluation entry point
  evaluate:
    parameters:
      model_uri: {type: str}
      test_data: {type: str, default: "data/test.csv"}
    command: "python evaluate.py --model_uri {model_uri} --test_data {test_data}"
```

Create the conda environment file:

```yaml
# conda.yaml
name: churn-prediction
channels:
  - conda-forge
  - defaults
dependencies:
  - python=3.10
  - pip
  - pip:
    - mlflow>=2.10.0
    - scikit-learn>=1.3.0
    - pandas>=2.0.0
    - numpy>=1.24.0
```

Run the project from anywhere:

```bash
# Run the training entry point with default parameters
mlflow run . -e train

# Run with custom parameters
mlflow run . -e train -P n_estimators=200 -P max_depth=15

# Run from a Git repository
mlflow run https://github.com/your-org/ml-project.git -e train

# Run with a specific Git commit for exact reproducibility
mlflow run https://github.com/your-org/ml-project.git#commit_sha -e train
```

## Deploying Models with MLflow

MLflow provides several ways to deploy models. Here is a practical approach:

```mermaid
flowchart TB
    A[Registered Model] --> B{Deployment Target}
    B --> C[REST API]
    B --> D[Batch Scoring]
    B --> E[Edge Device]

    C --> F[mlflow serve]
    C --> G[Docker Container]
    C --> H[Kubernetes]

    D --> I[Spark UDF]
    D --> J[Python Script]

    E --> K[ONNX Export]
```

### Local Model Serving

Serve a model as a REST API locally:

```bash
# Serve the production model
mlflow models serve -m "models:/churn-prediction-model/Production" -p 5001

# Test the endpoint
curl -X POST http://localhost:5001/invocations \
  -H "Content-Type: application/json" \
  -d '{"dataframe_split": {"columns": ["tenure_months", "monthly_charges", "total_charges", "num_support_tickets", "contract_type", "payment_method"], "data": [[24, 65.5, 1500.0, 2, 1, 2]]}}'
```

### Building a Docker Container

Create a Docker image for your model:

```bash
# Build a Docker image containing the model
mlflow models build-docker -m "models:/churn-prediction-model/Production" -n churn-model:latest

# Run the container
docker run -p 5001:8080 churn-model:latest
```

### Kubernetes Deployment

Deploy to Kubernetes with a complete manifest:

```yaml
# model-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: churn-prediction-model
  namespace: ml-serving
spec:
  replicas: 3
  selector:
    matchLabels:
      app: churn-model
  template:
    metadata:
      labels:
        app: churn-model
    spec:
      containers:
        - name: model
          # Use the Docker image built by MLflow
          image: your-registry/churn-model:v1.2.0
          ports:
            - containerPort: 8080
          env:
            # Configure model server settings
            - name: MLFLOW_MODEL_URI
              value: "models:/churn-prediction-model/Production"
            - name: GUNICORN_CMD_ARGS
              value: "--workers=4 --timeout=60"
          resources:
            requests:
              memory: "1Gi"
              cpu: "500m"
            limits:
              memory: "2Gi"
              cpu: "1000m"
          # Health checks for Kubernetes
          livenessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: churn-model-service
  namespace: ml-serving
spec:
  selector:
    app: churn-model
  ports:
    - port: 80
      targetPort: 8080
  type: ClusterIP
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: churn-model-ingress
  namespace: ml-serving
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  rules:
    - host: churn-model.your-domain.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: churn-model-service
                port:
                  number: 80
```

## Batch Inference with MLflow

For batch processing, load models directly in your data pipelines:

```python
# batch_inference.py
import mlflow
import pandas as pd
from datetime import datetime

def run_batch_inference(model_name, input_path, output_path):
    """
    Run batch inference on a dataset using the production model.
    """
    # Load the production model
    model_uri = f"models:/{model_name}/Production"
    model = mlflow.sklearn.load_model(model_uri)

    # Load input data
    print(f"Loading data from {input_path}")
    data = pd.read_csv(input_path)

    # Store original identifiers
    if 'customer_id' in data.columns:
        customer_ids = data['customer_id']
        data = data.drop('customer_id', axis=1)
    else:
        customer_ids = range(len(data))

    # Make predictions
    print("Running predictions...")
    predictions = model.predict(data)
    probabilities = model.predict_proba(data)[:, 1]

    # Create output dataframe
    results = pd.DataFrame({
        'customer_id': customer_ids,
        'churn_prediction': predictions,
        'churn_probability': probabilities,
        'prediction_timestamp': datetime.now().isoformat()
    })

    # Save results
    results.to_csv(output_path, index=False)
    print(f"Predictions saved to {output_path}")

    # Log this batch run to MLflow for auditing
    with mlflow.start_run(run_name=f"batch-inference-{datetime.now().strftime('%Y%m%d')}"):
        mlflow.set_tag("job_type", "batch_inference")
        mlflow.log_param("model_name", model_name)
        mlflow.log_param("input_records", len(data))
        mlflow.log_metric("predicted_churns", int(predictions.sum()))
        mlflow.log_metric("avg_churn_probability", float(probabilities.mean()))
        mlflow.log_artifact(output_path)

    return results

# Example usage
if __name__ == "__main__":
    run_batch_inference(
        model_name="churn-prediction-model",
        input_path="data/customers_to_score.csv",
        output_path="data/churn_predictions.csv"
    )
```

## Setting Up a Team MLflow Server

For team collaboration, deploy MLflow with proper backend storage:

```mermaid
flowchart TB
    subgraph Team["Team Infrastructure"]
        A[Data Scientists] --> B[MLflow Server]
        B --> C[(PostgreSQL)]
        B --> D[(S3/MinIO)]
    end

    E[CI/CD Pipeline] --> B
    F[Model Serving] --> D

    style Team fill:#e8f4ea,stroke:#333
```

Docker Compose setup for a complete MLflow server:

```yaml
# docker-compose.yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: mlflow
      POSTGRES_PASSWORD: mlflow_password
      POSTGRES_DB: mlflow
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U mlflow"]
      interval: 5s
      timeout: 5s
      retries: 5

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minio_access_key
      MINIO_ROOT_PASSWORD: minio_secret_key
    volumes:
      - minio_data:/data
    ports:
      - "9000:9000"
      - "9001:9001"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 20s
      retries: 3

  # Initialize MinIO bucket
  minio-init:
    image: minio/mc:latest
    depends_on:
      minio:
        condition: service_healthy
    entrypoint: >
      /bin/sh -c "
      mc alias set myminio http://minio:9000 minio_access_key minio_secret_key;
      mc mb --ignore-existing myminio/mlflow-artifacts;
      mc anonymous set download myminio/mlflow-artifacts;
      exit 0;
      "

  mlflow:
    image: ghcr.io/mlflow/mlflow:v2.10.0
    depends_on:
      postgres:
        condition: service_healthy
      minio:
        condition: service_healthy
    environment:
      MLFLOW_S3_ENDPOINT_URL: http://minio:9000
      AWS_ACCESS_KEY_ID: minio_access_key
      AWS_SECRET_ACCESS_KEY: minio_secret_key
    ports:
      - "5000:5000"
    command: >
      mlflow server
      --backend-store-uri postgresql://mlflow:mlflow_password@postgres:5432/mlflow
      --default-artifact-root s3://mlflow-artifacts/
      --host 0.0.0.0
      --port 5000

volumes:
  postgres_data:
  minio_data:
```

Start the server:

```bash
# Start all services
docker-compose up -d

# Check logs
docker-compose logs -f mlflow

# Configure your environment to use this server
export MLFLOW_TRACKING_URI=http://localhost:5000
export MLFLOW_S3_ENDPOINT_URL=http://localhost:9000
export AWS_ACCESS_KEY_ID=minio_access_key
export AWS_SECRET_ACCESS_KEY=minio_secret_key
```

## Best Practices for MLflow

1. **Organize experiments by project**: Use descriptive experiment names that include the project and version
2. **Tag everything**: Add tags for easy filtering by team, purpose, or dataset version
3. **Version your data**: Log data version or hash along with model runs
4. **Use nested runs**: Group related runs under a parent run for hyperparameter sweeps
5. **Set up model validation**: Create automated tests that run before models can be promoted to production
6. **Clean up old artifacts**: Implement a retention policy for old experiment artifacts

```python
# Example: Comprehensive tagging strategy
with mlflow.start_run():
    # Project metadata
    mlflow.set_tag("project", "customer-analytics")
    mlflow.set_tag("team", "data-science")
    mlflow.set_tag("owner", "alice@company.com")

    # Data lineage
    mlflow.set_tag("data_source", "data-warehouse")
    mlflow.set_tag("data_version", "v2.3.1")
    mlflow.set_tag("training_date", "2024-01-15")

    # Model metadata
    mlflow.set_tag("model_type", "classification")
    mlflow.set_tag("framework", "scikit-learn")

    # Environment
    mlflow.set_tag("environment", "development")
    mlflow.set_tag("git_commit", "abc123")
```

---

MLflow transforms chaotic ML development into a structured, traceable process. Start with experiment tracking to get immediate value, then gradually adopt the model registry and deployment features as your ML practice matures. The investment in proper ML lifecycle management pays dividends when you need to audit models, reproduce results, or scale your team.
