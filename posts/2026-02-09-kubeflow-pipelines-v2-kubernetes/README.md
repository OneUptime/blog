# How to Build ML Pipelines with Kubeflow Pipelines V2 on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kubeflow, ML Pipelines, MLOps, Machine Learning

Description: Build end-to-end machine learning pipelines with Kubeflow Pipelines V2 on Kubernetes for reproducible, scalable, and automated ML workflows.

---

Building production ML systems requires orchestrating complex workflows that include data validation, preprocessing, training, evaluation, and deployment. Kubeflow Pipelines V2 provides a platform for defining and executing these workflows on Kubernetes using a Python SDK with improved type safety, better artifact management, and enhanced integration with ML metadata tracking.

This guide shows you how to install Kubeflow Pipelines V2 and build complete ML workflows.

## Installing Kubeflow Pipelines

Install the standalone Kubeflow Pipelines deployment:

```bash
# Set the pipeline version
export PIPELINE_VERSION=2.0.5

# Deploy Kubeflow Pipelines
kubectl apply -k "github.com/kubeflow/pipelines/manifests/kustomize/cluster-scoped-resources?ref=$PIPELINE_VERSION"
kubectl wait --for condition=established --timeout=60s crd/applications.app.k8s.io

kubectl apply -k "github.com/kubeflow/pipelines/manifests/kustomize/env/platform-agnostic?ref=$PIPELINE_VERSION"

# Wait for all pods to be ready
kubectl wait --for=condition=ready pod -l application-crd-id=kubeflow-pipelines -n kubeflow --timeout=10m

# Check all components are running
kubectl get pods -n kubeflow

# Expected pods:
# - ml-pipeline
# - ml-pipeline-ui
# - mysql
# - minio
# - workflow-controller
```

Access the Pipelines UI:

```bash
# Port forward to the UI
kubectl port-forward -n kubeflow svc/ml-pipeline-ui 8080:80

# Open browser to http://localhost:8080
```

Install the Kubeflow Pipelines SDK:

```bash
pip install kfp==2.5.0
```

## Creating Your First Pipeline

Create a simple pipeline with data processing and training steps:

```python
# simple_pipeline.py
from kfp import dsl
from kfp import compiler
from kfp.dsl import Input, Output, Dataset, Model, Metrics

@dsl.component(
    base_image='python:3.10',
    packages_to_install=['pandas==2.0.0', 'scikit-learn==1.3.0']
)
def load_data(
    dataset_output: Output[Dataset],
    num_samples: int = 1000
):
    """Load or generate training data"""
    import pandas as pd
    import numpy as np

    # Generate sample data
    np.random.seed(42)
    X = np.random.randn(num_samples, 10)
    y = (X[:, 0] + X[:, 1] > 0).astype(int)

    df = pd.DataFrame(X, columns=[f'feature_{i}' for i in range(10)])
    df['target'] = y

    # Save to output artifact
    df.to_csv(dataset_output.path, index=False)

    print(f"Generated {num_samples} samples")
    print(f"Dataset saved to {dataset_output.path}")

@dsl.component(
    base_image='python:3.10',
    packages_to_install=['pandas==2.0.0', 'scikit-learn==1.3.0']
)
def train_model(
    dataset: Input[Dataset],
    model_output: Output[Model],
    metrics_output: Output[Metrics],
    test_size: float = 0.2
):
    """Train a classification model"""
    import pandas as pd
    from sklearn.model_selection import train_test_split
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.metrics import accuracy_score, f1_score
    import pickle

    # Load data
    df = pd.read_csv(dataset.path)
    X = df.drop('target', axis=1)
    y = df['target']

    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=42
    )

    # Train model
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)

    # Evaluate
    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred)

    print(f"Accuracy: {accuracy:.4f}")
    print(f"F1 Score: {f1:.4f}")

    # Save model
    with open(model_output.path, 'wb') as f:
        pickle.dump(model, f)

    # Log metrics
    metrics_output.log_metric("accuracy", accuracy)
    metrics_output.log_metric("f1_score", f1)

@dsl.component(
    base_image='python:3.10',
    packages_to_install=['scikit-learn==1.3.0']
)
def evaluate_model(
    model: Input[Model],
    metrics: Input[Metrics],
    threshold: float = 0.8
) -> str:
    """Evaluate if model meets quality threshold"""
    import pickle

    # Load metrics
    accuracy = metrics.metadata['accuracy']

    print(f"Model accuracy: {accuracy:.4f}")
    print(f"Threshold: {threshold:.4f}")

    if accuracy >= threshold:
        decision = "APPROVED"
        print("Model approved for deployment!")
    else:
        decision = "REJECTED"
        print("Model rejected - accuracy below threshold")

    return decision

# Define the pipeline
@dsl.pipeline(
    name='Simple ML Pipeline',
    description='A simple pipeline for training and evaluating a model'
)
def simple_ml_pipeline(
    num_samples: int = 1000,
    test_size: float = 0.2,
    accuracy_threshold: float = 0.8
):
    # Load data
    load_data_task = load_data(num_samples=num_samples)

    # Train model
    train_task = train_model(
        dataset=load_data_task.outputs['dataset_output'],
        test_size=test_size
    )

    # Evaluate model
    evaluate_task = evaluate_model(
        model=train_task.outputs['model_output'],
        metrics=train_task.outputs['metrics_output'],
        threshold=accuracy_threshold
    )

# Compile the pipeline
if __name__ == '__main__':
    compiler.Compiler().compile(
        pipeline_func=simple_ml_pipeline,
        package_path='simple_pipeline.yaml'
    )
    print("Pipeline compiled successfully!")
```

