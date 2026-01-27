# How to Use MLflow for Experiment Tracking

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MLflow, MLOps, Machine Learning, Experiment Tracking, Python

Description: Learn how to use MLflow Tracking for logging experiments, comparing runs, and managing the machine learning lifecycle.

---

> Machine learning experiments without proper tracking become a chaotic mess of notebooks and confusion. MLflow provides structure by logging parameters, metrics, and artifacts - making your experiments reproducible and your model comparisons straightforward.

MLflow is an open-source platform for managing the end-to-end machine learning lifecycle. This guide focuses on the Tracking component, which helps you log and query experiments using Python.

---

## MLflow Components Overview

MLflow consists of four main components:

- **MLflow Tracking** - Log parameters, metrics, and artifacts from your ML experiments
- **MLflow Projects** - Package ML code in a reusable, reproducible format
- **MLflow Models** - Deploy models to various serving environments
- **Model Registry** - Centralized model store with versioning and stage transitions

This guide primarily covers MLflow Tracking with an introduction to the Model Registry at the end.

---

## Setting Up MLflow Tracking Server

### Installation

```bash
# Install MLflow with all dependencies
pip install mlflow

# For database backend support (PostgreSQL example)
pip install mlflow psycopg2-binary
```

### Local Tracking

By default, MLflow stores data locally in an `mlruns` directory.

```python
# local_tracking.py
# Simple local MLflow setup - no server required
import mlflow

# Set the tracking URI to a local directory (default behavior)
mlflow.set_tracking_uri("file:./mlruns")

# Set the experiment name - creates it if it doesn't exist
mlflow.set_experiment("my-first-experiment")

# Start a run and log some data
with mlflow.start_run():
    mlflow.log_param("learning_rate", 0.01)  # Log a hyperparameter
    mlflow.log_metric("accuracy", 0.95)       # Log a metric
    print("Run logged successfully")
```

### Running the Tracking Server

For team collaboration, run a centralized tracking server.

```bash
# Start MLflow server with SQLite backend and local artifact storage
mlflow server \
    --backend-store-uri sqlite:///mlflow.db \
    --default-artifact-root ./mlartifacts \
    --host 0.0.0.0 \
    --port 5000
```

```bash
# Production setup with PostgreSQL backend and S3 artifact storage
mlflow server \
    --backend-store-uri postgresql://user:pass@localhost:5432/mlflow \
    --default-artifact-root s3://my-mlflow-bucket/artifacts \
    --host 0.0.0.0 \
    --port 5000
```

### Connecting to Remote Server

```python
# remote_tracking.py
# Connect to a remote MLflow tracking server
import mlflow
import os

# Point to your MLflow tracking server
mlflow.set_tracking_uri("http://mlflow-server.example.com:5000")

# For authenticated servers, set credentials via environment
os.environ["MLFLOW_TRACKING_USERNAME"] = "your-username"
os.environ["MLFLOW_TRACKING_PASSWORD"] = "your-password"

# Verify connection by listing experiments
client = mlflow.MlflowClient()
experiments = client.search_experiments()
print(f"Connected. Found {len(experiments)} experiments.")
```

---

## Logging Parameters and Metrics

### Basic Logging

```python
# basic_logging.py
# Log parameters and metrics during model training
import mlflow

mlflow.set_experiment("parameter-logging-demo")

with mlflow.start_run(run_name="training-run-001"):
    # Log individual parameters (hyperparameters, configuration)
    mlflow.log_param("model_type", "random_forest")
    mlflow.log_param("n_estimators", 100)
    mlflow.log_param("max_depth", 10)
    mlflow.log_param("random_state", 42)

    # Log individual metrics (model performance)
    mlflow.log_metric("train_accuracy", 0.92)
    mlflow.log_metric("val_accuracy", 0.89)
    mlflow.log_metric("train_loss", 0.15)
    mlflow.log_metric("val_loss", 0.22)

    print("Parameters and metrics logged")
```

### Batch Logging

