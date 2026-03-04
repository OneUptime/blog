# How to Train and Deploy a Model Using Azure Machine Learning Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Machine Learning, Pipelines, MLOps, Model Training, Deployment, Python

Description: Build an end-to-end Azure Machine Learning pipeline that handles data preparation, model training, evaluation, and deployment as a real-time endpoint.

---

Azure Machine Learning pipelines let you build reproducible, automated workflows that string together the steps of your ML process: data preparation, feature engineering, training, evaluation, and deployment. Instead of running Jupyter notebooks manually, you define each step as a component and connect them into a pipeline that can be triggered on a schedule, from a CI/CD system, or on demand. In this post, I will build an end-to-end pipeline from scratch.

## Why Use Pipelines?

Running ML workflows manually in notebooks is fine for experimentation, but it breaks down in production for several reasons:

- Steps run in sequence with no parallelism.
- There is no built-in caching - if a step fails partway through, you start over.
- Reproducing results requires remembering the exact sequence of cells you ran.
- Handing off a workflow to another team member means sharing a notebook with "run cells 1-15, then skip 16, then run 17-23."

Pipelines solve all of these problems. Each step is a self-contained component with defined inputs, outputs, and compute requirements. Azure ML tracks the lineage of every run.

## Prerequisites

You need an Azure ML workspace (see my previous post on creating one). Install the SDK:

```bash
# Install the Azure ML SDK v2
pip install azure-ai-ml azure-identity
```

## Step 1: Define the Data Preparation Component

Each pipeline step is defined as a component. Let us start with data preparation. Create a Python script that loads raw data and splits it into training and test sets.

Create a file called `prep_data.py`:

```python
import argparse
import pandas as pd
from sklearn.model_selection import train_test_split

def main():
    # Parse command-line arguments (inputs and outputs defined by the component)
    parser = argparse.ArgumentParser()
    parser.add_argument("--input_data", type=str, help="Path to raw input data")
    parser.add_argument("--train_data", type=str, help="Output path for training data")
    parser.add_argument("--test_data", type=str, help="Output path for test data")
    parser.add_argument("--test_size", type=float, default=0.2, help="Fraction for test set")
    args = parser.parse_args()

    # Load the raw data
    print(f"Loading data from {args.input_data}")
    df = pd.read_csv(args.input_data + "/data.csv")
    print(f"Loaded {len(df)} rows with columns: {list(df.columns)}")

    # Basic cleaning
    df = df.dropna()
    print(f"After dropping nulls: {len(df)} rows")

    # Split into train and test
    train_df, test_df = train_test_split(df, test_size=args.test_size, random_state=42)
    print(f"Train set: {len(train_df)} rows, Test set: {len(test_df)} rows")

    # Save the splits
    train_df.to_csv(args.train_data + "/train.csv", index=False)
    test_df.to_csv(args.test_data + "/test.csv", index=False)

if __name__ == "__main__":
    main()
```

## Step 2: Define the Training Component

Create `train_model.py`:

```python
import argparse
import pandas as pd
import joblib
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.metrics import accuracy_score
import mlflow

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--train_data", type=str, help="Path to training data")
    parser.add_argument("--model_output", type=str, help="Output path for trained model")
    parser.add_argument("--n_estimators", type=int, default=100, help="Number of boosting stages")
    parser.add_argument("--learning_rate", type=float, default=0.1, help="Learning rate")
    args = parser.parse_args()

    # Enable MLflow autologging to track parameters and metrics automatically
    mlflow.autolog()

    # Load training data
    train_df = pd.read_csv(args.train_data + "/train.csv")

    # Separate features and target (assuming last column is the target)
    X_train = train_df.iloc[:, :-1]
    y_train = train_df.iloc[:, -1]

    # Train the model
    print(f"Training GradientBoostingClassifier with {args.n_estimators} estimators")
    model = GradientBoostingClassifier(
        n_estimators=args.n_estimators,
        learning_rate=args.learning_rate,
        random_state=42
    )
    model.fit(X_train, y_train)

    # Calculate training accuracy
    train_accuracy = accuracy_score(y_train, model.predict(X_train))
    print(f"Training accuracy: {train_accuracy:.4f}")

    # Save the model
    joblib.dump(model, args.model_output + "/model.pkl")
    print(f"Model saved to {args.model_output}/model.pkl")

if __name__ == "__main__":
    main()
```

