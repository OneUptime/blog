# How to Track ML Metadata and Lineage with Vertex AI ML Metadata

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Vertex AI, ML Metadata, MLOps, Model Lineage, Google Cloud

Description: Learn how to track machine learning metadata and model lineage using Vertex AI ML Metadata to improve reproducibility and governance of your ML workflows.

---

When something goes wrong with a production ML model, the first question is always "what changed?" Was it the training data? The hyperparameters? The feature engineering code? Without metadata tracking, answering this question involves detective work across notebooks, training logs, and deployment records. It is painful, slow, and unreliable.

Vertex AI ML Metadata gives you a structured way to record and query the entire lineage of your ML artifacts - from the raw data through feature engineering, training, evaluation, and deployment. Every artifact (datasets, models, metrics) and every execution (training runs, evaluation jobs) is tracked, and the relationships between them are recorded as well.

## Core Concepts

ML Metadata uses three main abstractions:

- **Artifacts** - Data objects like datasets, models, and metrics. Each artifact has a type, properties, and a URI pointing to where it is stored.
- **Executions** - Processes that create or consume artifacts. A training run is an execution that takes a dataset artifact as input and produces a model artifact as output.
- **Contexts** - Groupings of artifacts and executions. A pipeline run is a context that contains all the executions and artifacts from that run.

Together, these concepts form a lineage graph that is well-structured and queryable.

## Step 1: Setting Up the Metadata Store

Vertex AI ML Metadata is available automatically in your project. You just need to initialize it and start recording.

```python
# metadata_setup.py

from google.cloud import aiplatform
from google.cloud import aiplatform_v1

# Initialize Vertex AI - the metadata store is created automatically
aiplatform.init(
    project="my-project",
    location="us-central1",
)

# Verify the metadata store is accessible
metadata_client = aiplatform_v1.MetadataServiceClient(
    client_options={"api_endpoint": "us-central1-aiplatform.googleapis.com"}
)
metadata_store = metadata_client.get_metadata_store(
    name="projects/my-project/locations/us-central1/metadataStores/default"
)
print(f"Metadata store: {metadata_store.name}")
```

## Step 2: Log Artifacts from Your Training Pipeline

When you run a training pipeline, log every input and output as an artifact. Here is how to do this in a training script.

```python
# training/train_with_metadata.py
from google.cloud import aiplatform
import datetime
import json

def train_model_with_metadata(
    training_data_uri,
    hyperparameters,
    output_model_uri,
):
    """Train a model and log all metadata for lineage tracking."""

    aiplatform.init(
        project="my-project",
        location="us-central1",
        experiment="metadata-lineage",
    )

    # Generate a unique run ID for this training execution
    run_id = f"training-run-{datetime.datetime.now().strftime('%Y%m%d-%H%M%S')}"

    # Create an experiment run for parameters and metrics
    with aiplatform.start_run(run_id) as run:

        # Log the training dataset as an input artifact
        dataset_artifact = aiplatform.Artifact.create(
            schema_title="system.Dataset",
            display_name="training-dataset",
            uri=training_data_uri,
            metadata={
                "row_count": 100000,
                "feature_count": 25,
                "date_range": "2025-01-01 to 2026-02-17",
                "source": "bigquery",
                "table": "ml_features.training_data",
            }
        )

        # Log hyperparameters
        aiplatform.log_params({
            "learning_rate": hyperparameters["learning_rate"],
            "n_estimators": hyperparameters["n_estimators"],
            "max_depth": hyperparameters["max_depth"],
            "batch_size": hyperparameters["batch_size"],
            "framework": "xgboost",
            "framework_version": "1.7.6",
        })

        # Perform the actual training
        print("Training model...")
        # ... actual training code here ...

        # Log training metrics over time
        for epoch in range(hyperparameters["n_estimators"]):
            if epoch % 10 == 0:
                aiplatform.log_metrics({
                    f"train_loss_epoch_{epoch}": 0.5 - (epoch * 0.003),
                    f"val_loss_epoch_{epoch}": 0.55 - (epoch * 0.002),
                })

        # Log final evaluation metrics
        aiplatform.log_metrics({
            "accuracy": 0.92,
            "f1_score": 0.89,
            "precision": 0.91,
            "recall": 0.87,
            "auc_roc": 0.95,
        })

        # Log the output model as an artifact
        model_artifact = aiplatform.Artifact.create(
            schema_title="system.Model",
            display_name="trained-model",
            uri=output_model_uri,
            metadata={
                "framework": "xgboost",
                "model_type": "XGBClassifier",
                "training_run": run_id,
                "feature_importance_top5": json.dumps([
                    "feature_a", "feature_b", "feature_c",
                    "feature_d", "feature_e"
                ]),
            }
        )

        # Record the artifact lineage with a metadata execution
        with aiplatform.start_execution(
            schema_title="system.Run",
            display_name=run_id,
            resource_id=run_id,
            metadata={
                "learning_rate": hyperparameters["learning_rate"],
                "n_estimators": hyperparameters["n_estimators"],
                "max_depth": hyperparameters["max_depth"],
                "batch_size": hyperparameters["batch_size"],
            },
        ) as execution:
            execution.assign_input_artifacts([dataset_artifact])
            execution.assign_output_artifacts([model_artifact])
            run.associate_execution(execution)

        print(f"Training complete. Run ID: {run_id}")
        return run_id
```

