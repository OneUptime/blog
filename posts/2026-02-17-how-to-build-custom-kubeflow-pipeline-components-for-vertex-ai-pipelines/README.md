# How to Build Custom Kubeflow Pipeline Components for Vertex AI Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Vertex AI, Kubeflow Pipelines, MLOps, Pipeline Components, Google Cloud

Description: Learn how to build reusable custom Kubeflow Pipeline components for Vertex AI Pipelines with proper input/output typing, containerization, and testing.

---

Vertex AI Pipelines runs on Kubeflow Pipelines v2 under the hood. While Google provides a set of pre-built components for common tasks, you will inevitably need custom components for your specific data processing, training, and evaluation logic. Building these components well - with proper typing, containerization, and reusability - is what separates a hacky prototype pipeline from a production-grade ML system.

In this post, I will cover the different ways to build custom components, when to use each approach, and how to test and package them for reuse.

## Two Types of Components

There are two main approaches to building custom KFP components:

1. **Lightweight Python components** - Simple Python functions decorated with `@dsl.component`. These are quick to write and good for straightforward logic.

2. **Containerized components** - Full Docker containers that can run any language or tool. These are more flexible and better for production use.

Let me show you both.

## Lightweight Python Components

The simplest way to create a component is with the `@dsl.component` decorator. The function runs in a container with only the packages you specify.

```python
# components/data_validation.py
from kfp.v2 import dsl
from kfp.v2.dsl import Dataset, Input, Output, Metrics

@dsl.component(
    base_image="python:3.10-slim",
    packages_to_install=["pandas==2.1.0", "great-expectations==0.18.0"]
)
def validate_data(
    input_data: Input[Dataset],
    validation_report: Output[Dataset],
    metrics: Output[Metrics],
    min_rows: int = 1000,
    max_null_rate: float = 0.05,
) -> bool:
    """Validate a dataset against quality expectations.
    Returns True if all validations pass."""
    import pandas as pd
    import json

    # Load the input dataset
    df = pd.read_csv(input_data.path)

    results = {}

    # Check minimum row count
    row_count = len(df)
    results["row_count"] = {
        "value": row_count,
        "threshold": min_rows,
        "passed": row_count >= min_rows
    }

    # Check null rate per column
    null_rates = df.isnull().mean().to_dict()
    for col, rate in null_rates.items():
        results[f"null_rate_{col}"] = {
            "value": round(rate, 4),
            "threshold": max_null_rate,
            "passed": rate <= max_null_rate
        }

    # Check for duplicate rows
    duplicate_rate = df.duplicated().mean()
    results["duplicate_rate"] = {
        "value": round(duplicate_rate, 4),
        "threshold": 0.01,
        "passed": duplicate_rate <= 0.01
    }

    # Log metrics for pipeline tracking
    metrics.log_metric("total_rows", row_count)
    metrics.log_metric("null_rate_avg", round(df.isnull().mean().mean(), 4))
    metrics.log_metric("duplicate_rate", round(duplicate_rate, 4))

    # Write the full validation report
    with open(validation_report.path, "w") as f:
        json.dump(results, f, indent=2)

    # Check if all validations passed
    all_passed = all(r["passed"] for r in results.values())
    print(f"Validation {'PASSED' if all_passed else 'FAILED'}")

    return all_passed
```

## Building a Containerized Component

For more complex components that need specific system dependencies, custom Docker images, or non-Python code, use containerized components.

First, write the component logic.

```python
# components/custom_training/train.py
"""Custom training component that runs in a Docker container."""
import argparse
import json
import os
import pandas as pd
import xgboost as xgb
from sklearn.metrics import accuracy_score, f1_score
import joblib

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--train-data", required=True, help="Path to training CSV")
    parser.add_argument("--model-output", required=True, help="Path to save model")
    parser.add_argument("--metrics-output", required=True, help="Path to save metrics")
    parser.add_argument("--target-column", default="label")
    parser.add_argument("--n-estimators", type=int, default=100)
    parser.add_argument("--learning-rate", type=float, default=0.1)
    parser.add_argument("--max-depth", type=int, default=6)
    args = parser.parse_args()

    # Load training data
    df = pd.read_csv(args.train_data)
    X = df.drop(columns=[args.target_column])
    y = df[args.target_column]

    print(f"Training with {len(X)} samples, {len(X.columns)} features")

    # Train the model with specified hyperparameters
    model = xgb.XGBClassifier(
        n_estimators=args.n_estimators,
        learning_rate=args.learning_rate,
        max_depth=args.max_depth,
        eval_metric="logloss",
        use_label_encoder=False,
    )
    model.fit(X, y, verbose=True)

    # Evaluate on training data
    predictions = model.predict(X)
    metrics = {
        "accuracy": float(accuracy_score(y, predictions)),
        "f1_score": float(f1_score(y, predictions, average="weighted")),
        "n_estimators": args.n_estimators,
        "learning_rate": args.learning_rate,
        "max_depth": args.max_depth,
        "training_samples": len(X),
        "feature_count": len(X.columns),
    }

    # Save model and metrics
    os.makedirs(os.path.dirname(args.model_output), exist_ok=True)
    joblib.dump(model, args.model_output)

    os.makedirs(os.path.dirname(args.metrics_output), exist_ok=True)
    with open(args.metrics_output, "w") as f:
        json.dump(metrics, f, indent=2)

    print(f"Model saved to {args.model_output}")
    print(f"Metrics: {json.dumps(metrics, indent=2)}")

if __name__ == "__main__":
    main()
```

