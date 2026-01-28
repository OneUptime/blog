# How to Monitor ML Experiments with Kubeflow

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubeflow, ML Ops, Experiment Tracking, Machine Learning, Monitoring

Description: A comprehensive guide to tracking, comparing, and monitoring machine learning experiments using Kubeflow's experiment management capabilities and MLflow integration.

---

Running ML experiments without proper tracking is like cooking without measuring ingredients. You might create something good, but you will never be able to reproduce it. Kubeflow provides built-in experiment tracking, and when combined with MLflow, gives you complete visibility into your model development process.

## Experiment Tracking Architecture

Understanding how experiment data flows through Kubeflow helps you design better tracking strategies.

```mermaid
flowchart TB
    subgraph Training["Training Process"]
        Code[Training Code] --> SDK[Kubeflow SDK]
        Code --> MLflow[MLflow Client]
    end

    subgraph Storage["Metadata Storage"]
        SDK --> MLMD[(ML Metadata)]
        MLflow --> MLflowDB[(MLflow Backend)]
    end

    subgraph Artifacts["Artifact Storage"]
        Code --> S3[(Object Storage)]
    end

    subgraph UI["Visualization"]
        MLMD --> KFDash[Kubeflow Dashboard]
        MLflowDB --> MLflowUI[MLflow UI]
    end
```

## Setting Up Experiment Tracking

### Enable ML Metadata in Kubeflow

Kubeflow uses ML Metadata (MLMD) to track experiments, runs, and artifacts:

```bash
# Verify MLMD is running
kubectl get pods -n kubeflow | grep metadata

# Check the metadata service
kubectl logs -n kubeflow deployment/metadata-grpc-deployment
```

### Deploy MLflow for Advanced Tracking

For richer experiment tracking, deploy MLflow alongside Kubeflow:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mlflow
  namespace: kubeflow
spec:
  replicas: 1
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
          image: ghcr.io/mlflow/mlflow:v2.8.0
          command:
            - mlflow
            - server
            - --host=0.0.0.0
            - --port=5000
            - --backend-store-uri=postgresql://mlflow:password@postgres:5432/mlflow
            - --default-artifact-root=s3://mlflow-artifacts/
          env:
            - name: AWS_ACCESS_KEY_ID
              valueFrom:
                secretKeyRef:
                  name: minio-credentials
                  key: access-key
            - name: AWS_SECRET_ACCESS_KEY
              valueFrom:
                secretKeyRef:
                  name: minio-credentials
                  key: secret-key
            - name: MLFLOW_S3_ENDPOINT_URL
              value: "http://minio.kubeflow.svc:9000"
          ports:
            - containerPort: 5000
          resources:
            requests:
              cpu: "500m"
              memory: "1Gi"
            limits:
              cpu: "1"
              memory: "2Gi"
---
apiVersion: v1
kind: Service
metadata:
  name: mlflow
  namespace: kubeflow
spec:
  selector:
    app: mlflow
  ports:
    - port: 5000
      targetPort: 5000
```

## Tracking Experiments in Pipelines

### Basic Experiment Tracking

Use the Kubeflow Pipelines SDK to track experiments:

```python
"""train_with_tracking.py - Training component with experiment tracking."""

from kfp import dsl
from kfp.dsl import Dataset, Input, Output, Metrics, Model