## Step 3: Track Data Preprocessing Lineage

Do not just track training - track the entire pipeline including data preprocessing.

```python
# preprocessing/preprocess_with_metadata.py
from google.cloud import aiplatform
import datetime

def preprocess_data_with_metadata(
    raw_data_uri,
    processed_data_uri,
    preprocessing_params,
):
    """Preprocess data and record the lineage."""
    aiplatform.init(
        project="my-project",
        location="us-central1",
        experiment="metadata-lineage",
    )

    run_id = f"preprocessing-{datetime.datetime.now().strftime('%Y%m%d-%H%M%S')}"

    with aiplatform.start_run(run_id) as run:
        # Log the raw data input
        raw_data = aiplatform.Artifact.create(
            schema_title="system.Dataset",
            display_name="raw-data",
            uri=raw_data_uri,
            metadata={
                "format": "parquet",
                "source": "cloud_storage",
                "row_count": 500000,
            }
        )
        # Log preprocessing parameters
        aiplatform.log_params({
            "null_handling": preprocessing_params.get("null_handling", "drop"),
            "scaling_method": preprocessing_params.get("scaling", "standard"),
            "encoding_method": preprocessing_params.get("encoding", "one_hot"),
            "feature_selection": preprocessing_params.get("selection", "all"),
        })

        # Perform preprocessing
        print("Running data preprocessing...")
        # ... actual preprocessing code ...

        # Log the processed dataset
        processed_data = aiplatform.Artifact.create(
            schema_title="system.Dataset",
            display_name="processed-data",
            uri=processed_data_uri,
            metadata={
                "format": "csv",
                "row_count": 480000,
                "removed_rows": 20000,
                "null_percentage": 0.0,
            }
        )
        # Log data quality metrics
        aiplatform.log_metrics({
            "rows_removed": 20000,
            "null_rate_before": 0.04,
            "null_rate_after": 0.0,
            "feature_count_before": 50,
            "feature_count_after": 25,
        })

        # Record the artifact lineage with a metadata execution
        with aiplatform.start_execution(
            schema_title="system.Run",
            display_name=run_id,
            resource_id=run_id,
            metadata=preprocessing_params,
        ) as execution:
            execution.assign_input_artifacts([raw_data])
            execution.assign_output_artifacts([processed_data])
            run.associate_execution(execution)

        return run_id
```

## Step 4: Query Metadata for Lineage

The real power of ML Metadata comes from querying it. You can trace the complete lineage of any model or dataset.

```python
# lineage/query_lineage.py
from google.cloud import aiplatform
from google.cloud import aiplatform_v1

def get_model_lineage(model_artifact_name):
    """Trace the complete lineage of a model back to raw data."""
    aiplatform.init(project="my-project", location="us-central1")

    # Get the model artifact
    model = aiplatform.Artifact(model_artifact_name)

    # Query the lineage subgraph
    metadata_client = aiplatform_v1.MetadataServiceClient(
        client_options={"api_endpoint": "us-central1-aiplatform.googleapis.com"}
    )
    lineage = metadata_client.query_artifact_lineage_subgraph(
        artifact=model.resource_name
    )

    print(f"Model: {model.display_name}")
    print(f"  URI: {model.uri}")
    print(f"  Created: {model.create_time}")
    print(f"  Metadata: {model.metadata}")

    # Walk the lineage graph
    print("\nLineage:")
    for artifact in lineage.artifacts:
        print(f"  Artifact: {artifact.display_name}")
        print(f"    Type: {artifact.schema_title}")
        print(f"    URI: {artifact.uri}")

    for execution in lineage.executions:
        print(f"  Execution: {execution.display_name}")
        print(f"    State: {execution.state}")

    return lineage


def compare_training_runs(run_id_1, run_id_2):
    """Compare two training runs to identify what changed."""
    aiplatform.init(project="my-project", location="us-central1")

    run_1 = aiplatform.ExperimentRun(run_id_1, experiment="metadata-lineage")
    run_2 = aiplatform.ExperimentRun(run_id_2, experiment="metadata-lineage")

    # Get parameters from both runs
    params_1 = run_1.get_params()
    params_2 = run_2.get_params()

    print("Parameter differences:")
    all_keys = set(list(params_1.keys()) + list(params_2.keys()))
    for key in sorted(all_keys):
        val_1 = params_1.get(key, "N/A")
        val_2 = params_2.get(key, "N/A")
        if val_1 != val_2:
            print(f"  {key}: {val_1} -> {val_2}")

    # Get metrics from both runs
    metrics_1 = run_1.get_metrics()
    metrics_2 = run_2.get_metrics()

    print("\nMetric differences:")
    metric_keys = set(list(metrics_1.keys()) + list(metrics_2.keys()))
    for key in sorted(metric_keys):
        val_1 = metrics_1.get(key, "N/A")
        val_2 = metrics_2.get(key, "N/A")
        if val_1 != val_2:
            print(f"  {key}: {val_1} -> {val_2}")
```