```python
# batch_logging.py
# Log multiple parameters and metrics at once
import mlflow

mlflow.set_experiment("batch-logging-demo")

# Define hyperparameters as a dictionary
params = {
    "learning_rate": 0.001,
    "batch_size": 32,
    "epochs": 100,
    "optimizer": "adam",
    "dropout_rate": 0.3
}

# Define metrics as a dictionary
metrics = {
    "accuracy": 0.94,
    "precision": 0.92,
    "recall": 0.91,
    "f1_score": 0.915,
    "auc_roc": 0.97
}

with mlflow.start_run(run_name="batch-logging-run"):
    # Log all parameters at once
    mlflow.log_params(params)

    # Log all metrics at once
    mlflow.log_metrics(metrics)

    print(f"Logged {len(params)} params and {len(metrics)} metrics")
```

### Logging Metrics Over Time

```python
# step_logging.py
# Log metrics at each training step for visualization
import mlflow
import random

mlflow.set_experiment("step-metrics-demo")

with mlflow.start_run(run_name="training-with-steps"):
    mlflow.log_param("epochs", 50)

    # Simulate training loop
    for epoch in range(50):
        # Simulate decreasing loss and increasing accuracy
        train_loss = 1.0 / (epoch + 1) + random.uniform(0, 0.1)
        val_loss = 1.0 / (epoch + 1) + random.uniform(0, 0.15)
        accuracy = 1 - train_loss + random.uniform(-0.05, 0.05)

        # Log metrics with step parameter for time series visualization
        mlflow.log_metric("train_loss", train_loss, step=epoch)
        mlflow.log_metric("val_loss", val_loss, step=epoch)
        mlflow.log_metric("accuracy", accuracy, step=epoch)

    print("Training complete - view metrics in MLflow UI")
```

---

## Logging Artifacts and Models

### Logging Files and Directories

```python
# artifact_logging.py
# Log files, plots, and directories as artifacts
import mlflow
import json
import matplotlib.pyplot as plt
import numpy as np
import os

mlflow.set_experiment("artifact-demo")

with mlflow.start_run(run_name="artifacts-example"):
    # Create a temporary directory for artifacts
    os.makedirs("temp_artifacts", exist_ok=True)

    # Save and log a JSON configuration file
    config = {"model": "xgboost", "features": ["age", "income", "score"]}
    config_path = "temp_artifacts/config.json"
    with open(config_path, "w") as f:
        json.dump(config, f, indent=2)
    mlflow.log_artifact(config_path)  # Logs single file

    # Create and log a matplotlib plot
    fig, ax = plt.subplots()
    x = np.linspace(0, 10, 100)
    ax.plot(x, np.sin(x), label="sin(x)")
    ax.plot(x, np.cos(x), label="cos(x)")
    ax.legend()
    ax.set_title("Training Curves")
    plot_path = "temp_artifacts/training_curves.png"
    fig.savefig(plot_path)
    plt.close()
    mlflow.log_artifact(plot_path)  # Logs the plot image

    # Log an entire directory
    os.makedirs("temp_artifacts/data", exist_ok=True)
    for i in range(3):
        with open(f"temp_artifacts/data/file_{i}.txt", "w") as f:
            f.write(f"Data file {i}")
    mlflow.log_artifacts("temp_artifacts/data", artifact_path="data_files")

    print("Artifacts logged successfully")
```

### Logging Models

```python
# model_logging.py
# Log scikit-learn models with MLflow
import mlflow
import mlflow.sklearn
from sklearn.ensemble import RandomForestClassifier
from sklearn.datasets import make_classification
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score

mlflow.set_experiment("model-logging-demo")

# Generate sample data
X, y = make_classification(n_samples=1000, n_features=20, random_state=42)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)

with mlflow.start_run(run_name="sklearn-model"):
    # Define and train model
    model = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42)
    model.fit(X_train, y_train)

    # Log model parameters
    mlflow.log_param("n_estimators", 100)
    mlflow.log_param("max_depth", 10)

    # Evaluate and log metrics
    train_acc = accuracy_score(y_train, model.predict(X_train))
    test_acc = accuracy_score(y_test, model.predict(X_test))
    mlflow.log_metric("train_accuracy", train_acc)
    mlflow.log_metric("test_accuracy", test_acc)

    # Log the model with signature inference
    mlflow.sklearn.log_model(
        model,
        artifact_path="model",  # Directory within artifacts
        input_example=X_train[:5],  # Sample input for schema inference
        registered_model_name=None  # Set a name to auto-register
    )

    print(f"Model logged. Test accuracy: {test_acc:.4f}")
```

