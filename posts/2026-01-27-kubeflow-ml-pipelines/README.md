# How to Build ML Pipelines with Kubeflow

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubeflow, MLOps, Machine Learning, Kubernetes, Pipelines

Description: Learn how to build machine learning pipelines with Kubeflow Pipelines, including component creation, pipeline authoring, and orchestration on Kubernetes.

---

> ML models are only as good as the pipelines that train and deploy them. Kubeflow Pipelines brings reproducibility, scalability, and automation to your ML workflows on Kubernetes.

Machine learning in production requires more than a Jupyter notebook. You need data ingestion, preprocessing, training, evaluation, and deployment - all working together reliably. Kubeflow Pipelines provides a platform for building and deploying portable, scalable ML workflows based on Docker containers.

This guide walks through Kubeflow Pipelines from fundamentals to practical implementation with real code examples.

---

## What is Kubeflow Pipelines

Kubeflow Pipelines (KFP) is a platform for building and deploying ML workflows on Kubernetes. It provides:

- **Pipeline SDK**: Python library for defining and compiling pipelines
- **Pipeline UI**: Web interface for managing runs, experiments, and artifacts
- **Execution engine**: Argo Workflows or Tekton for orchestrating containers
- **Metadata store**: Tracking inputs, outputs, and lineage across runs
- **Artifact store**: Storing datasets, models, and metrics

Each step in a pipeline runs as a container, making pipelines portable across environments.

---

## Pipeline SDK Basics

Install the KFP SDK:

```bash
pip install kfp
```

A pipeline is a graph of components. Each component is a containerized step that takes inputs and produces outputs.

```python
# Basic pipeline structure
from kfp import dsl

@dsl.pipeline(
    name='simple-pipeline',
    description='A minimal example pipeline'
)
def simple_pipeline(message: str = 'Hello'):
    # Pipeline steps defined here
    pass
```

Compile the pipeline to YAML for submission:

```python
from kfp import compiler

# Compile pipeline to YAML file
compiler.Compiler().compile(
    pipeline_func=simple_pipeline,
    package_path='simple_pipeline.yaml'
)
```

---

## Creating Pipeline Components

Components are the building blocks of pipelines. There are two main approaches: lightweight Python components and container-based components.

### Lightweight Python Components

For simple operations, use the `@dsl.component` decorator. The function runs inside a base Python container.

```python
from kfp import dsl

# Define a lightweight Python component
# The decorator converts this function into a pipeline component
@dsl.component(
    base_image='python:3.10-slim',  # Container image to use
    packages_to_install=['pandas', 'scikit-learn']  # Dependencies
)
def preprocess_data(
    input_path: str,
    output_path: dsl.OutputPath('Dataset')  # Output artifact
) -> float:
    """Load and preprocess data, return row count."""
    import pandas as pd
    from sklearn.preprocessing import StandardScaler

    # Load raw data
    df = pd.read_csv(input_path)

    # Basic preprocessing
    df = df.dropna()

    # Scale numeric columns
    scaler = StandardScaler()
    numeric_cols = df.select_dtypes(include=['float64', 'int64']).columns
    df[numeric_cols] = scaler.fit_transform(df[numeric_cols])

    # Save processed data
    df.to_csv(output_path, index=False)

    return float(len(df))
```

```python
# Training component example
@dsl.component(
    base_image='python:3.10-slim',
    packages_to_install=['pandas', 'scikit-learn', 'joblib']
)
def train_model(
    data_path: dsl.InputPath('Dataset'),  # Input from previous step
    model_path: dsl.OutputPath('Model'),  # Output model artifact
    n_estimators: int = 100,
    max_depth: int = 10
) -> dict:
    """Train a RandomForest model and return metrics."""
    import pandas as pd
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import accuracy_score, f1_score
    import joblib

    # Load preprocessed data
    df = pd.read_csv(data_path)
    X = df.drop('target', axis=1)
    y = df['target']

    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    # Train model
    model = RandomForestClassifier(
        n_estimators=n_estimators,
        max_depth=max_depth,
        random_state=42
    )
    model.fit(X_train, y_train)

    # Evaluate
    predictions = model.predict(X_test)
    accuracy = accuracy_score(y_test, predictions)
    f1 = f1_score(y_test, predictions, average='weighted')

    # Save model
    joblib.dump(model, model_path)

    # Return metrics as dict
    return {
        'accuracy': float(accuracy),
        'f1_score': float(f1),
        'train_samples': len(X_train),
        'test_samples': len(X_test)
    }
```

### Container-Based Components

For complex components with specific dependencies, build custom Docker images.

