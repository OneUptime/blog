# How to Register and Version Datasets in Azure Machine Learning

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Machine Learning, Datasets, Data Management, Versioning, MLOps

Description: Learn how to register, version, and manage datasets in Azure Machine Learning for reproducible experiments and reliable ML pipelines.

---

One of the most common problems in machine learning is not being able to reproduce a result because you do not know which version of the data was used. You train a model on Monday, get great results, and by Friday the underlying data has changed and you cannot figure out what happened. Azure Machine Learning's data assets (formerly called datasets) solve this by letting you register versioned snapshots of your data that are immutable once created. Every experiment run can reference a specific data version, giving you complete reproducibility.

In this post, I will cover how to create, register, version, and manage data assets in Azure Machine Learning.

## Data Asset Types

Azure ML supports three types of data assets:

- **URI File**: A reference to a single file (CSV, Parquet, JSON, etc.). The file can be in Azure Blob Storage, Azure Data Lake, or a public URL.
- **URI Folder**: A reference to a directory of files. Useful when your data is split across multiple files or when the directory structure matters.
- **MLTable**: A tabular data definition that includes schema information, transformations, and data loading logic. This is the most structured option and supports features like automatic type inference and column selection.

For most use cases, URI File and URI Folder are sufficient. MLTable adds overhead but is valuable when you need consistent data loading across different consumers.

## Step 1: Register a Dataset from a Local File

The simplest case is uploading a local file and registering it as a data asset.

```python
from azure.ai.ml import MLClient
from azure.ai.ml.entities import Data
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

# Register a local CSV file as a data asset
data_asset = Data(
    name="customer-churn-data",
    version="1",
    description="Customer churn dataset with 7,043 records and 21 features",
    path="./data/customer_churn.csv",    # Local path - will be uploaded
    type=AssetTypes.URI_FILE,
    tags={
        "source": "CRM export",
        "date_collected": "2026-01-15",
        "record_count": "7043"
    }
)

# Create the data asset (uploads the file to workspace storage)
registered_data = ml_client.data.create_or_update(data_asset)
print(f"Registered: {registered_data.name} v{registered_data.version}")
print(f"Path: {registered_data.path}")
```

## Step 2: Register a Dataset from Azure Blob Storage

If your data already lives in Azure Blob Storage, you can register it without uploading a copy. Azure ML creates a reference to the existing location.

```python
# Register a file already in Blob Storage
blob_data = Data(
    name="sales-transactions",
    version="1",
    description="Monthly sales transactions from the data warehouse",
    path="azureml://datastores/workspaceblobstore/paths/raw-data/sales_2026_01.parquet",
    type=AssetTypes.URI_FILE,
    tags={"format": "parquet", "month": "2026-01"}
)

registered_blob = ml_client.data.create_or_update(blob_data)
```

You can also register a folder:

```python
# Register an entire folder of training images
image_data = Data(
    name="product-images",
    version="1",
    description="Product catalog images organized by category",
    path="azureml://datastores/workspaceblobstore/paths/images/products/",
    type=AssetTypes.URI_FOLDER,
    tags={"image_count": "15000", "categories": "electronics,clothing,home"}
)

registered_images = ml_client.data.create_or_update(image_data)
```

## Step 3: Create a New Version

When your data changes (new records, corrections, feature additions), create a new version rather than overwriting the existing one.

```python
# Version 2 of the customer churn dataset with additional records
data_v2 = Data(
    name="customer-churn-data",          # Same name as before
    version="2",                          # New version number
    description="Customer churn dataset updated with Q1 2026 data. "
                "Now includes 8,521 records and 23 features (2 new features added).",
    path="./data/customer_churn_v2.csv",
    type=AssetTypes.URI_FILE,
    tags={
        "source": "CRM export",
        "date_collected": "2026-02-15",
        "record_count": "8521",
        "changes": "Added loyalty_score and support_tickets features"
    }
)

registered_v2 = ml_client.data.create_or_update(data_v2)
print(f"Registered: {registered_v2.name} v{registered_v2.version}")
```

Both versions coexist in the workspace. You can reference either version in your experiments.

## Step 4: List and Retrieve Versions

```python
# List all versions of a dataset
versions = ml_client.data.list(name="customer-churn-data")
print("Available versions:")
for v in versions:
    print(f"  v{v.version}: {v.description}")
    print(f"    Created: {v.creation_context.created_at}")
    print(f"    Tags: {v.tags}")

# Get a specific version
data_v1 = ml_client.data.get(name="customer-churn-data", version="1")
print(f"\nVersion 1 path: {data_v1.path}")

# Get the latest version
data_latest = ml_client.data.get(name="customer-churn-data", label="latest")
print(f"Latest version: {data_latest.version}")
```

## Step 5: Use Registered Data in Training Jobs

Reference registered data assets in your training jobs to ensure reproducibility.