### Logging PyTorch Models

```python
# pytorch_logging.py
# Log PyTorch models with MLflow
import mlflow
import mlflow.pytorch
import torch
import torch.nn as nn

mlflow.set_experiment("pytorch-model-demo")

# Define a simple neural network
class SimpleNN(nn.Module):
    def __init__(self, input_size, hidden_size, output_size):
        super().__init__()
        self.fc1 = nn.Linear(input_size, hidden_size)
        self.relu = nn.ReLU()
        self.fc2 = nn.Linear(hidden_size, output_size)

    def forward(self, x):
        x = self.fc1(x)
        x = self.relu(x)
        x = self.fc2(x)
        return x

with mlflow.start_run(run_name="pytorch-model"):
    # Log architecture parameters
    input_size, hidden_size, output_size = 20, 64, 2
    mlflow.log_params({
        "input_size": input_size,
        "hidden_size": hidden_size,
        "output_size": output_size
    })

    # Create and log model
    model = SimpleNN(input_size, hidden_size, output_size)

    # Log the PyTorch model
    mlflow.pytorch.log_model(
        model,
        artifact_path="pytorch_model",
        input_example=torch.randn(1, input_size).numpy()
    )

    print("PyTorch model logged")
```

---

## Organizing Experiments and Runs

### Creating and Managing Experiments

```python
# experiment_management.py
# Create and organize experiments programmatically
import mlflow
from mlflow import MlflowClient

client = MlflowClient()

# Create a new experiment with tags for organization
experiment_id = mlflow.create_experiment(
    name="image-classification-v2",
    artifact_location="s3://bucket/experiments/image-classification-v2",
    tags={
        "project": "computer-vision",
        "team": "ml-research",
        "dataset": "imagenet-subset"
    }
)
print(f"Created experiment with ID: {experiment_id}")

# Set tags on an existing experiment
client.set_experiment_tag(experiment_id, "status", "active")
client.set_experiment_tag(experiment_id, "owner", "data-science-team")

# List all experiments
experiments = client.search_experiments()
for exp in experiments:
    print(f"Experiment: {exp.name}, ID: {exp.experiment_id}")
```

### Tagging and Organizing Runs

```python
# run_organization.py
# Use tags and descriptions to organize runs
import mlflow

mlflow.set_experiment("organized-runs-demo")

# Start a run with a descriptive name and tags
with mlflow.start_run(run_name="baseline-model-v1") as run:
    # Set tags for filtering and organization
    mlflow.set_tag("model_type", "baseline")
    mlflow.set_tag("feature_set", "v1")
    mlflow.set_tag("data_version", "2024-01")
    mlflow.set_tag("engineer", "alice")

    # Add a description for the run
    mlflow.set_tag("mlflow.note.content",
        "Baseline random forest model with default hyperparameters. "
        "Using feature set v1 with 50 features."
    )

    # Log parameters and metrics
    mlflow.log_params({"n_estimators": 100, "max_depth": None})
    mlflow.log_metric("accuracy", 0.85)

    run_id = run.info.run_id
    print(f"Run ID: {run_id}")

# Start a child run for hyperparameter tuning
with mlflow.start_run(run_name="hyperparam-search") as parent_run:
    mlflow.set_tag("run_type", "hyperparameter_search")

    # Create nested runs for each trial
    for trial, (n_est, depth) in enumerate([(50, 5), (100, 10), (200, 15)]):
        with mlflow.start_run(run_name=f"trial-{trial}", nested=True):
            mlflow.log_params({"n_estimators": n_est, "max_depth": depth})
            # Simulate accuracy
            accuracy = 0.80 + (n_est / 1000) + (depth / 100)
            mlflow.log_metric("accuracy", min(accuracy, 0.95))
            mlflow.set_tag("trial_number", trial)

    print(f"Parent run ID: {parent_run.info.run_id}")
```

---

## Comparing Runs in the UI

### Launching the UI