```dockerfile
# Dockerfile for a custom training component
FROM python:3.10-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy component code
COPY train.py .

ENTRYPOINT ["python", "train.py"]
```

```python
# train.py - Component entrypoint
import argparse
import json
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier
import joblib

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--data-path', required=True)
    parser.add_argument('--model-path', required=True)
    parser.add_argument('--metrics-path', required=True)
    parser.add_argument('--learning-rate', type=float, default=0.1)
    parser.add_argument('--n-estimators', type=int, default=100)
    args = parser.parse_args()

    # Load data
    df = pd.read_csv(args.data_path)
    X = df.drop('target', axis=1)
    y = df['target']

    # Train
    model = GradientBoostingClassifier(
        learning_rate=args.learning_rate,
        n_estimators=args.n_estimators
    )
    model.fit(X, y)

    # Save model
    joblib.dump(model, args.model_path)

    # Write metrics
    metrics = {'accuracy': float(model.score(X, y))}
    with open(args.metrics_path, 'w') as f:
        json.dump(metrics, f)

if __name__ == '__main__':
    main()
```

Define the component in YAML or Python:

```python
from kfp import dsl
from kfp.dsl import ContainerSpec

# Define container-based component
@dsl.container_component
def custom_training_component(
    data_path: str,
    model_path: dsl.OutputPath('Model'),
    metrics_path: dsl.OutputPath('Metrics'),
    learning_rate: float = 0.1,
    n_estimators: int = 100
):
    return ContainerSpec(
        image='your-registry/custom-trainer:v1',
        command=['python', 'train.py'],
        args=[
            '--data-path', data_path,
            '--model-path', model_path,
            '--metrics-path', metrics_path,
            '--learning-rate', str(learning_rate),
            '--n-estimators', str(n_estimators)
        ]
    )
```

---

## Pipeline Authoring and Composition

Connect components to form a complete pipeline:

```python
from kfp import dsl
from kfp import compiler

# Evaluation component
@dsl.component(
    base_image='python:3.10-slim',
    packages_to_install=['pandas', 'scikit-learn', 'joblib']
)
def evaluate_model(
    model_path: dsl.InputPath('Model'),
    test_data_path: dsl.InputPath('Dataset'),
    threshold: float = 0.8
) -> bool:
    """Evaluate model and return whether it passes the threshold."""
    import pandas as pd
    import joblib

    model = joblib.load(model_path)
    df = pd.read_csv(test_data_path)
    X = df.drop('target', axis=1)
    y = df['target']

    accuracy = model.score(X, y)
    print(f'Model accuracy: {accuracy:.4f}')

    return accuracy >= threshold


# Deployment component
@dsl.component(base_image='python:3.10-slim')
def deploy_model(
    model_path: dsl.InputPath('Model'),
    endpoint_name: str
) -> str:
    """Deploy model to serving endpoint."""
    # In practice, this would call your model serving infrastructure
    print(f'Deploying model to endpoint: {endpoint_name}')
    return f'https://serving.example.com/{endpoint_name}'


# Full pipeline definition
@dsl.pipeline(
    name='ml-training-pipeline',
    description='End-to-end ML pipeline with preprocessing, training, evaluation, and deployment'
)
def ml_pipeline(
    raw_data_path: str,
    n_estimators: int = 100,
    max_depth: int = 10,
    accuracy_threshold: float = 0.8,
    endpoint_name: str = 'model-v1'
):
    # Step 1: Preprocess data
    preprocess_task = preprocess_data(input_path=raw_data_path)

    # Step 2: Train model (depends on preprocessing)
    train_task = train_model(
        data_path=preprocess_task.outputs['output_path'],
        n_estimators=n_estimators,
        max_depth=max_depth
    )

    # Step 3: Evaluate model
    eval_task = evaluate_model(
        model_path=train_task.outputs['model_path'],
        test_data_path=preprocess_task.outputs['output_path'],
        threshold=accuracy_threshold
    )

    # Step 4: Conditional deployment
    with dsl.Condition(eval_task.output == True, name='deploy-if-good'):
        deploy_model(
            model_path=train_task.outputs['model_path'],
            endpoint_name=endpoint_name
        )


# Compile the pipeline
compiler.Compiler().compile(
    pipeline_func=ml_pipeline,
    package_path='ml_pipeline.yaml'
)
```

---

## Parameters and Artifacts

Kubeflow distinguishes between parameters (small values) and artifacts (files/data).

### Pipeline Parameters