Compile and run the pipeline:

```bash
# Compile the pipeline
python simple_pipeline.py

# This creates simple_pipeline.yaml

# Upload and run the pipeline
python -c "
import kfp

client = kfp.Client(host='http://localhost:8080')

# Upload the pipeline
pipeline = client.upload_pipeline(
    pipeline_package_path='simple_pipeline.yaml',
    pipeline_name='Simple ML Pipeline'
)

# Create a run
run = client.create_run_from_pipeline_package(
    'simple_pipeline.yaml',
    arguments={
        'num_samples': 2000,
        'test_size': 0.2,
        'accuracy_threshold': 0.75
    },
    run_name='test-run-001'
)

print(f'Pipeline run created: {run.run_id}')
"
```

## Building a Complete ML Pipeline

Create a more complex pipeline with data validation, feature engineering, and model comparison:

```python
# complete_pipeline.py
from kfp import dsl
from kfp import compiler
from kfp.dsl import Input, Output, Dataset, Model, Metrics, HTML
from typing import NamedTuple

@dsl.component(
    base_image='python:3.10',
    packages_to_install=['pandas==2.0.0', 'great-expectations==0.18.0']
)
def validate_data(
    dataset: Input[Dataset],
    validation_report: Output[HTML]
) -> NamedTuple('ValidationOutput', [('is_valid', bool), ('num_rows', int)]):
    """Validate data quality"""
    import pandas as pd
    from collections import namedtuple

    df = pd.read_csv(dataset.path)

    # Basic validation checks
    is_valid = True
    issues = []

    # Check for missing values
    missing = df.isnull().sum().sum()
    if missing > 0:
        issues.append(f"Found {missing} missing values")
        is_valid = False

    # Check data types
    numeric_cols = df.select_dtypes(include=['float64', 'int64']).columns
    if len(numeric_cols) == 0:
        issues.append("No numeric columns found")
        is_valid = False

    # Generate HTML report
    html_content = f"""
    <html>
    <head><title>Data Validation Report</title></head>
    <body>
        <h1>Data Validation Report</h1>
        <p>Number of rows: {len(df)}</p>
        <p>Number of columns: {len(df.columns)}</p>
        <p>Status: {'PASS' if is_valid else 'FAIL'}</p>
        <h2>Issues:</h2>
        <ul>{''.join(f'<li>{issue}</li>' for issue in issues) if issues else '<li>No issues found</li>'}</ul>
    </body>
    </html>
    """

    with open(validation_report.path, 'w') as f:
        f.write(html_content)

    output = namedtuple('ValidationOutput', ['is_valid', 'num_rows'])
    return output(is_valid=is_valid, num_rows=len(df))

@dsl.component(
    base_image='python:3.10',
    packages_to_install=['pandas==2.0.0', 'scikit-learn==1.3.0']
)
def engineer_features(
    dataset: Input[Dataset],
    transformed_dataset: Output[Dataset]
):
    """Apply feature engineering"""
    import pandas as pd
    from sklearn.preprocessing import StandardScaler
    import pickle

    df = pd.read_csv(dataset.path)

    # Separate features and target
    if 'target' in df.columns:
        X = df.drop('target', axis=1)
        y = df['target']
    else:
        X = df
        y = None

    # Create new features
    # Example: polynomial features for first two columns
    X['feature_0_squared'] = X.iloc[:, 0] ** 2
    X['feature_1_squared'] = X.iloc[:, 1] ** 2
    X['feature_0_1_interaction'] = X.iloc[:, 0] * X.iloc[:, 1]

    # Scale features
    scaler = StandardScaler()
    X_scaled = pd.DataFrame(
        scaler.fit_transform(X),
        columns=X.columns
    )

    # Add target back
    if y is not None:
        X_scaled['target'] = y.values

    # Save transformed data
    X_scaled.to_csv(transformed_dataset.path, index=False)

    print(f"Original features: {len(df.columns)}")
    print(f"Engineered features: {len(X_scaled.columns)}")

@dsl.component(
    base_image='python:3.10',
    packages_to_install=['pandas==2.0.0', 'scikit-learn==1.3.0']
)
def train_multiple_models(
    dataset: Input[Dataset],
    rf_model: Output[Model],
    lr_model: Output[Model],
    rf_metrics: Output[Metrics],
    lr_metrics: Output[Metrics]
):
    """Train multiple models and compare"""
    import pandas as pd
    from sklearn.model_selection import train_test_split
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.linear_model import LogisticRegression
    from sklearn.metrics import accuracy_score, f1_score, roc_auc_score
    import pickle

    # Load data
    df = pd.read_csv(dataset.path)
    X = df.drop('target', axis=1)
    y = df['target']

    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    # Train Random Forest
    rf = RandomForestClassifier(n_estimators=100, random_state=42)
    rf.fit(X_train, y_train)
    rf_pred = rf.predict(X_test)
    rf_proba = rf.predict_proba(X_test)[:, 1]

    rf_acc = accuracy_score(y_test, rf_pred)
    rf_f1 = f1_score(y_test, rf_pred)
    rf_auc = roc_auc_score(y_test, rf_proba)

    # Train Logistic Regression
    lr = LogisticRegression(random_state=42, max_iter=1000)
    lr.fit(X_train, y_train)
    lr_pred = lr.predict(X_test)
    lr_proba = lr.predict_proba(X_test)[:, 1]

    lr_acc = accuracy_score(y_test, lr_pred)
    lr_f1 = f1_score(y_test, lr_pred)
    lr_auc = roc_auc_score(y_test, lr_proba)

    print("Random Forest:")
    print(f"  Accuracy: {rf_acc:.4f}")
    print(f"  F1 Score: {rf_f1:.4f}")
    print(f"  ROC AUC: {rf_auc:.4f}")

    print("\nLogistic Regression:")
    print(f"  Accuracy: {lr_acc:.4f}")
    print(f"  F1 Score: {lr_f1:.4f}")
    print(f"  ROC AUC: {lr_auc:.4f}")

    # Save models
    with open(rf_model.path, 'wb') as f:
        pickle.dump(rf, f)
    with open(lr_model.path, 'wb') as f:
        pickle.dump(lr, f)

    # Log metrics
    rf_metrics.log_metric("accuracy", rf_acc)
    rf_metrics.log_metric("f1_score", rf_f1)
    rf_metrics.log_metric("roc_auc", rf_auc)

    lr_metrics.log_metric("accuracy", lr_acc)
    lr_metrics.log_metric("f1_score", lr_f1)
    lr_metrics.log_metric("roc_auc", lr_auc)

@dsl.component(base_image='python:3.10')
def select_best_model(
    rf_metrics: Input[Metrics],
    lr_metrics: Input[Metrics]
) -> str:
    """Select the best model based on metrics"""

    rf_auc = rf_metrics.metadata.get('roc_auc', 0)
    lr_auc = lr_metrics.metadata.get('roc_auc', 0)

    print(f"Random Forest ROC AUC: {rf_auc:.4f}")
    print(f"Logistic Regression ROC AUC: {lr_auc:.4f}")

    if rf_auc > lr_auc:
        winner = "random_forest"
        print("Selected: Random Forest")
    else:
        winner = "logistic_regression"
        print("Selected: Logistic Regression")

    return winner

@dsl.pipeline(
    name='Complete ML Pipeline',
    description='End-to-end pipeline with data validation, feature engineering, and model selection'
)
def complete_ml_pipeline(
    num_samples: int = 2000,
    test_size: float = 0.2
):
    # Generate data
    load_task = load_data(num_samples=num_samples)

    # Validate data
    validate_task = validate_data(
        dataset=load_task.outputs['dataset_output']
    )

    # Conditional: only proceed if data is valid
    with dsl.Condition(validate_task.outputs['is_valid'] == True):
        # Feature engineering
        engineer_task = engineer_features(
            dataset=load_task.outputs['dataset_output']
        )

        # Train multiple models
        train_task = train_multiple_models(
            dataset=engineer_task.outputs['transformed_dataset']
        )

        # Select best model
        select_task = select_best_model(
            rf_metrics=train_task.outputs['rf_metrics'],
            lr_metrics=train_task.outputs['lr_metrics']
        )

if __name__ == '__main__':
    compiler.Compiler().compile(
        pipeline_func=complete_ml_pipeline,
        package_path='complete_pipeline.yaml'
    )
    print("Complete pipeline compiled!")
```