```bash
# Launch MLflow UI to view experiments and compare runs
mlflow ui --host 0.0.0.0 --port 5000

# Or if using a backend store
mlflow ui --backend-store-uri sqlite:///mlflow.db --port 5000
```

The MLflow UI provides:

- **Table view** - Sort and filter runs by parameters and metrics
- **Chart view** - Scatter plots and parallel coordinates for comparison
- **Artifact browser** - View logged files, plots, and models
- **Run comparison** - Side-by-side comparison of selected runs

### Creating Comparison-Friendly Runs

```python
# comparison_demo.py
# Create multiple runs for UI comparison
import mlflow
import random

mlflow.set_experiment("model-comparison")

# Define model configurations to compare
configurations = [
    {"model": "rf", "n_estimators": 100, "max_depth": 10},
    {"model": "rf", "n_estimators": 200, "max_depth": 15},
    {"model": "rf", "n_estimators": 300, "max_depth": 20},
    {"model": "xgb", "n_estimators": 100, "learning_rate": 0.1},
    {"model": "xgb", "n_estimators": 200, "learning_rate": 0.05},
    {"model": "xgb", "n_estimators": 300, "learning_rate": 0.01},
]

for config in configurations:
    with mlflow.start_run(run_name=f"{config['model']}-{config['n_estimators']}"):
        # Log all parameters
        mlflow.log_params(config)

        # Simulate metrics (in practice, train and evaluate your model)
        base_accuracy = 0.85 + (config["n_estimators"] / 3000)
        noise = random.uniform(-0.02, 0.02)

        mlflow.log_metrics({
            "accuracy": min(base_accuracy + noise, 0.98),
            "precision": min(base_accuracy + noise - 0.01, 0.97),
            "recall": min(base_accuracy + noise - 0.02, 0.96),
            "training_time": config["n_estimators"] * 0.5 + random.uniform(0, 10)
        })

        # Tag for easy filtering
        mlflow.set_tag("model_type", config["model"])

print("Created 6 runs for comparison - open MLflow UI to view")
```

---

## Querying Runs Programmatically

### Search Runs API

```python
# query_runs.py
# Search and filter runs programmatically
import mlflow
from mlflow import MlflowClient
import pandas as pd

client = MlflowClient()

# Get experiment by name
experiment = client.get_experiment_by_name("model-comparison")

if experiment:
    # Search runs with filters
    runs = client.search_runs(
        experiment_ids=[experiment.experiment_id],
        filter_string="metrics.accuracy > 0.85 AND params.model = 'rf'",
        order_by=["metrics.accuracy DESC"],
        max_results=10
    )

    print(f"Found {len(runs)} runs matching criteria:\n")
    for run in runs:
        print(f"Run ID: {run.info.run_id[:8]}...")
        print(f"  Accuracy: {run.data.metrics.get('accuracy', 'N/A'):.4f}")
        print(f"  Model: {run.data.params.get('model', 'N/A')}")
        print(f"  Estimators: {run.data.params.get('n_estimators', 'N/A')}")
        print()
```

### Finding the Best Run

```python
# best_run.py
# Find the best performing run in an experiment
import mlflow
from mlflow import MlflowClient

client = MlflowClient()

experiment = client.get_experiment_by_name("model-comparison")

if experiment:
    # Find the run with highest accuracy
    best_runs = client.search_runs(
        experiment_ids=[experiment.experiment_id],
        filter_string="",
        order_by=["metrics.accuracy DESC"],
        max_results=1
    )

    if best_runs:
        best_run = best_runs[0]
        print("Best performing run:")
        print(f"  Run ID: {best_run.info.run_id}")
        print(f"  Accuracy: {best_run.data.metrics['accuracy']:.4f}")
        print(f"  Parameters: {best_run.data.params}")

        # Load the model from the best run
        model_uri = f"runs:/{best_run.info.run_id}/model"
        print(f"  Model URI: {model_uri}")

        # Optionally load the model
        # model = mlflow.sklearn.load_model(model_uri)
```

### Exporting Runs to DataFrame

