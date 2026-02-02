# How to Track ML Experiments with MLflow

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MLflow, Machine Learning, MLOps, Experiment Tracking, Python

Description: Learn how to track machine learning experiments with MLflow, including logging parameters, metrics, models, and artifacts for reproducible ML workflows.

---

> Running machine learning experiments without proper tracking is like cooking without writing down your recipes. You might create something amazing, but good luck recreating it. MLflow solves this by giving you a structured way to log everything about your experiments.

MLflow is an open-source platform for managing the ML lifecycle, including experiment tracking, model versioning, and deployment. In this guide, we focus on experiment tracking, which is the foundation of any serious ML workflow.

---

## Why Track ML Experiments?

Without tracking, you end up with notebooks full of commented-out code, screenshots of metrics, and a folder named `model_final_v2_FINAL_really_final.pkl`. Proper experiment tracking gives you:

- **Reproducibility**: Know exactly what parameters produced which results
- **Comparison**: Side-by-side comparison of different runs
- **Collaboration**: Share experiments with your team
- **Auditability**: Trace back from production model to training data
- **Organization**: No more scattered notebooks and random model files

---

## Installing MLflow

MLflow works with Python and integrates with most ML frameworks. Let's start with installation.

```bash
pip install mlflow
```

For specific integrations, install additional packages:

```bash
# For scikit-learn integration
pip install mlflow[sklearn]

# For PyTorch integration
pip install mlflow[pytorch]

# For TensorFlow integration
pip install mlflow[tensorflow]
```

---

## MLflow Core Concepts

Before diving into code, let's understand the key concepts in MLflow experiment tracking.

```mermaid
graph TD
    A[Experiment] --> B[Run 1]
    A --> C[Run 2]
    A --> D[Run 3]
    B --> E[Parameters]
    B --> F[Metrics]
    B --> G[Artifacts]
    B --> H[Model]
    C --> I[Parameters]
    C --> J[Metrics]
    C --> K[Artifacts]
    C --> L[Model]
```

- **Experiment**: A named collection of runs (e.g., "customer_churn_prediction")
- **Run**: A single execution of your training code
- **Parameters**: Input values like learning rate, epochs, batch size
- **Metrics**: Output values like accuracy, loss, F1 score
- **Artifacts**: Files produced during training (plots, data samples, etc.)
- **Model**: The trained model with its signature and metadata

---

## Basic Experiment Tracking

Let's start with a simple example that logs parameters, metrics, and a model using scikit-learn.

The following code sets up a basic MLflow experiment, trains a Random Forest classifier, and logs everything needed to reproduce the run later.

```python
# basic_tracking.py
# Basic MLflow experiment tracking with scikit-learn
import mlflow
import mlflow.sklearn
from sklearn.ensemble import RandomForestClassifier
from sklearn.datasets import load_iris
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, f1_score

# Set the experiment name - creates it if it doesn't exist
mlflow.set_experiment("iris_classification")

# Load and split the data
iris = load_iris()
X_train, X_test, y_train, y_test = train_test_split(
    iris.data, iris.target, test_size=0.2, random_state=42
)

# Define hyperparameters to track
n_estimators = 100
max_depth = 5
random_state = 42

# Start a new run - everything inside this block gets logged
with mlflow.start_run(run_name="random_forest_baseline"):

    # Log parameters - these are the inputs to your experiment
    mlflow.log_param("n_estimators", n_estimators)
    mlflow.log_param("max_depth", max_depth)
    mlflow.log_param("random_state", random_state)
    mlflow.log_param("test_size", 0.2)

    # Train the model
    model = RandomForestClassifier(
        n_estimators=n_estimators,
        max_depth=max_depth,
        random_state=random_state
    )
    model.fit(X_train, y_train)

    # Make predictions and calculate metrics
    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred, average='weighted')

    # Log metrics - these are the outputs of your experiment
    mlflow.log_metric("accuracy", accuracy)
    mlflow.log_metric("f1_score", f1)

    # Log the model itself - includes signature for input/output validation
    mlflow.sklearn.log_model(
        model,
        "random_forest_model",
        input_example=X_train[:5]  # Sample input for documentation
    )

    print(f"Run ID: {mlflow.active_run().info.run_id}")
    print(f"Accuracy: {accuracy:.4f}")
    print(f"F1 Score: {f1:.4f}")
```

