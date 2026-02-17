# How to Use Vertex AI Pipelines to Automate Your ML Training Workflow End-to-End

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Vertex AI, ML Pipelines, MLOps, Kubeflow

Description: Learn how to build and run automated ML training pipelines on Vertex AI using the Kubeflow Pipelines SDK with practical examples.

---

If you have ever trained a model manually - downloading data, preprocessing it, training, evaluating, and then deploying - you know how tedious and error-prone it gets. Every step depends on the previous one, and if something goes wrong midway, you start over. Vertex AI Pipelines solves this by letting you define your entire ML workflow as a directed acyclic graph (DAG) where each step is an independent, containerized component. If a step fails, you fix it and rerun just that step, not the whole pipeline.

In this guide, I will show you how to build, compile, and run a complete ML pipeline on Vertex AI.

## Understanding Pipeline Components

A Vertex AI pipeline is built from components. Each component is a self-contained unit that takes inputs and produces outputs. Think of them as functions, but each one runs in its own container.

Vertex AI Pipelines uses the Kubeflow Pipelines SDK v2, so you define components using Python decorators.

First, install the required packages:

```bash
# Install Kubeflow Pipelines SDK and Vertex AI SDK
pip install kfp google-cloud-aiplatform google-cloud-pipeline-components
```

## Building Pipeline Components

Let us build a pipeline that loads data, preprocesses it, trains a model, and evaluates it.

Here is the data loading component:

```python
# components.py
# Define pipeline components as Python functions

from kfp import dsl
from kfp.dsl import Output, Input, Dataset, Model, Metrics

@dsl.component(
    base_image='python:3.10',
    packages_to_install=['pandas', 'google-cloud-bigquery', 'db-dtypes']
)
def load_data(
    project_id: str,
    query: str,
    output_dataset: Output[Dataset],
):
    """Load data from BigQuery and save as a CSV file."""
    from google.cloud import bigquery
    import pandas as pd

    # Query BigQuery for training data
    client = bigquery.Client(project=project_id)
    df = client.query(query).to_dataframe()

    # Save to the output artifact path
    df.to_csv(output_dataset.path, index=False)
    print(f"Loaded {len(df)} rows from BigQuery")
```

Next, the preprocessing component:

```python
@dsl.component(
    base_image='python:3.10',
    packages_to_install=['pandas', 'scikit-learn']
)
def preprocess_data(
    input_dataset: Input[Dataset],
    train_dataset: Output[Dataset],
    test_dataset: Output[Dataset],
    test_size: float = 0.2,
):
    """Split data into train and test sets and apply preprocessing."""
    import pandas as pd
    from sklearn.model_selection import train_test_split
    from sklearn.preprocessing import StandardScaler

    # Read the input dataset
    df = pd.read_csv(input_dataset.path)

    # Separate features and target
    X = df.drop('target', axis=1)
    y = df['target']

    # Split the data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=42
    )

    # Scale the features
    scaler = StandardScaler()
    X_train_scaled = pd.DataFrame(scaler.fit_transform(X_train), columns=X.columns)
    X_test_scaled = pd.DataFrame(scaler.transform(X_test), columns=X.columns)

    # Combine features and target back together
    train_df = pd.concat([X_train_scaled, y_train.reset_index(drop=True)], axis=1)
    test_df = pd.concat([X_test_scaled, y_test.reset_index(drop=True)], axis=1)

    # Save outputs
    train_df.to_csv(train_dataset.path, index=False)
    test_df.to_csv(test_dataset.path, index=False)

    print(f"Train set: {len(train_df)} rows, Test set: {len(test_df)} rows")
```

The training component:

```python
@dsl.component(
    base_image='python:3.10',
    packages_to_install=['pandas', 'scikit-learn', 'joblib']
)
def train_model(
    train_dataset: Input[Dataset],
    model_artifact: Output[Model],
    n_estimators: int = 100,
    max_depth: int = 10,
):
    """Train a Random Forest classifier."""
    import pandas as pd
    from sklearn.ensemble import RandomForestClassifier
    import joblib

    # Load training data
    df = pd.read_csv(train_dataset.path)
    X = df.drop('target', axis=1)
    y = df['target']

    # Train the model
    model = RandomForestClassifier(
        n_estimators=n_estimators,
        max_depth=max_depth,
        random_state=42
    )
    model.fit(X, y)

    # Save the model
    joblib.dump(model, model_artifact.path)
    print(f"Model trained with {n_estimators} estimators")
```

And the evaluation component:

```python
@dsl.component(
    base_image='python:3.10',
    packages_to_install=['pandas', 'scikit-learn', 'joblib']
)
def evaluate_model(
    test_dataset: Input[Dataset],
    model_artifact: Input[Model],
    metrics: Output[Metrics],
):
    """Evaluate the trained model on the test set."""
    import pandas as pd
    from sklearn.metrics import accuracy_score, f1_score
    import joblib

    # Load test data and model
    df = pd.read_csv(test_dataset.path)
    X = df.drop('target', axis=1)
    y = df['target']
    model = joblib.load(model_artifact.path)

    # Make predictions and compute metrics
    predictions = model.predict(X)
    accuracy = accuracy_score(y, predictions)
    f1 = f1_score(y, predictions, average='weighted')

    # Log metrics to the pipeline UI
    metrics.log_metric('accuracy', accuracy)
    metrics.log_metric('f1_score', f1)

    print(f"Accuracy: {accuracy:.4f}, F1 Score: {f1:.4f}")
```