Build the Docker image.

```dockerfile
# components/custom_training/Dockerfile
FROM python:3.10-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy the training script
COPY train.py /app/train.py

WORKDIR /app
ENTRYPOINT ["python", "train.py"]
```

Now define the component specification that tells KFP how to use this container.

```python
# components/custom_training/component.py
from kfp.v2 import dsl
from kfp.v2.dsl import Dataset, Input, Output, Model, Metrics

@dsl.container_component
def custom_training_component(
    train_data: Input[Dataset],
    model_output: Output[Model],
    metrics_output: Output[Metrics],
    target_column: str = "label",
    n_estimators: int = 100,
    learning_rate: float = 0.1,
    max_depth: int = 6,
):
    """Custom training component running in a dedicated container."""
    return dsl.ContainerSpec(
        image="us-central1-docker.pkg.dev/my-project/ml-components/custom-trainer:latest",
        command=["python", "train.py"],
        args=[
            "--train-data", train_data.path,
            "--model-output", model_output.path,
            "--metrics-output", metrics_output.path,
            "--target-column", target_column,
            "--n-estimators", str(n_estimators),
            "--learning-rate", str(learning_rate),
            "--max-depth", str(max_depth),
        ],
    )
```

## Building Reusable Component Libraries

As your team builds more pipelines, you want to share components across projects. Package them as a Python library.

```python
# ml_components/__init__.py
"""Reusable ML pipeline components for Vertex AI Pipelines."""

from ml_components.data_validation import validate_data
from ml_components.feature_engineering import compute_features
from ml_components.training import train_xgboost_model
from ml_components.evaluation import evaluate_classification_model
from ml_components.deployment import deploy_to_endpoint

__all__ = [
    "validate_data",
    "compute_features",
    "train_xgboost_model",
    "evaluate_classification_model",
    "deploy_to_endpoint",
]
```

```python
# ml_components/evaluation.py
from kfp.v2 import dsl
from kfp.v2.dsl import Dataset, Input, Output, Model, Metrics, ClassificationMetrics

@dsl.component(
    base_image="python:3.10-slim",
    packages_to_install=["pandas", "scikit-learn", "xgboost", "joblib"]
)
def evaluate_classification_model(
    model_input: Input[Model],
    test_data: Input[Dataset],
    metrics: Output[Metrics],
    classification_metrics: Output[ClassificationMetrics],
    target_column: str = "label",
    accuracy_threshold: float = 0.85,
) -> bool:
    """Evaluate a classification model and produce detailed metrics.
    Returns True if the model passes the quality threshold."""
    import pandas as pd
    from sklearn.metrics import (
        accuracy_score, f1_score, precision_score,
        recall_score, confusion_matrix, roc_curve
    )
    import joblib
    import json

    model = joblib.load(model_input.path)
    df = pd.read_csv(test_data.path)
    X = df.drop(columns=[target_column])
    y = df[target_column]

    predictions = model.predict(X)
    probabilities = model.predict_proba(X)

    # Log scalar metrics
    acc = accuracy_score(y, predictions)
    f1 = f1_score(y, predictions, average="weighted")
    prec = precision_score(y, predictions, average="weighted")
    rec = recall_score(y, predictions, average="weighted")

    metrics.log_metric("accuracy", acc)
    metrics.log_metric("f1_score", f1)
    metrics.log_metric("precision", prec)
    metrics.log_metric("recall", rec)

    # Log confusion matrix for visualization in the UI
    labels = sorted(y.unique().tolist())
    cm = confusion_matrix(y, predictions, labels=labels).tolist()
    classification_metrics.log_confusion_matrix(
        categories=[str(l) for l in labels],
        matrix=cm,
    )

    # Log ROC curve for binary classification
    if len(labels) == 2:
        fpr, tpr, thresholds = roc_curve(y, probabilities[:, 1])
        classification_metrics.log_roc_curve(
            fpr=fpr.tolist(),
            tpr=tpr.tolist(),
            threshold=thresholds.tolist(),
        )

    passes = acc >= accuracy_threshold
    print(f"Accuracy: {acc:.4f} (threshold: {accuracy_threshold})")
    print(f"Result: {'PASS' if passes else 'FAIL'}")

    return passes
```