Run this script, then launch the MLflow UI to see your experiment:

```bash
mlflow ui
```

Open `http://localhost:5000` in your browser to view the experiment dashboard.

---

## Logging Metrics Over Time

For iterative training like neural networks, you want to track metrics at each epoch. MLflow supports this with the `step` parameter.

This example shows how to log training and validation metrics at each epoch so you can visualize learning curves in the MLflow UI.

```python
# epoch_tracking.py
# Tracking metrics over training epochs
import mlflow
import numpy as np

mlflow.set_experiment("neural_network_training")

def train_neural_network(epochs, learning_rate):
    """Simulated neural network training with epoch-level metric logging"""

    with mlflow.start_run(run_name=f"nn_lr_{learning_rate}"):
        # Log hyperparameters
        mlflow.log_param("epochs", epochs)
        mlflow.log_param("learning_rate", learning_rate)
        mlflow.log_param("optimizer", "adam")
        mlflow.log_param("batch_size", 32)

        # Simulate training loop
        for epoch in range(epochs):
            # Simulate decreasing loss and increasing accuracy
            train_loss = 1.0 / (epoch + 1) + np.random.normal(0, 0.05)
            val_loss = 1.2 / (epoch + 1) + np.random.normal(0, 0.08)
            train_acc = 1.0 - train_loss + np.random.normal(0, 0.02)
            val_acc = 1.0 - val_loss + np.random.normal(0, 0.03)

            # Log metrics with step parameter for time-series visualization
            mlflow.log_metric("train_loss", train_loss, step=epoch)
            mlflow.log_metric("val_loss", val_loss, step=epoch)
            mlflow.log_metric("train_accuracy", train_acc, step=epoch)
            mlflow.log_metric("val_accuracy", val_acc, step=epoch)

        # Log final metrics (no step - these are the summary values)
        mlflow.log_metric("final_train_loss", train_loss)
        mlflow.log_metric("final_val_accuracy", val_acc)

# Run experiments with different learning rates
for lr in [0.001, 0.01, 0.1]:
    train_neural_network(epochs=50, learning_rate=lr)
```

---

## Logging Artifacts

Artifacts are files you want to save alongside your run. This includes plots, data samples, configuration files, or any other file relevant to your experiment.

This code demonstrates how to save confusion matrices, feature importance plots, and training history as artifacts.

```python
# artifact_logging.py
# Logging plots and files as artifacts
import mlflow
import matplotlib.pyplot as plt
import numpy as np
import json
import os
from sklearn.metrics import confusion_matrix, ConfusionMatrixDisplay
from sklearn.ensemble import RandomForestClassifier
from sklearn.datasets import load_iris
from sklearn.model_selection import train_test_split

mlflow.set_experiment("artifact_example")

# Prepare data
iris = load_iris()
X_train, X_test, y_train, y_test = train_test_split(
    iris.data, iris.target, test_size=0.2, random_state=42
)

with mlflow.start_run(run_name="with_artifacts"):
    # Train model
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)

    # Create confusion matrix plot
    cm = confusion_matrix(y_test, y_pred)
    fig, ax = plt.subplots(figsize=(8, 6))
    disp = ConfusionMatrixDisplay(
        confusion_matrix=cm,
        display_labels=iris.target_names
    )
    disp.plot(ax=ax)
    plt.title("Confusion Matrix")

    # Save plot to file and log as artifact
    plt.savefig("confusion_matrix.png", dpi=150, bbox_inches='tight')
    mlflow.log_artifact("confusion_matrix.png")
    plt.close()

    # Create feature importance plot
    importances = model.feature_importances_
    fig, ax = plt.subplots(figsize=(10, 6))
    ax.barh(iris.feature_names, importances)
    ax.set_xlabel("Feature Importance")
    ax.set_title("Random Forest Feature Importances")
    plt.tight_layout()

    plt.savefig("feature_importance.png", dpi=150)
    mlflow.log_artifact("feature_importance.png")
    plt.close()

    # Log a JSON config file as artifact
    config = {
        "model_type": "RandomForestClassifier",
        "preprocessing": {
            "scaling": "none",
            "feature_selection": "none"
        },
        "training": {
            "cv_folds": 5,
            "stratified": True
        }
    }

    with open("config.json", "w") as f:
        json.dump(config, f, indent=2)
    mlflow.log_artifact("config.json")

    # Log an entire directory of artifacts
    os.makedirs("data_samples", exist_ok=True)
    np.savetxt("data_samples/X_train_sample.csv", X_train[:10], delimiter=",")
    np.savetxt("data_samples/X_test_sample.csv", X_test[:10], delimiter=",")
    mlflow.log_artifacts("data_samples", artifact_path="data_samples")

    # Clean up local files
    os.remove("confusion_matrix.png")
    os.remove("feature_importance.png")
    os.remove("config.json")
    os.remove("data_samples/X_train_sample.csv")
    os.remove("data_samples/X_test_sample.csv")
    os.rmdir("data_samples")

    print("Artifacts logged successfully!")
```