```python
# export_runs.py
# Export run data to pandas DataFrame for analysis
import mlflow
import pandas as pd

# Search all runs from an experiment
experiment = mlflow.get_experiment_by_name("model-comparison")

if experiment:
    runs_df = mlflow.search_runs(
        experiment_ids=[experiment.experiment_id],
        filter_string="",
        output_format="pandas"  # Returns a DataFrame
    )

    # Select relevant columns
    columns = [
        "run_id",
        "params.model",
        "params.n_estimators",
        "metrics.accuracy",
        "metrics.training_time",
        "start_time"
    ]
    available_cols = [c for c in columns if c in runs_df.columns]
    summary_df = runs_df[available_cols]

    print("Runs Summary:")
    print(summary_df.to_string(index=False))

    # Save to CSV for external analysis
    summary_df.to_csv("runs_summary.csv", index=False)
    print("\nExported to runs_summary.csv")
```

---

## Auto-logging for Popular Frameworks

### Scikit-learn Auto-logging

```python
# autolog_sklearn.py
# Automatic logging for scikit-learn models
import mlflow
from sklearn.ensemble import RandomForestClassifier
from sklearn.datasets import make_classification
from sklearn.model_selection import train_test_split

# Enable auto-logging for sklearn - logs params, metrics, and model automatically
mlflow.sklearn.autolog(
    log_input_examples=True,   # Log sample inputs
    log_model_signatures=True,  # Log input/output schema
    log_models=True,            # Log the trained model
    log_datasets=True           # Log dataset info
)

mlflow.set_experiment("sklearn-autolog-demo")

# Generate data
X, y = make_classification(n_samples=1000, n_features=20, random_state=42)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)

# Train model - all logging happens automatically
with mlflow.start_run(run_name="autolog-rf"):
    model = RandomForestClassifier(n_estimators=100, max_depth=10)
    model.fit(X_train, y_train)

    # Metrics are logged automatically including:
    # - training_accuracy, training_f1_score, training_precision, etc.
    # - Model parameters
    # - Feature importances plot

    print("Training complete - check MLflow UI for auto-logged data")
```

### PyTorch Lightning Auto-logging

```python
# autolog_pytorch.py
# Automatic logging for PyTorch Lightning
import mlflow
import pytorch_lightning as pl
import torch
from torch.utils.data import DataLoader, TensorDataset

# Enable auto-logging for PyTorch Lightning
mlflow.pytorch.autolog(
    log_every_n_epoch=1,       # Log metrics every epoch
    log_models=True,           # Log the final model
    log_datasets=False         # Disable dataset logging for speed
)

class SimpleModel(pl.LightningModule):
    def __init__(self, input_size=20, hidden_size=64, output_size=2):
        super().__init__()
        self.layer1 = torch.nn.Linear(input_size, hidden_size)
        self.layer2 = torch.nn.Linear(hidden_size, output_size)
        self.loss_fn = torch.nn.CrossEntropyLoss()

    def forward(self, x):
        x = torch.relu(self.layer1(x))
        return self.layer2(x)

    def training_step(self, batch, batch_idx):
        x, y = batch
        logits = self(x)
        loss = self.loss_fn(logits, y)
        self.log("train_loss", loss)
        return loss

    def configure_optimizers(self):
        return torch.optim.Adam(self.parameters(), lr=0.001)

# Create sample data
X = torch.randn(1000, 20)
y = torch.randint(0, 2, (1000,))
dataset = TensorDataset(X, y)
dataloader = DataLoader(dataset, batch_size=32, shuffle=True)

mlflow.set_experiment("pytorch-lightning-autolog")

# Training automatically logs to MLflow
with mlflow.start_run(run_name="lightning-autolog"):
    model = SimpleModel()
    trainer = pl.Trainer(max_epochs=10, enable_progress_bar=False)
    trainer.fit(model, dataloader)

    print("Training complete - metrics logged automatically")
```

### XGBoost Auto-logging