@dsl.component(
    base_image="python:3.10",
    packages_to_install=[
        "pandas", "scikit-learn", "mlflow", "boto3", "pyarrow"
    ]
)
def train_model(
    training_data: Input[Dataset],
    model_output: Output[Model],
    metrics: Output[Metrics],
    experiment_name: str,
    model_type: str = "random_forest",
    n_estimators: int = 100,
    max_depth: int = 10,
    learning_rate: float = 0.1
):
    """
    Train a model with full experiment tracking.

    Args:
        training_data: Input training dataset
        model_output: Output model artifact
        metrics: Output metrics artifact
        experiment_name: MLflow experiment name
        model_type: Type of model to train
        n_estimators: Number of estimators
        max_depth: Maximum tree depth
        learning_rate: Learning rate for boosting models
    """
    import pandas as pd
    import mlflow
    import mlflow.sklearn
    from sklearn.model_selection import train_test_split, cross_val_score
    from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
    from sklearn.metrics import (
        accuracy_score, precision_score, recall_score,
        f1_score, roc_auc_score, confusion_matrix
    )
    import json
    import os

    # Configure MLflow
    mlflow.set_tracking_uri("http://mlflow.kubeflow.svc:5000")
    mlflow.set_experiment(experiment_name)

    # Load data
    df = pd.read_parquet(training_data.path)
    X = df.drop(['target', 'user_id', 'timestamp'], axis=1, errors='ignore')
    y = df['target']

    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    with mlflow.start_run():
        # Log parameters
        mlflow.log_param("model_type", model_type)
        mlflow.log_param("n_estimators", n_estimators)
        mlflow.log_param("max_depth", max_depth)
        mlflow.log_param("learning_rate", learning_rate)
        mlflow.log_param("train_size", len(X_train))
        mlflow.log_param("test_size", len(X_test))
        mlflow.log_param("n_features", X_train.shape[1])

        # Select and train model
        if model_type == "random_forest":
            model = RandomForestClassifier(
                n_estimators=n_estimators,
                max_depth=max_depth,
                random_state=42,
                n_jobs=-1
            )
        elif model_type == "gradient_boosting":
            model = GradientBoostingClassifier(
                n_estimators=n_estimators,
                max_depth=max_depth,
                learning_rate=learning_rate,
                random_state=42
            )
        else:
            raise ValueError(f"Unknown model type: {model_type}")

        # Cross-validation
        cv_scores = cross_val_score(model, X_train, y_train, cv=5, scoring='f1')
        mlflow.log_metric("cv_f1_mean", cv_scores.mean())
        mlflow.log_metric("cv_f1_std", cv_scores.std())

        # Train final model
        model.fit(X_train, y_train)

        # Predictions
        y_pred = model.predict(X_test)
        y_pred_proba = model.predict_proba(X_test)[:, 1]

        # Calculate metrics
        accuracy = accuracy_score(y_test, y_pred)
        precision = precision_score(y_test, y_pred)
        recall = recall_score(y_test, y_pred)
        f1 = f1_score(y_test, y_pred)
        roc_auc = roc_auc_score(y_test, y_pred_proba)

        # Log metrics to MLflow
        mlflow.log_metric("accuracy", accuracy)
        mlflow.log_metric("precision", precision)
        mlflow.log_metric("recall", recall)
        mlflow.log_metric("f1_score", f1)
        mlflow.log_metric("roc_auc", roc_auc)

        # Log metrics to Kubeflow
        metrics.log_metric("accuracy", accuracy)
        metrics.log_metric("precision", precision)
        metrics.log_metric("recall", recall)
        metrics.log_metric("f1_score", f1)
        metrics.log_metric("roc_auc", roc_auc)

        # Log confusion matrix
        cm = confusion_matrix(y_test, y_pred)
        mlflow.log_dict({
            "confusion_matrix": cm.tolist(),
            "labels": ["negative", "positive"]
        }, "confusion_matrix.json")

        # Log feature importance
        if hasattr(model, 'feature_importances_'):
            importance = dict(zip(X.columns, model.feature_importances_))
            mlflow.log_dict(importance, "feature_importance.json")

            # Log top features
            top_features = sorted(importance.items(), key=lambda x: x[1], reverse=True)[:10]
            for i, (feature, imp) in enumerate(top_features):
                mlflow.log_metric(f"top_feature_{i+1}_importance", imp)

        # Log model
        mlflow.sklearn.log_model(model, "model")

        # Save model artifact for Kubeflow
        import joblib
        joblib.dump(model, model_output.path)

        print(f"Model trained successfully")
        print(f"Accuracy: {accuracy:.4f}")
        print(f"F1 Score: {f1:.4f}")
        print(f"ROC AUC: {roc_auc:.4f}")
```

### Tracking Hyperparameter Tuning

Track multiple runs from hyperparameter search:

```python
"""hyperparameter_tuning.py - Component for hyperparameter optimization."""

from kfp import dsl
from kfp.dsl import Dataset, Input, Output, Metrics