## Step 3: Define the Evaluation Component

Create `evaluate_model.py`:

```python
import argparse
import pandas as pd
import joblib
from sklearn.metrics import accuracy_score, classification_report
import json

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model_input", type=str, help="Path to trained model")
    parser.add_argument("--test_data", type=str, help="Path to test data")
    parser.add_argument("--evaluation_output", type=str, help="Output path for evaluation results")
    args = parser.parse_args()

    # Load the model and test data
    model = joblib.load(args.model_input + "/model.pkl")
    test_df = pd.read_csv(args.test_data + "/test.csv")

    X_test = test_df.iloc[:, :-1]
    y_test = test_df.iloc[:, -1]

    # Generate predictions
    predictions = model.predict(X_test)

    # Calculate metrics
    accuracy = accuracy_score(y_test, predictions)
    report = classification_report(y_test, predictions, output_dict=True)

    print(f"Test accuracy: {accuracy:.4f}")
    print(classification_report(y_test, predictions))

    # Save evaluation results
    results = {
        "accuracy": accuracy,
        "classification_report": report
    }

    with open(args.evaluation_output + "/metrics.json", "w") as f:
        json.dump(results, f, indent=2)

if __name__ == "__main__":
    main()
```

## Step 4: Register Components and Build the Pipeline

Now connect these scripts into a pipeline using the Azure ML SDK v2.

```python
from azure.ai.ml import MLClient, Input, Output, command, dsl
from azure.ai.ml.constants import AssetTypes
from azure.identity import DefaultAzureCredential

# Connect to the workspace
credential = DefaultAzureCredential()
ml_client = MLClient(
    credential=credential,
    subscription_id="your-subscription-id",
    resource_group_name="ml-project-rg",
    workspace_name="ml-workspace-production"
)

# Define the data preparation component
prep_component = command(
    name="prep_data",
    display_name="Prepare Data",
    description="Load raw data, clean it, and split into train/test sets",
    inputs={
        "input_data": Input(type=AssetTypes.URI_FOLDER),
        "test_size": Input(type="number", default=0.2)
    },
    outputs={
        "train_data": Output(type=AssetTypes.URI_FOLDER),
        "test_data": Output(type=AssetTypes.URI_FOLDER)
    },
    code="./components/prep/",       # Directory containing prep_data.py
    command="python prep_data.py --input_data ${{inputs.input_data}} "
            "--train_data ${{outputs.train_data}} --test_data ${{outputs.test_data}} "
            "--test_size ${{inputs.test_size}}",
    environment="azureml:AzureML-sklearn-1.0-ubuntu20.04-py38-cpu:1"
)

# Define the training component
train_component = command(
    name="train_model",
    display_name="Train Model",
    description="Train a GradientBoosting classifier",
    inputs={
        "train_data": Input(type=AssetTypes.URI_FOLDER),
        "n_estimators": Input(type="integer", default=100),
        "learning_rate": Input(type="number", default=0.1)
    },
    outputs={
        "model_output": Output(type=AssetTypes.URI_FOLDER)
    },
    code="./components/train/",
    command="python train_model.py --train_data ${{inputs.train_data}} "
            "--model_output ${{outputs.model_output}} "
            "--n_estimators ${{inputs.n_estimators}} "
            "--learning_rate ${{inputs.learning_rate}}",
    environment="azureml:AzureML-sklearn-1.0-ubuntu20.04-py38-cpu:1"
)

# Define the evaluation component
eval_component = command(
    name="evaluate_model",
    display_name="Evaluate Model",
    description="Evaluate the trained model on test data",
    inputs={
        "model_input": Input(type=AssetTypes.URI_FOLDER),
        "test_data": Input(type=AssetTypes.URI_FOLDER)
    },
    outputs={
        "evaluation_output": Output(type=AssetTypes.URI_FOLDER)
    },
    code="./components/eval/",
    command="python evaluate_model.py --model_input ${{inputs.model_input}} "
            "--test_data ${{inputs.test_data}} "
            "--evaluation_output ${{outputs.evaluation_output}}",
    environment="azureml:AzureML-sklearn-1.0-ubuntu20.04-py38-cpu:1"
)
```