```python
# autolog_xgboost.py
# Automatic logging for XGBoost
import mlflow
import xgboost as xgb
from sklearn.datasets import make_classification
from sklearn.model_selection import train_test_split

# Enable auto-logging for XGBoost
mlflow.xgboost.autolog(
    log_input_examples=True,
    log_model_signatures=True,
    log_models=True
)

mlflow.set_experiment("xgboost-autolog-demo")

# Prepare data
X, y = make_classification(n_samples=1000, n_features=20, random_state=42)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)

# Create DMatrix for XGBoost
dtrain = xgb.DMatrix(X_train, label=y_train)
dtest = xgb.DMatrix(X_test, label=y_test)

with mlflow.start_run(run_name="xgb-autolog"):
    # Parameters are logged automatically
    params = {
        "objective": "binary:logistic",
        "max_depth": 6,
        "learning_rate": 0.1,
        "n_estimators": 100
    }

    # Train - auto-logs params, metrics at each iteration, and final model
    model = xgb.train(
        params,
        dtrain,
        num_boost_round=100,
        evals=[(dtrain, "train"), (dtest, "eval")],
        verbose_eval=False
    )

    print("XGBoost training complete - check MLflow for logged data")
```

---

## Model Registry Basics

### Registering Models

```python
# model_registry.py
# Register and manage models in MLflow Model Registry
import mlflow
from mlflow import MlflowClient
from sklearn.ensemble import RandomForestClassifier
from sklearn.datasets import make_classification

mlflow.set_experiment("model-registry-demo")

# Train a model
X, y = make_classification(n_samples=1000, n_features=20, random_state=42)
model = RandomForestClassifier(n_estimators=100)
model.fit(X, y)

# Log and register the model in one step
with mlflow.start_run(run_name="registered-model"):
    mlflow.log_param("n_estimators", 100)
    mlflow.log_metric("accuracy", 0.92)

    # Register by specifying registered_model_name
    model_info = mlflow.sklearn.log_model(
        model,
        artifact_path="model",
        registered_model_name="fraud-detection-model"  # Auto-registers
    )

    print(f"Model registered: {model_info.model_uri}")

# Alternative: Register an existing run's model
client = MlflowClient()
run_id = mlflow.active_run().info.run_id if mlflow.active_run() else None

# Register from a specific run
# result = client.create_registered_model("my-new-model")
# client.create_model_version(
#     name="my-new-model",
#     source=f"runs:/{run_id}/model",
#     run_id=run_id
# )
```

### Managing Model Versions and Stages

```python
# model_stages.py
# Manage model versions and transition between stages
from mlflow import MlflowClient

client = MlflowClient()

model_name = "fraud-detection-model"

# List all versions of a model
versions = client.search_model_versions(f"name='{model_name}'")
print(f"Found {len(versions)} versions of {model_name}")

for v in versions:
    print(f"  Version {v.version}: stage={v.current_stage}, run_id={v.run_id[:8]}...")

# Transition a model version to a stage
# Stages: None, Staging, Production, Archived
if versions:
    latest_version = versions[0].version

    # Move to Staging
    client.transition_model_version_stage(
        name=model_name,
        version=latest_version,
        stage="Staging"
    )
    print(f"Version {latest_version} moved to Staging")

    # Add a description to the version
    client.update_model_version(
        name=model_name,
        version=latest_version,
        description="Improved model with new features. F1 score: 0.94"
    )

# Load a model by stage
# production_model = mlflow.sklearn.load_model(f"models:/{model_name}/Production")
# staging_model = mlflow.sklearn.load_model(f"models:/{model_name}/Staging")
```

### Loading Registered Models

```python
# load_registered.py
# Load models from the registry for inference
import mlflow

model_name = "fraud-detection-model"

# Load the latest version
latest_model = mlflow.sklearn.load_model(f"models:/{model_name}/latest")

# Load a specific version
# version_1_model = mlflow.sklearn.load_model(f"models:/{model_name}/1")

# Load by stage
# production_model = mlflow.sklearn.load_model(f"models:/{model_name}/Production")
# staging_model = mlflow.sklearn.load_model(f"models:/{model_name}/Staging")

# Load by run ID (without registry)
# run_model = mlflow.sklearn.load_model("runs:/abc123def456/model")

# Use the model for predictions
import numpy as np
sample_input = np.random.randn(5, 20)
predictions = latest_model.predict(sample_input)
print(f"Predictions: {predictions}")
```

---

## Best Practices for Team Workflows

### Consistent Naming Conventions