@dsl.component(
    base_image="python:3.10",
    packages_to_install=[
        "pandas", "scikit-learn", "mlflow", "optuna", "pyarrow"
    ]
)
def hyperparameter_search(
    training_data: Input[Dataset],
    best_params: Output[Metrics],
    experiment_name: str,
    n_trials: int = 50,
    metric_to_optimize: str = "f1"
):
    """
    Perform hyperparameter search with experiment tracking.

    Args:
        training_data: Input training dataset
        best_params: Output best parameters
        experiment_name: MLflow experiment name
        n_trials: Number of Optuna trials
        metric_to_optimize: Metric to optimize
    """
    import pandas as pd
    import mlflow
    import optuna
    from sklearn.model_selection import cross_val_score
    from sklearn.ensemble import RandomForestClassifier
    import json

    # Configure MLflow
    mlflow.set_tracking_uri("http://mlflow.kubeflow.svc:5000")
    mlflow.set_experiment(f"{experiment_name}-tuning")

    # Load data
    df = pd.read_parquet(training_data.path)
    X = df.drop(['target', 'user_id', 'timestamp'], axis=1, errors='ignore')
    y = df['target']

    def objective(trial):
        # Define hyperparameter search space
        params = {
            'n_estimators': trial.suggest_int('n_estimators', 50, 500),
            'max_depth': trial.suggest_int('max_depth', 3, 20),
            'min_samples_split': trial.suggest_int('min_samples_split', 2, 20),
            'min_samples_leaf': trial.suggest_int('min_samples_leaf', 1, 10),
            'max_features': trial.suggest_categorical('max_features', ['sqrt', 'log2', None])
        }

        with mlflow.start_run(nested=True):
            # Log parameters
            mlflow.log_params(params)
            mlflow.log_param("trial_number", trial.number)

            # Train and evaluate
            model = RandomForestClassifier(**params, random_state=42, n_jobs=-1)
            scores = cross_val_score(model, X, y, cv=5, scoring=metric_to_optimize)

            mean_score = scores.mean()
            std_score = scores.std()

            # Log metrics
            mlflow.log_metric(f"{metric_to_optimize}_mean", mean_score)
            mlflow.log_metric(f"{metric_to_optimize}_std", std_score)

            return mean_score

    # Create parent run for the entire search
    with mlflow.start_run(run_name="hyperparameter_search"):
        mlflow.log_param("n_trials", n_trials)
        mlflow.log_param("metric_to_optimize", metric_to_optimize)

        # Run optimization
        study = optuna.create_study(direction='maximize')
        study.optimize(objective, n_trials=n_trials, show_progress_bar=True)

        # Log best results
        mlflow.log_metric("best_score", study.best_value)
        mlflow.log_params({f"best_{k}": v for k, v in study.best_params.items()})

        # Log to Kubeflow metrics
        best_params.log_metric("best_score", study.best_value)
        for k, v in study.best_params.items():
            if isinstance(v, (int, float)):
                best_params.log_metric(f"best_{k}", v)

        print(f"Best score: {study.best_value}")
        print(f"Best params: {study.best_params}")
```

## Creating Experiment Comparison Dashboards

### Kubeflow Visualization Component

Create custom visualizations in Kubeflow:

```python
"""visualization.py - Generate experiment visualizations."""

from kfp import dsl
from kfp.dsl import HTML, Output

