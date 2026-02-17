# How to Track Experiments with MLflow in Azure Machine Learning

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Machine Learning, MLflow, Experiment Tracking, MLOps, Data Science

Description: Set up MLflow experiment tracking in Azure Machine Learning to log parameters, metrics, and artifacts across all your training runs.

---

When you are experimenting with different models, hyperparameters, and feature sets, keeping track of what you tried and what worked is critical. Without proper experiment tracking, you end up with a mess of notebooks, scattered log files, and the dreaded "which model was it that got 94% accuracy last Tuesday?" question. MLflow is the standard open-source tool for experiment tracking, and Azure Machine Learning has first-class integration with it. Every Azure ML workspace comes with a built-in MLflow tracking server, so you do not need to set up any additional infrastructure.

In this post, I will show you how to use MLflow with Azure ML to track experiments, log metrics, compare runs, and manage model artifacts.

## Why MLflow in Azure ML?

Azure ML's MLflow integration gives you several advantages over running your own MLflow server:

- **Zero setup**: The tracking server is built into every workspace. No need to provision servers or databases.
- **Automatic authentication**: Azure ML handles authentication through your Azure credentials.
- **Integrated UI**: MLflow runs appear in the Azure ML Studio experiments view alongside native Azure ML runs.
- **Artifact storage**: Model artifacts and files are stored in the workspace's blob storage, which is managed and backed up.
- **Model registry**: MLflow models registered in Azure ML can be deployed directly to managed endpoints.

## Step 1: Configure MLflow to Use Azure ML

There are two ways to connect MLflow to your Azure ML workspace.

### Option A: Inside an Azure ML Compute Instance or Job

If you are running code inside Azure ML (on a compute instance or as a training job), MLflow is pre-configured. You do not need to set any environment variables. Just import MLflow and start logging.

```python
import mlflow

# When running inside Azure ML, the tracking URI is set automatically
print(f"Tracking URI: {mlflow.get_tracking_uri()}")
```

### Option B: From Your Local Machine

If you are running experiments locally and want to log to Azure ML, configure the tracking URI manually.

```python
import mlflow
from azure.ai.ml import MLClient
from azure.identity import DefaultAzureCredential

# Connect to the workspace
credential = DefaultAzureCredential()
ml_client = MLClient(
    credential=credential,
    subscription_id="your-subscription-id",
    resource_group_name="ml-project-rg",
    workspace_name="ml-workspace-production"
)

# Get the MLflow tracking URI from the workspace
tracking_uri = ml_client.workspaces.get(
    ml_client.workspace_name
).mlflow_tracking_uri

# Set the tracking URI
mlflow.set_tracking_uri(tracking_uri)
print(f"MLflow tracking URI set to: {tracking_uri}")
```

## Step 2: Create an Experiment and Log a Run

An experiment is a named container for related runs. Think of it as a project or a hypothesis you are testing.

```python
import mlflow
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, f1_score, roc_auc_score
import pandas as pd

# Set the experiment name (creates it if it does not exist)
mlflow.set_experiment("customer-churn-experiments")

# Load your data
df = pd.read_csv("data/customer_churn.csv")
X = df.drop("churn", axis=1)
y = df["churn"]
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Start a new run
with mlflow.start_run(run_name="random-forest-baseline"):
    # Define hyperparameters
    n_estimators = 100
    max_depth = 10
    min_samples_split = 5

    # Log hyperparameters
    mlflow.log_param("n_estimators", n_estimators)
    mlflow.log_param("max_depth", max_depth)
    mlflow.log_param("min_samples_split", min_samples_split)
    mlflow.log_param("model_type", "RandomForest")

    # Train the model
    model = RandomForestClassifier(
        n_estimators=n_estimators,
        max_depth=max_depth,
        min_samples_split=min_samples_split,
        random_state=42
    )
    model.fit(X_train, y_train)

    # Evaluate and log metrics
    y_pred = model.predict(X_test)
    y_proba = model.predict_proba(X_test)[:, 1]

    accuracy = accuracy_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred)
    auc = roc_auc_score(y_test, y_proba)

    mlflow.log_metric("accuracy", accuracy)
    mlflow.log_metric("f1_score", f1)
    mlflow.log_metric("auc_roc", auc)

    print(f"Accuracy: {accuracy:.4f}, F1: {f1:.4f}, AUC: {auc:.4f}")

    # Log the model itself
    mlflow.sklearn.log_model(model, "model")

    print(f"Run ID: {mlflow.active_run().info.run_id}")
```

## Step 3: Log Artifacts

Beyond parameters and metrics, you can log any file as an artifact. This is useful for saving plots, configuration files, or evaluation reports alongside your run.