```python
@dsl.pipeline(name='parameterized-pipeline')
def parameterized_pipeline(
    # String parameter with default
    dataset_name: str = 'default-dataset',
    # Integer parameter
    epochs: int = 10,
    # Float parameter
    learning_rate: float = 0.001,
    # Boolean parameter
    use_gpu: bool = False
):
    # Parameters are passed to components
    train_task = train_component(
        dataset=dataset_name,
        epochs=epochs,
        lr=learning_rate,
        gpu=use_gpu
    )
```

### Artifacts and Data Passing

```python
from kfp import dsl
from kfp.dsl import Input, Output, Dataset, Model, Metrics

@dsl.component(base_image='python:3.10-slim')
def produce_dataset(
    output_dataset: Output[Dataset]  # Typed output artifact
):
    """Create a dataset artifact."""
    import pandas as pd

    df = pd.DataFrame({'x': [1, 2, 3], 'y': [4, 5, 6]})
    df.to_csv(output_dataset.path, index=False)

    # Add metadata to artifact
    output_dataset.metadata['rows'] = len(df)
    output_dataset.metadata['columns'] = list(df.columns)


@dsl.component(base_image='python:3.10-slim')
def consume_dataset(
    input_dataset: Input[Dataset]  # Typed input artifact
) -> int:
    """Read a dataset artifact."""
    import pandas as pd

    # Access artifact path
    df = pd.read_csv(input_dataset.path)

    # Access artifact metadata
    print(f"Metadata: {input_dataset.metadata}")

    return len(df)


@dsl.component(
    base_image='python:3.10-slim',
    packages_to_install=['scikit-learn']
)
def log_metrics(
    accuracy: float,
    metrics_output: Output[Metrics]
):
    """Log metrics for visualization in the UI."""
    metrics_output.log_metric('accuracy', accuracy)
    metrics_output.log_metric('loss', 1 - accuracy)
```

---

## Running Pipelines

### Submit via Python Client

```python
import kfp
from kfp.client import Client

# Connect to KFP instance
client = Client(host='https://kubeflow.your-cluster.com/pipeline')

# Create an experiment (logical grouping of runs)
experiment = client.create_experiment(
    name='model-training-experiments',
    description='Experiments for model v2'
)

# Submit a pipeline run
run = client.create_run_from_pipeline_func(
    pipeline_func=ml_pipeline,
    experiment_name='model-training-experiments',
    run_name='training-run-001',
    arguments={
        'raw_data_path': 'gs://bucket/data/raw.csv',
        'n_estimators': 200,
        'max_depth': 15,
        'accuracy_threshold': 0.85,
        'endpoint_name': 'model-v2'
    }
)

print(f'Run ID: {run.run_id}')
print(f'Run URL: {run.run_url}')
```

### Submit from Compiled YAML

```python
# Submit from pre-compiled YAML
run = client.create_run_from_pipeline_package(
    pipeline_file='ml_pipeline.yaml',
    arguments={
        'raw_data_path': 'gs://bucket/data/raw.csv',
        'n_estimators': 150
    },
    run_name='yaml-based-run'
)
```

### Recurring Runs (Scheduled Pipelines)

```python
# Create a recurring run (cron-based)
recurring_run = client.create_recurring_run(
    experiment_id=experiment.experiment_id,
    job_name='daily-retraining',
    pipeline_package_path='ml_pipeline.yaml',
    params={
        'raw_data_path': 'gs://bucket/data/latest.csv',
        'n_estimators': 100
    },
    cron_expression='0 2 * * *',  # Daily at 2 AM
    max_concurrency=1,
    enabled=True
)
```

---

## Monitoring and Tracking Experiments

### Viewing Runs in the UI

The Kubeflow Pipelines UI provides:

- Run status and logs for each step
- Input/output artifacts with download links
- Metrics visualization and comparison
- Pipeline graph visualization
- Experiment organization

### Programmatic Run Monitoring

```python
from kfp.client import Client
import time

client = Client(host='https://kubeflow.your-cluster.com/pipeline')

def wait_for_run(run_id: str, timeout_seconds: int = 3600):
    """Wait for a pipeline run to complete."""
    start_time = time.time()

    while True:
        run = client.get_run(run_id)
        status = run.run.status

        print(f'Run status: {status}')

        if status in ['Succeeded', 'Failed', 'Error', 'Skipped']:
            return run

        if time.time() - start_time > timeout_seconds:
            raise TimeoutError(f'Run {run_id} timed out')

        time.sleep(30)


def get_run_metrics(run_id: str) -> dict:
    """Extract metrics from a completed run."""
    run = client.get_run(run_id)

    metrics = {}
    for metric in run.run.metrics or []:
        metrics[metric.name] = metric.number_value

    return metrics


def compare_runs(run_ids: list) -> dict:
    """Compare metrics across multiple runs."""
    comparison = {}

    for run_id in run_ids:
        metrics = get_run_metrics(run_id)
        comparison[run_id] = metrics

    return comparison
```