---

## Autologging

MLflow can automatically log parameters, metrics, and models for supported frameworks. This saves you from writing boilerplate logging code.

The following table shows which ML frameworks support autologging:

| Framework | Parameters | Metrics | Models | Artifacts |
|-----------|------------|---------|--------|-----------|
| scikit-learn | Yes | Yes | Yes | Yes |
| TensorFlow/Keras | Yes | Yes | Yes | Yes |
| PyTorch Lightning | Yes | Yes | Yes | Yes |
| XGBoost | Yes | Yes | Yes | Yes |
| LightGBM | Yes | Yes | Yes | Yes |
| Spark MLlib | Yes | Yes | Yes | Yes |
| Statsmodels | Yes | Yes | Yes | No |

This example shows how to enable autologging with scikit-learn. With one line of code, MLflow captures everything automatically.

```python
# autologging.py
# Automatic logging with MLflow autolog
import mlflow
import mlflow.sklearn
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.datasets import load_breast_cancer
from sklearn.model_selection import train_test_split, GridSearchCV

# Enable autologging for scikit-learn
mlflow.sklearn.autolog()

mlflow.set_experiment("autolog_example")

# Load data
data = load_breast_cancer()
X_train, X_test, y_train, y_test = train_test_split(
    data.data, data.target, test_size=0.2, random_state=42
)

# Train with grid search - everything gets logged automatically
param_grid = {
    'n_estimators': [50, 100],
    'max_depth': [3, 5],
    'learning_rate': [0.01, 0.1]
}

clf = GridSearchCV(
    GradientBoostingClassifier(random_state=42),
    param_grid,
    cv=3,
    scoring='accuracy'
)

# MLflow automatically logs:
# - All parameters from param_grid
# - Cross-validation results
# - Best parameters
# - Best score
# - Trained model
# - Feature importances
clf.fit(X_train, y_train)

print(f"Best parameters: {clf.best_params_}")
print(f"Best CV score: {clf.best_score_:.4f}")
print(f"Test score: {clf.score(X_test, y_test):.4f}")
```

---

## Organizing Experiments with Tags

Tags help you categorize and filter runs. Use them for metadata like developer name, environment, or experiment phase.

This code shows how to add tags to runs and use them for filtering in the MLflow UI.

```python
# tagging.py
# Using tags to organize experiments
import mlflow
from sklearn.linear_model import LogisticRegression
from sklearn.datasets import make_classification
from sklearn.model_selection import train_test_split

mlflow.set_experiment("tagged_experiments")

# Generate synthetic data
X, y = make_classification(n_samples=1000, n_features=20, random_state=42)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)

def run_experiment(model_name, developer, phase, **model_params):
    """Run an experiment with metadata tags"""

    with mlflow.start_run(run_name=f"{model_name}_{phase}"):
        # Set tags for metadata
        mlflow.set_tag("mlflow.runName", f"{model_name}_{phase}")
        mlflow.set_tag("developer", developer)
        mlflow.set_tag("phase", phase)
        mlflow.set_tag("model_type", model_name)
        mlflow.set_tag("environment", "development")
        mlflow.set_tag("dataset", "synthetic_classification")

        # Log parameters
        for param, value in model_params.items():
            mlflow.log_param(param, value)

        # Train model
        model = LogisticRegression(**model_params)
        model.fit(X_train, y_train)

        # Log metrics
        train_score = model.score(X_train, y_train)
        test_score = model.score(X_test, y_test)
        mlflow.log_metric("train_accuracy", train_score)
        mlflow.log_metric("test_accuracy", test_score)

        return test_score

# Run experiments in different phases
run_experiment("logistic_regression", "alice", "baseline", C=1.0, max_iter=100)
run_experiment("logistic_regression", "alice", "tuning", C=0.1, max_iter=200)
run_experiment("logistic_regression", "bob", "validation", C=0.5, max_iter=150)
```