## Creating Recurring Pipeline Runs

Set up a recurring schedule for your pipeline:

```python
# schedule_pipeline.py
import kfp
from datetime import datetime

client = kfp.Client(host='http://localhost:8080')

# Upload pipeline
pipeline = client.upload_pipeline(
    pipeline_package_path='complete_pipeline.yaml',
    pipeline_name='Complete ML Pipeline - Scheduled'
)

# Create a recurring run (daily at 2 AM)
recurring_run = client.create_recurring_run(
    experiment_id=client.create_experiment('daily-training').id,
    job_name='daily-model-training',
    description='Daily model retraining',
    pipeline_package_path='complete_pipeline.yaml',
    params={
        'num_samples': 5000,
        'test_size': 0.2
    },
    cron_expression='0 2 * * *',  # Daily at 2 AM
    enable_caching=True
)

print(f"Recurring run created: {recurring_run.id}")
```

## Using Pipeline Parameters and Artifacts

Create a pipeline that uses conditional logic and artifact passing:

```python
@dsl.pipeline(
    name='Conditional Pipeline',
    description='Pipeline with conditional execution'
)
def conditional_pipeline(
    accuracy_threshold: float = 0.85,
    deploy_to_production: bool = False
):
    # Previous tasks...
    train_task = train_model()

    # Deploy only if accuracy meets threshold
    with dsl.Condition(
        train_task.outputs['metrics_output'].metadata['accuracy'] >= accuracy_threshold
    ):
        if deploy_to_production:
            deploy_model(model=train_task.outputs['model_output'])
        else:
            deploy_to_staging(model=train_task.outputs['model_output'])
```