```python
from azure.ai.ml import command, Input

# Create a training job that uses a specific data version
training_job = command(
    code="./training_scripts/",
    command="python train.py --data ${{inputs.training_data}}",
    inputs={
        "training_data": Input(
            type=AssetTypes.URI_FILE,
            path="azureml:customer-churn-data:2"  # Specific version
        )
    },
    environment="azureml:AzureML-sklearn-1.0-ubuntu20.04-py38-cpu:1",
    compute="cpu-training-cluster",
    display_name="Train churn model on data v2"
)

submitted_job = ml_client.jobs.create_or_update(training_job)
print(f"Job submitted: {submitted_job.name}")
```

In the training script, the data is automatically mounted or downloaded to a local path:

```python
import argparse
import pandas as pd

parser = argparse.ArgumentParser()
parser.add_argument("--data", type=str, help="Path to training data")
args = parser.parse_args()

# The data is available at the path provided by Azure ML
df = pd.read_csv(args.data)
print(f"Loaded {len(df)} records from {args.data}")
```

## Step 6: Create an MLTable for Structured Data

MLTable provides a more structured way to define tabular data with schema information.

Create a file called `MLTable`:

```yaml
type: mltable

paths:
  - file: ./customer_churn.csv

transformations:
  - read_delimited:
      delimiter: ","
      header: all_files_same_headers
      encoding: utf8
  - convert_column_types:
      - column_name: tenure
        column_type: int
      - column_name: monthly_charges
        column_type: float
      - column_name: churn
        column_type: boolean
  - drop_columns:
      - customer_id    # Remove PII column
```

Register the MLTable:

```python
# Register the MLTable data asset
mltable_data = Data(
    name="customer-churn-mltable",
    version="1",
    description="Structured customer churn dataset with schema and transformations",
    path="./data/mltable/",             # Directory containing the MLTable file
    type=AssetTypes.MLTABLE,
    tags={"schema_version": "1.0"}
)

registered_mltable = ml_client.data.create_or_update(mltable_data)
```

Loading an MLTable in your training code:

```python
import mltable

# Load the MLTable - schema and transformations are applied automatically
table = mltable.load("path/to/mltable/directory")
df = table.to_pandas_dataframe()
print(f"Columns: {list(df.columns)}")
print(f"Data types: {df.dtypes}")
```

## Step 7: Set Up Data Lineage Tracking

Azure ML automatically tracks data lineage when you use registered data assets in your jobs. In Azure ML Studio, you can:

1. Navigate to a model and see which dataset version was used to train it.
2. Navigate to a dataset version and see which experiments and models used it.
3. Trace the full lineage from raw data through processing to model deployment.

This lineage is captured automatically as long as you reference registered data assets in your job definitions.

## Best Practices for Data Management

**Use semantic versioning for data.** Version 1.0 is the initial release. Version 1.1 adds records. Version 2.0 changes the schema. Document what changed in each version's description.

**Tag everything.** Tags like `record_count`, `date_range`, `source_system`, and `schema_version` make it much easier to find the right dataset later.

**Never modify a registered version.** If you find an issue with a registered dataset, create a new version with the fix. The old version stays as is so that experiments that used it can still be reproduced.

**Archive old versions.** If a dataset version is no longer needed, archive it rather than deleting it. This preserves lineage while decluttering the workspace.

```python
# Archive an old dataset version
ml_client.data.archive(name="customer-churn-data", version="1")
```

**Use datastores for large data.** For datasets larger than a few gigabytes, store the data in Azure Blob Storage or Data Lake and register a reference rather than uploading through the SDK. This avoids long upload times and storage duplication.

**Validate data before registering.** Run basic data quality checks before creating a new version. Check for null values, duplicate rows, and schema consistency with previous versions.

```python
def validate_before_registration(filepath, expected_columns):
    """
    Run basic quality checks on a dataset before registering it.
    Helps catch issues early before they affect downstream experiments.
    """
    df = pd.read_csv(filepath)

    # Check expected columns exist
    missing = set(expected_columns) - set(df.columns)
    if missing:
        raise ValueError(f"Missing expected columns: {missing}")

    # Check for excessive nulls
    null_pct = df.isnull().mean()
    high_null = null_pct[null_pct > 0.5]
    if len(high_null) > 0:
        print(f"Warning: columns with >50% nulls: {list(high_null.index)}")

    # Check for duplicate rows
    dup_count = df.duplicated().sum()
    if dup_count > 0:
        print(f"Warning: {dup_count} duplicate rows found")

    print(f"Validation passed: {len(df)} rows, {len(df.columns)} columns")
    return True
```

## Wrapping Up

Registering and versioning datasets in Azure Machine Learning is a fundamental practice for reproducible ML. It ensures that every experiment can be traced back to the exact data it used, that data changes are tracked explicitly, and that your team can collaborate on shared datasets without confusion about which version is current. Start registering your datasets from day one of your project. The small upfront effort pays for itself every time you need to reproduce a result, debug a model regression, or audit your ML pipeline.