You can filter runs by tags in the MLflow UI or using the search API:

```python
# Search for runs by tag
runs = mlflow.search_runs(
    experiment_names=["tagged_experiments"],
    filter_string="tags.phase = 'tuning' AND tags.developer = 'alice'"
)
print(runs[["run_id", "metrics.test_accuracy", "params.C"]])
```

---

## Comparing Runs Programmatically

MLflow provides APIs to query and compare runs. This is useful for finding the best model or analyzing experiment results.

This code demonstrates how to find the best run from an experiment and load its model for inference.

```python
# compare_runs.py
# Comparing and analyzing runs programmatically
import mlflow
from mlflow.tracking import MlflowClient
import pandas as pd

client = MlflowClient()

# Get experiment by name
experiment = client.get_experiment_by_name("iris_classification")

if experiment:
    # Search all runs in the experiment, sorted by accuracy
    runs = mlflow.search_runs(
        experiment_ids=[experiment.experiment_id],
        order_by=["metrics.accuracy DESC"]
    )

    print("All runs sorted by accuracy:")
    print(runs[["run_id", "metrics.accuracy", "params.n_estimators", "params.max_depth"]])

    # Get the best run
    best_run = runs.iloc[0]
    best_run_id = best_run["run_id"]

    print(f"\nBest run ID: {best_run_id}")
    print(f"Best accuracy: {best_run['metrics.accuracy']:.4f}")

    # Load the model from the best run
    model_uri = f"runs:/{best_run_id}/random_forest_model"
    loaded_model = mlflow.sklearn.load_model(model_uri)

    print(f"\nModel loaded from: {model_uri}")
    print(f"Model type: {type(loaded_model).__name__}")

    # Compare runs with specific parameter values
    filtered_runs = mlflow.search_runs(
        experiment_ids=[experiment.experiment_id],
        filter_string="params.n_estimators = '100' AND metrics.accuracy > 0.9"
    )

    print(f"\nRuns with n_estimators=100 and accuracy > 0.9:")
    print(filtered_runs[["run_id", "metrics.accuracy"]])
```

---

## Nested Runs for Complex Workflows

For complex ML pipelines with multiple stages, nested runs help organize the hierarchy. Use this for hyperparameter tuning, cross-validation, or multi-stage pipelines.

This example shows how to create a parent run with child runs for each cross-validation fold.

```python
# nested_runs.py
# Using nested runs for complex ML workflows
import mlflow
from sklearn.ensemble import RandomForestClassifier
from sklearn.datasets import load_iris
from sklearn.model_selection import KFold
from sklearn.metrics import accuracy_score
import numpy as np

mlflow.set_experiment("nested_cv_experiment")

iris = load_iris()
X, y = iris.data, iris.target

n_estimators_options = [50, 100, 200]
kf = KFold(n_splits=5, shuffle=True, random_state=42)

# Parent run for the entire hyperparameter search
with mlflow.start_run(run_name="hyperparameter_search") as parent_run:
    mlflow.set_tag("run_type", "hyperparameter_search")
    mlflow.log_param("cv_folds", 5)
    mlflow.log_param("n_estimators_options", n_estimators_options)

    best_accuracy = 0
    best_n_estimators = None

    for n_estimators in n_estimators_options:
        # Child run for each hyperparameter configuration
        with mlflow.start_run(
            run_name=f"n_estimators_{n_estimators}",
            nested=True  # This makes it a child of the parent run
        ) as child_run:
            mlflow.log_param("n_estimators", n_estimators)

            fold_accuracies = []

            for fold_idx, (train_idx, val_idx) in enumerate(kf.split(X)):
                # Nested run for each fold
                with mlflow.start_run(
                    run_name=f"fold_{fold_idx}",
                    nested=True
                ):
                    X_train, X_val = X[train_idx], X[val_idx]
                    y_train, y_val = y[train_idx], y[val_idx]

                    model = RandomForestClassifier(
                        n_estimators=n_estimators,
                        random_state=42
                    )
                    model.fit(X_train, y_train)

                    accuracy = accuracy_score(y_val, model.predict(X_val))
                    fold_accuracies.append(accuracy)

                    mlflow.log_metric("fold_accuracy", accuracy)

            # Log summary metrics for this hyperparameter config
            mean_accuracy = np.mean(fold_accuracies)
            std_accuracy = np.std(fold_accuracies)

            mlflow.log_metric("mean_cv_accuracy", mean_accuracy)
            mlflow.log_metric("std_cv_accuracy", std_accuracy)

            if mean_accuracy > best_accuracy:
                best_accuracy = mean_accuracy
                best_n_estimators = n_estimators

    # Log best results to parent run
    mlflow.log_metric("best_cv_accuracy", best_accuracy)
    mlflow.log_param("best_n_estimators", best_n_estimators)

    print(f"Best n_estimators: {best_n_estimators}")
    print(f"Best CV accuracy: {best_accuracy:.4f}")
```

