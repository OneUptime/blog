# Use AutoML in Azure Machine Learning to Find the Best Classification Model

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Machine Learning, AutoML, Classification, Data Science, Model Selection

Description: Use Azure Machine Learning AutoML to automatically discover the best classification model for your dataset without manually testing dozens of algorithms.

---

Choosing the right machine learning algorithm for a classification problem involves testing multiple algorithms, tuning hyperparameters, and comparing results. This process can take days or weeks of manual experimentation. Azure Machine Learning AutoML automates this entire workflow. You give it your data and tell it the target column, and it automatically tries dozens of algorithm and hyperparameter combinations, evaluates them using cross-validation, and tells you which one performs best. In this post, I will show you how to run an AutoML classification job from start to finish.

## How AutoML Works Under the Hood

When you submit an AutoML classification job, Azure ML does the following:

1. **Data analysis**: It examines your dataset to understand column types, detect missing values, and identify potential issues.
2. **Feature engineering**: It automatically generates features like one-hot encoding for categorical variables, date-part extraction for datetime columns, and text featurization for string columns.
3. **Algorithm selection**: It runs multiple classification algorithms including LogisticRegression, RandomForest, GradientBoosting, XGBoost, LightGBM, and more.
4. **Hyperparameter tuning**: For each algorithm, it tests multiple hyperparameter configurations using techniques like Bayesian optimization.
5. **Model evaluation**: Each model is evaluated using cross-validation on the metric you specify (accuracy, AUC, F1, etc.).
6. **Ensemble creation**: It creates ensemble models that combine the best individual models for even better performance.

The whole process runs in parallel on your compute cluster, which makes it much faster than running sequentially.

## Prerequisites

You need:
- An Azure ML workspace
- A compute cluster or compute instance. Use a compute cluster if you want parallel trials.
- A dataset registered in your workspace or a local file

```bash
# Install the required packages

pip install azure-ai-ml azure-identity azureml-mlflow mlflow
```

## Step 1: Connect to Your Workspace

```python
from azure.ai.ml import MLClient, automl, Input
from azure.ai.ml.automl import ClassificationModels
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
```

## Step 2: Prepare Your Data

AutoML works with tabular data through MLTable inputs. An MLTable can reference CSV or Parquet files and tells Azure ML how to load them. For this example, let us use a customer churn dataset where we want to predict whether a customer will leave.

Create a folder named `./data/customer_churn_mltable` that contains `customer_churn.csv` and an `MLTable` file like this:

```yaml
$schema: https://azuremlschemas.azureedge.net/latest/MLTable.schema.json
paths:
  - file: ./customer_churn.csv
transformations:
  - read_delimited:
      delimiter: ','
      encoding: utf8
```

```python
from azure.ai.ml.entities import Data

# Register a local MLTable with Azure ML
data_asset = Data(
    name="customer-churn-data",
    version="1",
    description="Customer churn dataset for classification",
    path="./data/customer_churn_mltable",  # Folder containing MLTable and CSV
    type=AssetTypes.MLTABLE
)

# Upload and register the dataset
registered_data = ml_client.data.create_or_update(data_asset)
print(f"Dataset registered: {registered_data.name} v{registered_data.version}")
```

Your CSV should look something like this:

| tenure | monthly_charges | total_charges | contract_type | payment_method | churn |
|--------|----------------|---------------|---------------|----------------|-------|
| 12 | 29.85 | 358.20 | Month-to-month | Credit card | No |
| 45 | 89.10 | 4011.50 | Two year | Bank transfer | No |
| 3 | 75.45 | 226.35 | Month-to-month | Electronic check | Yes |

## Step 3: Configure the AutoML Job

```python
# Create the AutoML classification job
classification_job = automl.classification(
    # Compute target - use a cluster for parallel execution
    compute="cpu-cluster",

    # Training data configuration
    training_data=Input(
        type=AssetTypes.MLTABLE,
        path=f"azureml:{registered_data.name}:{registered_data.version}"
    ),
    target_column_name="churn",  # The column we want to predict

    # Primary metric to optimize
    primary_metric="AUC_weighted",

    # Limits to control cost and duration
    n_cross_validations=5,  # 5-fold cross-validation

    # Additional settings
    enable_model_explainability=True,  # Generate feature importance
)

# Set limits on the AutoML run
classification_job.set_limits(
    timeout_minutes=120,          # Total job timeout
    trial_timeout_minutes=20,     # Max time per individual model trial
    max_trials=50,                # Maximum number of models to try
    max_concurrent_trials=4,      # Run 4 trials in parallel
    enable_early_termination=True # Stop early if no improvement
)

# Specify which algorithms to try (or let AutoML decide)
classification_job.set_training(
    allowed_training_algorithms=[
        ClassificationModels.LOGISTIC_REGRESSION,
        ClassificationModels.RANDOM_FOREST,
        ClassificationModels.GRADIENT_BOOSTING,
        ClassificationModels.LIGHT_GBM,
        ClassificationModels.XG_BOOST_CLASSIFIER
    ],
    enable_vote_ensemble=True,    # Create a voting ensemble of top models
    enable_stack_ensemble=True    # Create a stacking ensemble
)
```

### Choosing the Right Primary Metric

The primary metric determines which model AutoML considers "best." Common choices for classification:

- **AUC_weighted**: Best for imbalanced datasets. Measures the model's ability to distinguish between classes regardless of threshold.
- **accuracy**: Simple percentage of correct predictions. Works well when classes are balanced.
- **f1_score_weighted**: Balances precision and recall. Good when false positives and false negatives both matter.
- **precision_score_weighted**: When false positives are more costly (spam detection, fraud).
- **recall_score_weighted**: When false negatives are more costly (medical screening, security).