## Testing Components Locally

Always test components locally before running them in a pipeline. Here is how.

```python
# tests/test_components.py
import pytest
import pandas as pd
import tempfile
import os

def test_validate_data_component():
    """Test the data validation component locally."""
    from ml_components.data_validation import validate_data

    # Create test data
    df = pd.DataFrame({
        "feature_a": range(2000),
        "feature_b": [1.0] * 2000,
        "label": [0, 1] * 1000,
    })

    with tempfile.TemporaryDirectory() as tmpdir:
        # Write test input
        input_path = os.path.join(tmpdir, "input.csv")
        df.to_csv(input_path, index=False)

        # Create mock artifact objects
        class MockArtifact:
            def __init__(self, path):
                self.path = path

        class MockMetrics:
            def __init__(self):
                self.metrics = {}
            def log_metric(self, name, value):
                self.metrics[name] = value

        input_artifact = MockArtifact(input_path)
        output_artifact = MockArtifact(os.path.join(tmpdir, "report.json"))
        metrics = MockMetrics()

        # Run the component function directly
        result = validate_data.python_func(
            input_data=input_artifact,
            validation_report=output_artifact,
            metrics=metrics,
            min_rows=1000,
            max_null_rate=0.05,
        )

        assert result == True
        assert metrics.metrics["total_rows"] == 2000

def test_validate_data_fails_on_small_dataset():
    """Verify validation fails when dataset is too small."""
    df = pd.DataFrame({"feature_a": range(100), "label": [0, 1] * 50})

    with tempfile.TemporaryDirectory() as tmpdir:
        input_path = os.path.join(tmpdir, "input.csv")
        df.to_csv(input_path, index=False)

        class MockArtifact:
            def __init__(self, path):
                self.path = path
        class MockMetrics:
            def __init__(self):
                self.metrics = {}
            def log_metric(self, name, value):
                self.metrics[name] = value

        from ml_components.data_validation import validate_data
        result = validate_data.python_func(
            input_data=MockArtifact(input_path),
            validation_report=MockArtifact(os.path.join(tmpdir, "report.json")),
            metrics=MockMetrics(),
            min_rows=1000,
        )

        assert result == False
```

## Assembling Components into a Pipeline

Here is how all the components come together in a pipeline definition.

```python
# pipeline.py
from kfp.v2 import dsl, compiler
from ml_components import (
    validate_data,
    compute_features,
    train_xgboost_model,
    evaluate_classification_model,
    deploy_to_endpoint,
)

@dsl.pipeline(
    name="ml-training-pipeline",
    description="End-to-end ML training pipeline with custom components"
)
def training_pipeline(
    project_id: str,
    dataset_uri: str,
    endpoint_id: str,
):
    # Validate the input data
    validation = validate_data(
        input_data=dataset_uri,
        min_rows=5000,
    )

    # Only proceed if validation passes
    with dsl.Condition(validation.output == True):
        features = compute_features(
            validated_data=validation.outputs["validation_report"],
        )

        model = train_xgboost_model(
            train_data=features.outputs["training_features"],
            n_estimators=200,
            learning_rate=0.05,
        )

        evaluation = evaluate_classification_model(
            model_input=model.outputs["model_output"],
            test_data=features.outputs["test_features"],
            accuracy_threshold=0.85,
        )

        with dsl.Condition(evaluation.output == True):
            deploy_to_endpoint(
                model=model.outputs["model_output"],
                endpoint_id=endpoint_id,
            )

# Compile the pipeline
compiler.Compiler().compile(
    pipeline_func=training_pipeline,
    package_path="training_pipeline.json",
)
```

## Wrapping Up

Building custom Kubeflow Pipeline components for Vertex AI is about finding the right balance between simplicity and reusability. Start with lightweight Python components for quick iteration, move to containerized components when you need system dependencies or non-Python tools, and package your components as a library when you want to share them across teams. Always test components locally before running them in a pipeline - it saves time and debugging headaches. The investment in well-structured, tested components pays off every time you need to build a new pipeline.