---

## Setting Up a Remote Tracking Server

For team collaboration, run MLflow as a centralized server. This allows multiple team members to log experiments to the same location.

```bash
# Start MLflow server with file-based backend
mlflow server \
    --backend-store-uri sqlite:///mlflow.db \
    --default-artifact-root ./mlruns \
    --host 0.0.0.0 \
    --port 5000
```

For production, use PostgreSQL or MySQL for the backend and cloud storage for artifacts:

```bash
# Production setup with PostgreSQL and S3
mlflow server \
    --backend-store-uri postgresql://user:password@host:5432/mlflow \
    --default-artifact-root s3://my-mlflow-bucket/artifacts \
    --host 0.0.0.0 \
    --port 5000
```

Configure your client to use the remote server by setting the tracking URI:

```python
# remote_tracking.py
# Configure MLflow to use a remote tracking server
import mlflow
import os

# Set tracking URI to remote server
mlflow.set_tracking_uri("http://mlflow-server.example.com:5000")

# Optionally set via environment variable
os.environ["MLFLOW_TRACKING_URI"] = "http://mlflow-server.example.com:5000"

# Now all experiments are logged to the remote server
mlflow.set_experiment("remote_experiment")

with mlflow.start_run():
    mlflow.log_param("remote", True)
    mlflow.log_metric("test_metric", 0.95)
```

---

## Integrating with PyTorch

For deep learning with PyTorch, MLflow provides specific integrations for logging models and training metrics.

This example shows a complete PyTorch training loop with MLflow integration.

```python
# pytorch_tracking.py
# MLflow integration with PyTorch
import mlflow
import mlflow.pytorch
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset
import numpy as np

mlflow.set_experiment("pytorch_classification")

# Define a simple neural network
class SimpleNet(nn.Module):
    def __init__(self, input_size, hidden_size, num_classes):
        super(SimpleNet, self).__init__()
        self.fc1 = nn.Linear(input_size, hidden_size)
        self.relu = nn.ReLU()
        self.fc2 = nn.Linear(hidden_size, num_classes)

    def forward(self, x):
        out = self.fc1(x)
        out = self.relu(out)
        out = self.fc2(out)
        return out

def train_model(hidden_size, learning_rate, epochs, batch_size):
    """Train PyTorch model with MLflow tracking"""

    with mlflow.start_run(run_name=f"pytorch_hs{hidden_size}_lr{learning_rate}"):
        # Log hyperparameters
        mlflow.log_param("hidden_size", hidden_size)
        mlflow.log_param("learning_rate", learning_rate)
        mlflow.log_param("epochs", epochs)
        mlflow.log_param("batch_size", batch_size)
        mlflow.log_param("optimizer", "Adam")

        # Generate synthetic data
        np.random.seed(42)
        X = np.random.randn(1000, 20).astype(np.float32)
        y = (X[:, 0] + X[:, 1] > 0).astype(np.int64)

        # Create data loaders
        dataset = TensorDataset(torch.from_numpy(X), torch.from_numpy(y))
        train_size = int(0.8 * len(dataset))
        val_size = len(dataset) - train_size
        train_dataset, val_dataset = torch.utils.data.random_split(
            dataset, [train_size, val_size]
        )

        train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
        val_loader = DataLoader(val_dataset, batch_size=batch_size)

        # Initialize model, loss, and optimizer
        model = SimpleNet(input_size=20, hidden_size=hidden_size, num_classes=2)
        criterion = nn.CrossEntropyLoss()
        optimizer = optim.Adam(model.parameters(), lr=learning_rate)

        # Training loop
        for epoch in range(epochs):
            model.train()
            train_loss = 0.0
            train_correct = 0
            train_total = 0

            for batch_X, batch_y in train_loader:
                optimizer.zero_grad()
                outputs = model(batch_X)
                loss = criterion(outputs, batch_y)
                loss.backward()
                optimizer.step()

                train_loss += loss.item()
                _, predicted = torch.max(outputs.data, 1)
                train_total += batch_y.size(0)
                train_correct += (predicted == batch_y).sum().item()

            # Validation
            model.eval()
            val_loss = 0.0
            val_correct = 0
            val_total = 0

            with torch.no_grad():
                for batch_X, batch_y in val_loader:
                    outputs = model(batch_X)
                    loss = criterion(outputs, batch_y)
                    val_loss += loss.item()
                    _, predicted = torch.max(outputs.data, 1)
                    val_total += batch_y.size(0)
                    val_correct += (predicted == batch_y).sum().item()

            # Log metrics per epoch
            mlflow.log_metric("train_loss", train_loss / len(train_loader), step=epoch)
            mlflow.log_metric("train_accuracy", train_correct / train_total, step=epoch)
            mlflow.log_metric("val_loss", val_loss / len(val_loader), step=epoch)
            mlflow.log_metric("val_accuracy", val_correct / val_total, step=epoch)

        # Log final metrics
        final_val_accuracy = val_correct / val_total
        mlflow.log_metric("final_val_accuracy", final_val_accuracy)

        # Log the PyTorch model
        mlflow.pytorch.log_model(model, "pytorch_model")

        return final_val_accuracy

# Run experiments with different configurations
for hidden_size in [32, 64, 128]:
    train_model(hidden_size=hidden_size, learning_rate=0.001, epochs=20, batch_size=32)
```