## Monitoring Pipelines

Query pipeline runs programmatically:

```python
# monitor_pipelines.py
import kfp

client = kfp.Client(host='http://localhost:8080')

# List recent runs
runs = client.list_runs(page_size=10)

for run in runs.runs:
    print(f"Run: {run.name}")
    print(f"  Status: {run.status}")
    print(f"  Created: {run.created_at}")

    # Get metrics from run
    run_detail = client.get_run(run.id)
    if run_detail.run.status == 'Succeeded':
        print(f"  ✓ Completed successfully")
    elif run_detail.run.status == 'Failed':
        print(f"  ✗ Failed")

# Get specific run metrics
run_id = 'your-run-id'
run_metrics = client.get_run_metrics(run_id)
print(f"Metrics: {run_metrics}")
```

## Best Practices

Use caching for expensive operations:

```python
@dsl.component(
    base_image='python:3.10',
    packages_to_install=['pandas']
)
def expensive_preprocessing(
    input_data: Input[Dataset],
    output_data: Output[Dataset]
):
    # This will be cached if inputs haven't changed
    pass

# In pipeline
@dsl.pipeline(name='Cached Pipeline')
def cached_pipeline():
    preprocess_task = expensive_preprocessing()
    # If input_data hasn't changed, this step will be skipped
    preprocess_task.set_caching_options(enable_caching=True)
```

Set resource limits:

```python
@dsl.component(base_image='python:3.10')
def gpu_training_component():
    pass

# In pipeline
@dsl.pipeline(name='GPU Pipeline')
def gpu_pipeline():
    train_task = gpu_training_component()

    # Set GPU requirements
    train_task.set_gpu_limit(1)
    train_task.set_memory_limit('16Gi')
    train_task.set_cpu_limit('4')
```

## Conclusion

Kubeflow Pipelines V2 provides a powerful platform for building production ML workflows on Kubernetes. The improved component model with typed inputs and outputs makes pipelines more maintainable, while the artifact system ensures proper tracking of data and models throughout the workflow. By leveraging conditional execution, caching, and scheduling, you can build sophisticated MLOps pipelines that automate the entire model lifecycle from data validation to deployment.