## Step 5: Use Experiments for Organized Tracking

Vertex AI Experiments provides a higher-level API for organizing related training runs.

```python
# experiments/run_experiment.py
from google.cloud import aiplatform

def train_and_evaluate(config):
    """Train and evaluate a model for one hyperparameter configuration."""
    # ... actual training and evaluation code here ...
    return 0.90

def run_hyperparameter_experiment():
    """Run multiple training configurations and compare results."""
    aiplatform.init(
        project="my-project",
        location="us-central1",
        experiment="churn-prediction-v2",
    )

    # Define hyperparameter configurations to try
    configs = [
        {"learning_rate": 0.01, "n_estimators": 100, "max_depth": 5},
        {"learning_rate": 0.05, "n_estimators": 200, "max_depth": 7},
        {"learning_rate": 0.1, "n_estimators": 50, "max_depth": 3},
        {"learning_rate": 0.01, "n_estimators": 300, "max_depth": 10},
    ]

    for i, config in enumerate(configs):
        run_name = f"config-{i}"

        with aiplatform.start_run(run_name) as run:
            # Log the configuration
            aiplatform.log_params(config)

            # Train and evaluate (simplified)
            accuracy = train_and_evaluate(config)

            # Log the results
            aiplatform.log_metrics({"accuracy": accuracy})

    # After all runs complete, get a summary
    experiment_df = aiplatform.get_experiment_df("churn-prediction-v2")
    print(experiment_df.sort_values("metric.accuracy", ascending=False))
```

## Step 6: Automate Lineage in Pipeline Components

When using Vertex AI Pipelines, metadata tracking can be built into each component.

```python
# pipeline_components/tracked_training.py
from kfp import dsl
from kfp.dsl import Input, Output, Dataset, Model, Metrics

@dsl.component(
    base_image="python:3.10",
    packages_to_install=["google-cloud-aiplatform", "xgboost", "pandas", "scikit-learn"]
)
def tracked_training(
    training_data: Input[Dataset],
    model_output: Output[Model],
    metrics_output: Output[Metrics],
    learning_rate: float = 0.1,
    n_estimators: int = 100,
):
    """Training component with automatic metadata tracking.
    KFP components automatically log inputs, outputs, and metrics."""
    import pandas as pd
    import xgboost as xgb
    from sklearn.metrics import accuracy_score
    import joblib

    # Load data
    df = pd.read_csv(training_data.path)
    X = df.drop(columns=["label"])
    y = df["label"]

    # Train
    model = xgb.XGBClassifier(
        learning_rate=learning_rate,
        n_estimators=n_estimators,
    )
    model.fit(X, y)

    # Evaluate
    accuracy = accuracy_score(y, model.predict(X))

    # Log metrics - these are automatically tracked in ML Metadata
    metrics_output.log_metric("accuracy", accuracy)
    metrics_output.log_metric("learning_rate", learning_rate)
    metrics_output.log_metric("n_estimators", n_estimators)

    # Save model - the output artifact is automatically tracked
    joblib.dump(model, model_output.path)

    # The pipeline framework automatically records:
    # - The input dataset artifact and its lineage
    # - The output model artifact
    # - The execution (this component run)
    # - The relationships between them
```

## Wrapping Up

ML Metadata tracking is one of those things that seems like extra work until the day you need it - and then it is the most valuable thing you have. Vertex AI ML Metadata gives you structured lineage tracking that connects every model to the data, code, and parameters that created it. Start by logging artifacts and parameters in your training scripts, use Experiments to organize related runs, and build metadata tracking into your pipeline components. When something goes wrong in production (and it will), you will be glad you can trace exactly what went into the model that is causing problems.