---

## Best Practices

Here are recommendations for effective experiment tracking with MLflow:

### 1. Use Meaningful Experiment Names

```python
# Good - descriptive and organized
mlflow.set_experiment("customer_churn/random_forest/v2")
mlflow.set_experiment("fraud_detection/production_candidates")

# Bad - vague and hard to find
mlflow.set_experiment("test")
mlflow.set_experiment("experiment_1")
```

### 2. Log Everything Relevant

```python
# Log not just model params, but data and preprocessing details
mlflow.log_param("data_version", "v2.3")
mlflow.log_param("train_samples", len(X_train))
mlflow.log_param("feature_count", X_train.shape[1])
mlflow.log_param("preprocessing", "standard_scaler")
mlflow.log_param("class_balance", dict(zip(*np.unique(y_train, return_counts=True))))
```

### 3. Use Tags for Filtering

```python
# Tags make it easy to filter runs later
mlflow.set_tag("team", "ml-platform")
mlflow.set_tag("priority", "high")
mlflow.set_tag("status", "production_candidate")
mlflow.set_tag("git_commit", "abc123")
```

### 4. Version Your Data

```python
# Track data lineage
mlflow.log_param("data_source", "s3://bucket/data/v2.csv")
mlflow.log_param("data_hash", "sha256:abc123...")
mlflow.log_param("data_date", "2026-01-15")
```

### 5. Always Log Input Examples

```python
# Input examples help with model serving
mlflow.sklearn.log_model(
    model,
    "model",
    input_example=X_train[:5],  # Helps document expected input format
    signature=mlflow.models.infer_signature(X_train, y_pred)
)
```

---

## Summary

MLflow experiment tracking transforms chaotic ML development into a structured, reproducible process. Key takeaways:

- Use `mlflow.start_run()` to create tracked runs
- Log parameters (inputs), metrics (outputs), and artifacts (files)
- Enable autologging for supported frameworks to reduce boilerplate
- Use tags to organize and filter runs
- Set up a remote tracking server for team collaboration
- Compare runs programmatically to find the best model

With proper experiment tracking, you can always answer the question: "What exactly produced this model?"

---

*Want to monitor your ML infrastructure alongside experiment tracking? [OneUptime](https://oneuptime.com) provides comprehensive monitoring for your ML pipelines, model serving endpoints, and training infrastructure - ensuring your ML systems stay healthy in production.*

**Related Reading:**
- [How to Install and Configure MLflow](https://oneuptime.com/blog)
- [How to Log Models with MLflow](https://oneuptime.com/blog)
- [How to Use MLflow Model Registry](https://oneuptime.com/blog)