## Step 5: Compose the Pipeline

Use the `@dsl.pipeline` decorator to connect the components:

```python
@dsl.pipeline(
    name="training_pipeline",
    description="End-to-end ML pipeline: prep, train, evaluate",
    compute="cpu-cluster"  # Default compute for all steps
)
def training_pipeline(raw_data, test_size=0.2, n_estimators=100, learning_rate=0.1):
    """
    Pipeline that prepares data, trains a model, and evaluates it.
    Each step's outputs are automatically connected to the next step's inputs.
    """
    # Step 1: Prepare data
    prep_step = prep_component(
        input_data=raw_data,
        test_size=test_size
    )

    # Step 2: Train model (depends on prep step's output)
    train_step = train_component(
        train_data=prep_step.outputs.train_data,
        n_estimators=n_estimators,
        learning_rate=learning_rate
    )

    # Step 3: Evaluate model (depends on both prep and train outputs)
    eval_step = eval_component(
        model_input=train_step.outputs.model_output,
        test_data=prep_step.outputs.test_data
    )

    return {
        "model": train_step.outputs.model_output,
        "metrics": eval_step.outputs.evaluation_output
    }
```

## Step 6: Submit and Monitor the Pipeline

```python
# Create a pipeline instance with specific inputs
pipeline_job = training_pipeline(
    raw_data=Input(
        type=AssetTypes.URI_FOLDER,
        path="azureml:my-dataset:1"  # Reference a registered dataset
    ),
    n_estimators=200,
    learning_rate=0.05
)

# Submit the pipeline job
submitted_job = ml_client.jobs.create_or_update(pipeline_job)
print(f"Pipeline submitted. Job name: {submitted_job.name}")
print(f"Studio URL: {submitted_job.studio_url}")

# Wait for completion (optional)
ml_client.jobs.stream(submitted_job.name)
```

The pipeline visualizes in Azure ML Studio as a directed graph showing each step, its status, and the data flowing between them.

## Step 7: Deploy the Model

After training, register and deploy the model as a real-time endpoint:

```python
from azure.ai.ml.entities import Model, ManagedOnlineEndpoint, ManagedOnlineDeployment

# Register the model from the pipeline output
model = Model(
    path=f"azureml://jobs/{submitted_job.name}/outputs/model",
    name="my-classifier",
    description="GradientBoosting classifier trained via pipeline",
    type=AssetTypes.CUSTOM_MODEL
)
registered_model = ml_client.models.create_or_update(model)

# Create an endpoint
endpoint = ManagedOnlineEndpoint(
    name="my-classifier-endpoint",
    description="Real-time prediction endpoint"
)
ml_client.online_endpoints.begin_create_or_update(endpoint).result()

# Deploy the model to the endpoint
deployment = ManagedOnlineDeployment(
    name="blue",
    endpoint_name="my-classifier-endpoint",
    model=registered_model.id,
    instance_type="Standard_DS3_v2",
    instance_count=1
)
ml_client.online_deployments.begin_create_or_update(deployment).result()
```

## Wrapping Up

Azure ML pipelines bring structure and reproducibility to your ML workflows. Each component is versioned, each run is tracked, and the data lineage is maintained automatically. Start by converting your notebook cells into individual component scripts, connect them with the pipeline DSL, and then iterate. Once you have a working pipeline, you can schedule it, trigger it from CI/CD, or integrate it into a larger MLOps workflow. The upfront investment in building a pipeline pays off quickly when you need to retrain models on new data or hand off your workflow to another team member.