@dsl.component(
    base_image="python:3.10",
    packages_to_install=["mlflow", "pandas", "plotly"]
)
def generate_comparison_report(
    experiment_name: str,
    report: Output[HTML]
):
    """
    Generate an HTML report comparing experiment runs.

    Args:
        experiment_name: MLflow experiment name
        report: Output HTML report
    """
    import mlflow
    import pandas as pd
    import plotly.express as px
    import plotly.graph_objects as go
    from plotly.subplots import make_subplots

    # Connect to MLflow
    mlflow.set_tracking_uri("http://mlflow.kubeflow.svc:5000")

    # Get experiment runs
    experiment = mlflow.get_experiment_by_name(experiment_name)
    runs = mlflow.search_runs(experiment_ids=[experiment.experiment_id])

    # Create comparison plots
    fig = make_subplots(
        rows=2, cols=2,
        subplot_titles=(
            'Accuracy vs F1 Score',
            'Metric Distributions',
            'Parameter Impact on F1',
            'Run Timeline'
        )
    )

    # Plot 1: Accuracy vs F1
    fig.add_trace(
        go.Scatter(
            x=runs['metrics.accuracy'],
            y=runs['metrics.f1_score'],
            mode='markers',
            text=runs['run_id'].str[:8],
            marker=dict(
                size=10,
                color=runs['metrics.roc_auc'],
                colorscale='Viridis',
                showscale=True
            ),
            name='Runs'
        ),
        row=1, col=1
    )

    # Plot 2: Metric distributions
    for metric in ['accuracy', 'precision', 'recall', 'f1_score']:
        col = f'metrics.{metric}'
        if col in runs.columns:
            fig.add_trace(
                go.Box(y=runs[col], name=metric),
                row=1, col=2
            )

    # Plot 3: Parameter impact
    if 'params.n_estimators' in runs.columns:
        fig.add_trace(
            go.Scatter(
                x=runs['params.n_estimators'].astype(float),
                y=runs['metrics.f1_score'],
                mode='markers',
                name='n_estimators'
            ),
            row=2, col=1
        )

    # Plot 4: Timeline
    runs['start_time'] = pd.to_datetime(runs['start_time'], unit='ms')
    fig.add_trace(
        go.Scatter(
            x=runs['start_time'],
            y=runs['metrics.f1_score'],
            mode='lines+markers',
            name='F1 over time'
        ),
        row=2, col=2
    )

    fig.update_layout(height=800, title_text=f"Experiment: {experiment_name}")

    # Generate HTML
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Experiment Report: {experiment_name}</title>
        <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
    </head>
    <body>
        <h1>Experiment Report: {experiment_name}</h1>
        <h2>Summary Statistics</h2>
        <table border="1">
            <tr><th>Metric</th><th>Mean</th><th>Std</th><th>Min</th><th>Max</th></tr>
    """

    for metric in ['accuracy', 'precision', 'recall', 'f1_score', 'roc_auc']:
        col = f'metrics.{metric}'
        if col in runs.columns:
            html_content += f"""
            <tr>
                <td>{metric}</td>
                <td>{runs[col].mean():.4f}</td>
                <td>{runs[col].std():.4f}</td>
                <td>{runs[col].min():.4f}</td>
                <td>{runs[col].max():.4f}</td>
            </tr>
            """

    html_content += f"""
        </table>
        <h2>Visualizations</h2>
        {fig.to_html(full_html=False)}
        <h2>Top 5 Runs by F1 Score</h2>
        {runs.nlargest(5, 'metrics.f1_score')[['run_id', 'metrics.f1_score', 'metrics.accuracy']].to_html()}
    </body>
    </html>
    """

    with open(report.path, 'w') as f:
        f.write(html_content)
```

## Real-Time Experiment Monitoring

### Monitor Training Progress

Track metrics during long training runs:

```python
"""realtime_tracking.py - Real-time training monitoring."""

import mlflow
from typing import Callable
import time

class ExperimentTracker:
    """Track experiments with real-time updates."""

    def __init__(self, experiment_name: str, tracking_uri: str):
        mlflow.set_tracking_uri(tracking_uri)
        mlflow.set_experiment(experiment_name)
        self.run = None

    def start_run(self, run_name: str = None, tags: dict = None):
        """Start a new tracking run."""
        self.run = mlflow.start_run(run_name=run_name, tags=tags)
        return self

    def log_epoch(self, epoch: int, metrics: dict):
        """Log metrics for a training epoch."""
        for key, value in metrics.items():
            mlflow.log_metric(key, value, step=epoch)

    def log_batch(self, batch: int, metrics: dict):
        """Log metrics for a training batch."""
        for key, value in metrics.items():
            mlflow.log_metric(f"batch_{key}", value, step=batch)

    def end_run(self):
        """End the current run."""
        if self.run:
            mlflow.end_run()
            self.run = None

# Usage in training loop
def train_with_tracking(model, train_loader, val_loader, epochs: int):
    """Example training function with real-time tracking."""

    tracker = ExperimentTracker(
        experiment_name="deep-learning-training",
        tracking_uri="http://mlflow.kubeflow.svc:5000"
    )

    with tracker.start_run(run_name="model-v1"):
        for epoch in range(epochs):
            # Training
            train_loss = 0.0
            for batch_idx, (data, target) in enumerate(train_loader):
                loss = train_step(model, data, target)
                train_loss += loss

                # Log every 100 batches
                if batch_idx % 100 == 0:
                    tracker.log_batch(
                        epoch * len(train_loader) + batch_idx,
                        {"loss": loss}
                    )

            # Validation
            val_metrics = evaluate(model, val_loader)

            # Log epoch metrics
            tracker.log_epoch(epoch, {
                "train_loss": train_loss / len(train_loader),
                "val_loss": val_metrics["loss"],
                "val_accuracy": val_metrics["accuracy"],
                "val_f1": val_metrics["f1"]
            })

            print(f"Epoch {epoch}: val_f1={val_metrics['f1']:.4f}")
```

## Alerting on Experiment Results

Set up alerts for experiment outcomes:

```python
"""experiment_alerts.py - Alert on experiment results."""

from kfp import dsl
from kfp.dsl import Metrics, Input

@dsl.component(
    base_image="python:3.10",
    packages_to_install=["mlflow", "requests"]
)
def check_and_alert(
    metrics: Input[Metrics],
    slack_webhook_url: str,
    f1_threshold: float = 0.85,
    accuracy_threshold: float = 0.90
):
    """
    Check experiment results and send alerts.

    Args:
        metrics: Input metrics from training
        slack_webhook_url: Slack webhook for alerts
        f1_threshold: Minimum acceptable F1 score
        accuracy_threshold: Minimum acceptable accuracy
    """
    import json
    import requests
    import os

    # Read metrics (simplified - in practice, parse from artifact)
    f1_score = float(os.environ.get("F1_SCORE", 0))
    accuracy = float(os.environ.get("ACCURACY", 0))

    alerts = []

    if f1_score < f1_threshold:
        alerts.append(f"F1 score ({f1_score:.4f}) below threshold ({f1_threshold})")

    if accuracy < accuracy_threshold:
        alerts.append(f"Accuracy ({accuracy:.4f}) below threshold ({accuracy_threshold})")

    if alerts:
        message = {
            "text": f"Experiment Alert\n" + "\n".join(alerts),
            "attachments": [{
                "color": "warning",
                "fields": [
                    {"title": "F1 Score", "value": f"{f1_score:.4f}", "short": True},
                    {"title": "Accuracy", "value": f"{accuracy:.4f}", "short": True}
                ]
            }]
        }

        response = requests.post(
            slack_webhook_url,
            json=message,
            headers={"Content-Type": "application/json"}
        )

        if response.status_code != 200:
            print(f"Failed to send alert: {response.text}")
        else:
            print("Alert sent successfully")
    else:
        print("All metrics within acceptable thresholds")
```

## Complete Monitoring Pipeline

Assemble all components into a comprehensive monitoring pipeline:

```python
"""monitoring_pipeline.py - Complete experiment monitoring pipeline."""

from kfp import dsl
from kfp import compiler

@dsl.pipeline(
    name="ml-experiment-monitoring",
    description="Train, track, and monitor ML experiments"
)
def experiment_monitoring_pipeline(
    training_data_path: str,
    experiment_name: str,
    model_type: str = "random_forest",
    n_estimators: int = 100,
    slack_webhook: str = ""
):
    """
    Complete ML experiment with monitoring.

    Args:
        training_data_path: Path to training data
        experiment_name: Name for the experiment
        model_type: Type of model to train
        n_estimators: Number of estimators
        slack_webhook: Slack webhook for alerts
    """

    # Load and validate data
    from data_ingestion import ingest_data
    from data_validation import validate_data

    data_task = ingest_data(source_path=training_data_path)
    validate_task = validate_data(input_data=data_task.outputs["output_data"])

    # Train with tracking
    from train_with_tracking import train_model

    train_task = train_model(
        training_data=validate_task.outputs["validated_data"],
        experiment_name=experiment_name,
        model_type=model_type,
        n_estimators=n_estimators
    )
    train_task.set_cpu_limit("4")
    train_task.set_memory_limit("8Gi")

    # Generate report
    from visualization import generate_comparison_report

    report_task = generate_comparison_report(
        experiment_name=experiment_name
    )
    report_task.after(train_task)

    # Check and alert
    from experiment_alerts import check_and_alert

    if slack_webhook:
        alert_task = check_and_alert(
            metrics=train_task.outputs["metrics"],
            slack_webhook_url=slack_webhook
        )
        alert_task.after(train_task)

if __name__ == "__main__":
    compiler.Compiler().compile(
        pipeline_func=experiment_monitoring_pipeline,
        package_path="monitoring_pipeline.yaml"
    )
```

---

Effective experiment monitoring transforms ML development from guesswork into science. By tracking parameters, metrics, and artifacts with Kubeflow and MLflow, you build institutional knowledge that accelerates future projects. Start tracking everything from day one because you never know which early experiment holds the key insight for your production model.