```python
import matplotlib.pyplot as plt
from sklearn.metrics import confusion_matrix, ConfusionMatrixDisplay
import json

with mlflow.start_run(run_name="random-forest-with-artifacts"):
    # ... (train model as above) ...

    # Log a confusion matrix plot
    cm = confusion_matrix(y_test, y_pred)
    disp = ConfusionMatrixDisplay(confusion_matrix=cm)
    disp.plot()
    plt.title("Confusion Matrix")
    plt.savefig("confusion_matrix.png")
    plt.close()

    # Log the image as an artifact
    mlflow.log_artifact("confusion_matrix.png", artifact_path="plots")

    # Log feature importance as a JSON file
    feature_importance = dict(zip(
        X_train.columns,
        model.feature_importances_.tolist()
    ))
    with open("feature_importance.json", "w") as f:
        json.dump(feature_importance, f, indent=2)

    mlflow.log_artifact("feature_importance.json", artifact_path="analysis")

    # Log a text summary
    summary = f"Model: RandomForest\nAccuracy: {accuracy:.4f}\nF1: {f1:.4f}\nAUC: {auc:.4f}"
    mlflow.log_text(summary, "run_summary.txt")
```

## Step 4: Use Autologging

For supported frameworks, MLflow can automatically log parameters, metrics, and models without you writing any logging code. This is a huge time saver.

```python
# Enable autologging for scikit-learn
mlflow.sklearn.autolog()

with mlflow.start_run(run_name="autolog-gradient-boosting"):
    from sklearn.ensemble import GradientBoostingClassifier

    # Autolog captures all parameters, training metrics, and the model
    model = GradientBoostingClassifier(
        n_estimators=200,
        learning_rate=0.05,
        max_depth=5
    )
    model.fit(X_train, y_train)

    # Autolog also logs evaluation metrics if you call score()
    test_score = model.score(X_test, y_test)
    print(f"Test accuracy: {test_score:.4f}")
    # All parameters, metrics, and the model are logged automatically
```

MLflow supports autologging for many frameworks including scikit-learn, TensorFlow, PyTorch, XGBoost, LightGBM, and Spark.

## Step 5: Compare Runs in Azure ML Studio

Open Azure ML Studio and navigate to your workspace. Click on "Jobs" in the left sidebar and find your experiment. You will see all runs listed with their metrics.

To compare runs:

1. Select multiple runs using the checkboxes.
2. Click "Compare" in the toolbar.
3. You will see a side-by-side comparison of parameters, metrics, and charts.

The comparison view makes it easy to identify which hyperparameter changes led to improvements and which did not.

## Step 6: Query Runs Programmatically

You can also search and filter runs using the MLflow API. This is useful for building automated model selection pipelines.

```python
# Search for runs in an experiment
experiment = mlflow.get_experiment_by_name("customer-churn-experiments")

# Find the best run by AUC metric
runs = mlflow.search_runs(
    experiment_ids=[experiment.experiment_id],
    filter_string="metrics.auc_roc > 0.85",
    order_by=["metrics.auc_roc DESC"],
    max_results=5
)

print("Top 5 runs by AUC:")
for _, run in runs.iterrows():
    print(f"  Run {run['run_id'][:8]}: "
          f"AUC={run['metrics.auc_roc']:.4f}, "
          f"Model={run['params.model_type']}")
```

## Step 7: Register the Best Model

Once you have identified the best run, register its model in the Azure ML model registry for deployment.

```python
# Register the model from the best run
best_run_id = runs.iloc[0]["run_id"]

model_uri = f"runs:/{best_run_id}/model"

# Register in MLflow model registry
registered = mlflow.register_model(
    model_uri=model_uri,
    name="customer-churn-classifier"
)

print(f"Model registered: {registered.name} version {registered.version}")
```

This model can now be deployed to a managed online endpoint directly from the registry.

## Logging Metrics Over Time

For training loops (common in deep learning), log metrics at each epoch or step to see training curves.

```python
with mlflow.start_run(run_name="training-curve-demo"):
    for epoch in range(50):
        # Simulate training
        train_loss = 1.0 / (epoch + 1) + 0.01 * (50 - epoch)
        val_loss = 1.0 / (epoch + 1) + 0.02 * (50 - epoch)

        # Log metrics at each step - MLflow plots these as curves
        mlflow.log_metric("train_loss", train_loss, step=epoch)
        mlflow.log_metric("val_loss", val_loss, step=epoch)
```

In Azure ML Studio, these step-based metrics are displayed as line charts, making it easy to spot overfitting (when validation loss starts increasing while training loss continues to decrease).

## Best Practices

**Name your runs.** Use descriptive run names that tell you at a glance what the run was testing. "random-forest-depth-20-feat-selection" is much more useful than "run-47."

**Log everything.** When in doubt, log it. Storage is cheap. Trying to reproduce a result from three months ago without proper logging is expensive.

**Use tags for organization.** Tags let you categorize runs across experiments. For example, tag runs with the data version, the engineer who ran them, or the purpose (exploration vs. production candidate).

```python
mlflow.set_tag("data_version", "v2.3")
mlflow.set_tag("purpose", "hyperparameter_search")
mlflow.set_tag("engineer", "nawaz")
```

**Clean up failed runs.** Delete runs that failed due to bugs or configuration errors. They add noise to your experiment history.

## Wrapping Up

MLflow experiment tracking in Azure ML gives you a systematic way to record, compare, and reproduce your ML experiments. The zero-setup integration means you can start logging immediately, and the Azure ML Studio interface provides powerful visualization and comparison tools. Whether you are doing quick experiments on a compute instance or running large-scale hyperparameter searches across a cluster, consistent experiment tracking is what separates professional ML engineering from ad-hoc tinkering.