### Artifact Tracking

```python
def get_run_artifacts(run_id: str):
    """Get all artifacts from a run."""
    run = client.get_run(run_id)

    artifacts = []
    for node in run.pipeline_runtime.workflow_manifest:
        # Parse artifact information from workflow
        pass

    return artifacts


# Access artifacts via the Metadata Store
from ml_metadata import metadata_store
from ml_metadata.proto import metadata_store_pb2

# Connect to ML Metadata store
connection_config = metadata_store_pb2.ConnectionConfig()
connection_config.mysql.host = 'mysql-service'
connection_config.mysql.database = 'mlmd'
store = metadata_store.MetadataStore(connection_config)

# Query artifacts
artifacts = store.get_artifacts()
for artifact in artifacts:
    print(f'Artifact: {artifact.name}, Type: {artifact.type_id}')
```

---

## Best Practices for ML Pipelines

### 1. Keep Components Small and Focused

Each component should do one thing well. This improves reusability and debugging.

```python
# Good: Separate components for each concern
@dsl.component
def load_data(...): pass

@dsl.component
def validate_data(...): pass

@dsl.component
def transform_features(...): pass

# Avoid: Monolithic component doing everything
@dsl.component
def do_everything(...): pass  # Hard to debug and reuse
```

### 2. Version Everything

```python
# Pin component images
@dsl.component(base_image='python:3.10.12-slim')
def versioned_component(): pass

# Use semantic versioning for custom images
@dsl.container_component
def custom_component():
    return ContainerSpec(image='registry/component:v1.2.3')
```

### 3. Handle Failures Gracefully

```python
@dsl.component
def robust_component(
    input_path: dsl.InputPath('Dataset')
) -> str:
    """Component with proper error handling."""
    import sys

    try:
        # Main logic
        result = process_data(input_path)
        return result
    except FileNotFoundError:
        print('Input file not found', file=sys.stderr)
        raise
    except Exception as e:
        print(f'Unexpected error: {e}', file=sys.stderr)
        raise
```

### 4. Use Caching Wisely

```python
@dsl.pipeline
def cached_pipeline(data_path: str):
    # Enable caching for expensive steps
    preprocess_task = preprocess_data(input_path=data_path)
    preprocess_task.set_caching_options(enable_caching=True)

    # Disable caching for steps that should always run
    deploy_task = deploy_model(model_path=...)
    deploy_task.set_caching_options(enable_caching=False)
```

### 5. Set Resource Limits

```python
@dsl.pipeline
def resource_aware_pipeline():
    # Set CPU and memory limits
    train_task = train_model(...)
    train_task.set_cpu_limit('4')
    train_task.set_memory_limit('16Gi')

    # Request GPU for training
    train_task.set_gpu_limit('1')
    train_task.add_node_selector_constraint(
        'cloud.google.com/gke-accelerator', 'nvidia-tesla-t4'
    )
```

### 6. Organize with Experiments

```python
# Group related runs into experiments
client.create_experiment(name='model-v2-hyperparameter-tuning')
client.create_experiment(name='model-v2-feature-engineering')
client.create_experiment(name='model-v2-production-candidates')
```

### 7. Document Pipelines

```python
@dsl.pipeline(
    name='documented-pipeline',
    description='''
    Production ML pipeline for customer churn prediction.

    Inputs:
    - raw_data_path: GCS path to raw customer data
    - threshold: Minimum accuracy for deployment

    Outputs:
    - Trained model deployed to serving endpoint
    - Metrics logged to experiment tracker
    '''
)
def documented_pipeline(
    raw_data_path: str,
    threshold: float = 0.85
):
    pass
```

---

## Summary

Kubeflow Pipelines brings structure and reliability to ML workflows:

| Concept | Purpose |
|---------|---------|
| Components | Containerized, reusable steps |
| Pipelines | DAGs connecting components |
| Parameters | Runtime configuration |
| Artifacts | Data and model passing between steps |
| Experiments | Logical grouping of runs |
| Caching | Avoid redundant computation |
| Scheduling | Automated recurring runs |

Start simple with lightweight Python components, then graduate to container-based components as your needs grow. Focus on making pipelines reproducible and debuggable rather than clever.

---

*Need to monitor your ML pipelines in production? [OneUptime](https://oneuptime.com) provides observability for your Kubernetes workloads, helping you track pipeline health, detect failures, and maintain reliability across your ML infrastructure.*