```python
# naming_conventions.py
# Example of consistent naming for team collaboration
import mlflow
from datetime import datetime

# Experiment naming: project-task-version
experiment_name = "fraud-detection-classification-v2"
mlflow.set_experiment(experiment_name)

# Run naming: model-config-timestamp
timestamp = datetime.now().strftime("%Y%m%d-%H%M")
run_name = f"xgboost-tuned-{timestamp}"

with mlflow.start_run(run_name=run_name):
    # Use consistent tag keys across the team
    mlflow.set_tags({
        "project": "fraud-detection",
        "model_type": "xgboost",
        "data_version": "2024-01",
        "feature_set": "v2.1",
        "engineer": "alice",
        "pipeline_version": "1.3.0"
    })

    # Use consistent parameter names
    mlflow.log_params({
        "model.n_estimators": 200,
        "model.max_depth": 8,
        "model.learning_rate": 0.05,
        "training.batch_size": 1024,
        "training.epochs": 100
    })

    mlflow.log_metric("accuracy", 0.94)
```

### Reproducibility Checklist

```python
# reproducibility.py
# Log everything needed to reproduce a run
import mlflow
import sys
import subprocess

mlflow.set_experiment("reproducible-experiments")

with mlflow.start_run(run_name="reproducible-run"):
    # Log environment info
    mlflow.set_tag("python_version", sys.version)

    # Log git commit (if in a git repo)
    try:
        git_commit = subprocess.check_output(
            ["git", "rev-parse", "HEAD"]
        ).decode().strip()
        mlflow.set_tag("git_commit", git_commit)
    except:
        pass

    # Log requirements
    try:
        requirements = subprocess.check_output(
            ["pip", "freeze"]
        ).decode()
        with open("requirements.txt", "w") as f:
            f.write(requirements)
        mlflow.log_artifact("requirements.txt")
    except:
        pass

    # Log data version or hash
    mlflow.set_tag("data_source", "s3://bucket/data/train-v2.parquet")
    mlflow.set_tag("data_hash", "abc123def456")

    # Log random seeds
    mlflow.log_params({
        "random_seed": 42,
        "numpy_seed": 42,
        "torch_seed": 42
    })

    mlflow.log_metric("accuracy", 0.93)
    print("Reproducibility metadata logged")
```

### Setting Up CI/CD Integration

```python
# ci_integration.py
# Example of MLflow integration in a CI/CD pipeline
import mlflow
import os

# Get CI/CD environment variables
ci_build_id = os.getenv("CI_BUILD_ID", "local")
ci_branch = os.getenv("CI_BRANCH", "main")
ci_commit = os.getenv("CI_COMMIT_SHA", "unknown")

mlflow.set_experiment("ci-cd-training-pipeline")

with mlflow.start_run(run_name=f"ci-build-{ci_build_id}"):
    # Tag with CI/CD metadata
    mlflow.set_tags({
        "ci.build_id": ci_build_id,
        "ci.branch": ci_branch,
        "ci.commit": ci_commit,
        "ci.triggered_by": os.getenv("CI_TRIGGERED_BY", "manual")
    })

    # Your training code here
    mlflow.log_params({"model": "production-config"})
    mlflow.log_metric("accuracy", 0.95)

    # Conditionally register to production
    if ci_branch == "main":
        mlflow.sklearn.log_model(
            model,  # Your trained model
            artifact_path="model",
            registered_model_name="production-model"
        )
        print("Model registered for production deployment")
```

---

## Summary

Key takeaways for effective MLflow experiment tracking:

1. **Start simple** - Begin with local tracking, add a server when you need collaboration
2. **Log everything relevant** - Parameters, metrics, artifacts, and environment info
3. **Use consistent naming** - Establish team conventions for experiments, runs, and tags
4. **Leverage auto-logging** - Let MLflow handle the boilerplate for supported frameworks
5. **Query programmatically** - Use the search API for analysis and automation
6. **Use the Model Registry** - Track model versions and manage deployment stages
7. **Document your runs** - Add descriptions and tags for future reference
8. **Enable reproducibility** - Log git commits, data versions, and random seeds

MLflow integrates well with observability tools to provide end-to-end visibility into your ML systems.

---

*Need to monitor your ML infrastructure alongside your MLflow experiments? [OneUptime](https://oneuptime.com) provides comprehensive observability for your entire stack - from training pipelines to production model serving.*