## Defining the Pipeline

Now connect the components into a pipeline:

```python
# pipeline.py
# Define the ML pipeline connecting all components

from kfp import dsl

@dsl.pipeline(
    name='ml-training-pipeline',
    description='End-to-end ML training pipeline',
)
def ml_pipeline(
    project_id: str,
    query: str = "SELECT * FROM `your_dataset.training_data`",
    test_size: float = 0.2,
    n_estimators: int = 100,
    max_depth: int = 10,
):
    # Step 1: Load data from BigQuery
    load_task = load_data(
        project_id=project_id,
        query=query,
    )

    # Step 2: Preprocess and split the data
    preprocess_task = preprocess_data(
        input_dataset=load_task.outputs['output_dataset'],
        test_size=test_size,
    )

    # Step 3: Train the model
    train_task = train_model(
        train_dataset=preprocess_task.outputs['train_dataset'],
        n_estimators=n_estimators,
        max_depth=max_depth,
    )

    # Step 4: Evaluate the model
    evaluate_task = evaluate_model(
        test_dataset=preprocess_task.outputs['test_dataset'],
        model_artifact=train_task.outputs['model_artifact'],
    )
```

## Compiling and Running the Pipeline

Compile the pipeline to a JSON file and submit it to Vertex AI:

```python
# run_pipeline.py
# Compile and submit the pipeline to Vertex AI

from kfp import compiler
from google.cloud import aiplatform

# Compile the pipeline to a JSON spec file
compiler.Compiler().compile(
    pipeline_func=ml_pipeline,
    package_path='ml_pipeline.json',
)

# Initialize Vertex AI
aiplatform.init(
    project='your-project-id',
    location='us-central1',
)

# Create and run the pipeline
pipeline_job = aiplatform.PipelineJob(
    display_name='ml-training-run',
    template_path='ml_pipeline.json',
    pipeline_root='gs://your-bucket/pipeline-root/',
    parameter_values={
        'project_id': 'your-project-id',
        'query': 'SELECT * FROM `ml_dataset.training_data`',
        'n_estimators': 200,
        'max_depth': 15,
    },
)

# Submit the pipeline job
pipeline_job.submit()
print(f"Pipeline job submitted: {pipeline_job.resource_name}")
```

## Scheduling Pipelines

You can schedule pipelines to run automatically on a recurring basis:

```python
# schedule_pipeline.py
# Schedule the pipeline to run weekly

from google.cloud import aiplatform

aiplatform.init(project='your-project-id', location='us-central1')

# Create a schedule for the pipeline
schedule = aiplatform.PipelineJob(
    display_name='weekly-training',
    template_path='ml_pipeline.json',
    pipeline_root='gs://your-bucket/pipeline-root/',
    parameter_values={
        'project_id': 'your-project-id',
    },
)

# Schedule to run every Monday at 6 AM UTC
schedule.create_schedule(
    display_name='weekly-training-schedule',
    cron='0 6 * * 1',
)
```

## Adding Conditional Logic

Sometimes you want to deploy a model only if it meets a quality threshold. You can use pipeline conditions for this:

```python
@dsl.pipeline(name='conditional-pipeline')
def conditional_pipeline(project_id: str, accuracy_threshold: float = 0.85):
    load_task = load_data(project_id=project_id, query="SELECT * FROM training_data")
    preprocess_task = preprocess_data(input_dataset=load_task.outputs['output_dataset'])
    train_task = train_model(train_dataset=preprocess_task.outputs['train_dataset'])
    eval_task = evaluate_model(
        test_dataset=preprocess_task.outputs['test_dataset'],
        model_artifact=train_task.outputs['model_artifact'],
    )

    # Only deploy if accuracy exceeds threshold
    with dsl.Condition(
        eval_task.outputs['metrics'].metadata['accuracy'] >= accuracy_threshold,
        name='deploy-if-accurate'
    ):
        deploy_task = deploy_model(
            model_artifact=train_task.outputs['model_artifact'],
        )
```

## Visualizing Your Pipeline

The pipeline DAG is visible in the Vertex AI Console under the Pipelines section. Each component shows up as a node, and you can click on any node to see its inputs, outputs, logs, and execution time. This visualization makes it easy to understand where failures happened and how data flows through the pipeline.

## Best Practices

Keep components small and focused. Each component should do one thing well. This makes them reusable across different pipelines.

Use caching. Vertex AI automatically caches component outputs. If you rerun a pipeline with the same inputs and code, cached steps are skipped. This saves time and money during development.

Version your pipeline definitions. Treat pipeline JSON files like code - check them into version control and tag releases.

Test components locally before running them on Vertex AI. You can call component functions directly in a notebook to verify they work before submitting an expensive cloud job.

## Wrapping Up

Vertex AI Pipelines transforms your ad-hoc ML workflows into reproducible, automated processes. By breaking your workflow into components, you get reusability, caching, and clear visibility into each step. Start with a simple pipeline of three or four components, get that working, and then add complexity like conditional deployment and scheduling as your needs evolve.