## Step 4: Submit the Job

```python
# Submit the AutoML job
submitted_job = ml_client.jobs.create_or_update(classification_job)
print(f"AutoML job submitted. Name: {submitted_job.name}")
print(f"Studio URL: {submitted_job.studio_url}")

# Optionally wait for completion
ml_client.jobs.stream(submitted_job.name)
```

The Studio URL takes you to a visual dashboard where you can watch the progress in real time. You will see each model trial appear as it completes, with its metric score and training time.

## Step 5: Analyze the Results

Once the job completes, retrieve the results to see which model won.

```python
import mlflow
from mlflow.tracking.client import MlflowClient

# Point MLflow at your Azure ML workspace
mlflow_tracking_uri = ml_client.workspaces.get(
    name=ml_client.workspace_name
).mlflow_tracking_uri
mlflow.set_tracking_uri(mlflow_tracking_uri)
mlflow_client = MlflowClient()

# Get the AutoML parent run and the best child run selected by AutoML
parent_run = mlflow_client.get_run(submitted_job.name)
best_child_run_id = parent_run.data.tags["automl_best_child_run_id"]
best_run = mlflow_client.get_run(best_child_run_id)

# List child runs (individual model trials) sorted by the primary metric
child_runs = mlflow_client.search_runs(
    experiment_ids=[parent_run.info.experiment_id],
    filter_string=f"tags.mlflow.parentRunId = '{submitted_job.name}'",
    order_by=["metrics.AUC_weighted DESC"],
    max_results=5,
)

print("Top 5 models:")
for run in child_runs:
    algorithm = run.data.tags.get("automl_algorithm", run.info.run_name)
    score = run.data.metrics.get("AUC_weighted", "N/A")
    print(f"  {algorithm}: AUC = {score}")
```

A typical output might look like:

```text
Top 5 models:
  VotingEnsemble: AUC = 0.9234
  StackEnsemble: AUC = 0.9218
  LightGBM: AUC = 0.9187
  XGBoostClassifier: AUC = 0.9156
  GradientBoosting: AUC = 0.9102
```

## Step 6: Explore Model Explainability

If you enabled model explainability, AutoML generates feature importance scores showing which features had the most influence on predictions.

In Azure ML Studio, navigate to your AutoML job, select the best model, and click on the "Explanations" tab. You will see:

- **Global feature importance**: Which features matter most across the entire dataset.
- **Individual predictions**: For specific data points, which features pushed the prediction toward one class or the other.

This information is critical for building trust in the model and understanding whether it is learning meaningful patterns or just noise.

## Step 7: Register and Deploy the Best Model

```python
# Register the best model
from azure.ai.ml.entities import Model

best_model = Model(
    path=f"azureml://jobs/{best_run.info.run_id}/outputs/artifacts/outputs/mlflow-model",
    name="customer-churn-classifier",
    description="AutoML best model for customer churn prediction",
    type=AssetTypes.MLFLOW_MODEL  # AutoML outputs MLflow format
)
registered_model = ml_client.models.create_or_update(best_model)
print(f"Model registered: {registered_model.name} v{registered_model.version}")
```

Since AutoML outputs models in MLflow format, you can deploy them directly as real-time endpoints:

```python
from azure.ai.ml.entities import ManagedOnlineEndpoint, ManagedOnlineDeployment
import uuid

endpoint_name = f"churn-prediction-{uuid.uuid4().hex[:8]}"

# Create an endpoint
endpoint = ManagedOnlineEndpoint(
    name=endpoint_name,
    description="Customer churn prediction service"
)
ml_client.online_endpoints.begin_create_or_update(endpoint).result()

# Deploy the model
deployment = ManagedOnlineDeployment(
    name="automl-best",
    endpoint_name=endpoint_name,
    model=registered_model.id,
    instance_type="Standard_DS3_v2",
    instance_count=1
)
ml_client.online_deployments.begin_create_or_update(deployment).result()

# Send all endpoint traffic to this deployment
endpoint.traffic = {"automl-best": 100}
ml_client.online_endpoints.begin_create_or_update(endpoint).result()
```

## Tips for Getting Better AutoML Results

**Give it clean data.** AutoML handles missing values and encoding, but garbage in still means garbage out. Remove obviously incorrect data and fix known issues before submitting.

**Increase trial count for complex datasets.** The default 50 trials might not be enough for datasets with many features. For important production models, set max_trials to 100 or more.

**Use cross-validation.** Always use cross-validation (at least 5 folds) rather than a simple train/test split. This gives you a more reliable estimate of model performance.

**Check for data leakage.** If your model gets suspiciously high scores (99%+ accuracy), look for features that directly reveal the target variable. This is the most common mistake in ML.

**Compare against a baseline.** Before running AutoML, check what the majority-class baseline accuracy is. If 95% of your data is one class, a model that always predicts that class gets 95% accuracy without learning anything useful.

## Wrapping Up

AutoML removes the tedious parts of model selection and hyperparameter tuning, letting you focus on the harder problems like data quality, feature engineering, and deployment. It is not a magic button - you still need to understand your data and validate the results - but it can save days of manual experimentation. Start with a small dataset to get familiar with the workflow, then apply it to your production classification problems. The combination of AutoML's automation and Azure ML's experiment tracking gives you a solid foundation for building reliable ML systems.
