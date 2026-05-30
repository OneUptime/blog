# How to Use Feature Stores in Azure Machine Learning for ML Feature Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Machine Learning, Feature Store, MLOps, Feature Engineering, Data Management, Machine Learning, Python

Description: Learn how to use Azure Machine Learning feature stores to manage, share, and serve ML features across training and inference pipelines.

---

Feature engineering is usually the most time-consuming part of any machine learning project. Data scientists spend weeks creating features, only to find that the same features were already built by another team, or that the features used in training do not match what is available in production. Feature stores solve these problems by providing a centralized repository for ML features that can be shared across teams and served consistently in both training and inference.

Azure Machine Learning's managed feature store gives you a way to define features as reusable assets, materialize them on a schedule, and serve them at low latency for online predictions. In this guide, I will walk through setting up a feature store, defining feature sets, materializing them, and using them in both training and online serving.

## What Is a Feature Store?

A feature store sits between your raw data sources and your ML models. It provides:

- **Feature definitions**: Code that transforms raw data into ML-ready features
- **Materialization**: Pre-computed feature values stored for fast retrieval
- **Point-in-time correctness**: Historical feature values for training without data leakage
- **Online serving**: Low-latency feature retrieval for real-time inference
- **Feature discovery**: A catalog where teams can find and reuse existing features

```mermaid
graph TD
    A[Raw Data Sources] --> B[Feature Transformation Code]
    B --> C[Feature Store]
    C --> D[Offline Store - Training]
    C --> E[Online Store - Inference]
    D --> F[Model Training]
    E --> G[Model Serving]
```

## Prerequisites

- Azure Machine Learning workspace (v2)
- Azure CLI with the `ml` extension (v2.22.0+)
- Python 3.9+ with `azure-ai-ml` and `azureml-featurestore` 1.2.1 or later for online lookup
- An Azure storage account for feature materialization

```bash
# Install required packages

pip install azure-ai-ml azureml-featurestore mltable pyarrow
```

## Step 1: Create a Feature Store

A feature store is a special type of Azure ML workspace optimized for feature management.

```python
# create_feature_store.py - Create an Azure ML Feature Store
from azure.ai.ml import MLClient
from azure.ai.ml.entities import (
    FeatureStore,
    ManagedIdentityConfiguration,
    MaterializationStore
)
from azure.identity import DefaultAzureCredential

# Create the ML client for your subscription
credential = DefaultAzureCredential()
subscription_id = "your-subscription-id"
ml_client = MLClient(
    credential=credential,
    subscription_id=subscription_id,
    resource_group_name="rg-ml"
)

# Use an existing user-assigned managed identity for materialization.
materialization_identity = ManagedIdentityConfiguration(
    client_id="your-uai-client-id",
    principal_id="your-uai-principal-id",
    resource_id="/subscriptions/your-subscription-id/resourceGroups/rg-ml/"
                "providers/Microsoft.ManagedIdentity/userAssignedIdentities/"
                "feature-store-uai"
)

# Define the feature store
feature_store = FeatureStore(
    name="production-feature-store",
    location="eastus",
    # Offline store for batch/training feature retrieval
    offline_store=MaterializationStore(
        type="azure_data_lake_gen2",
        target=f"/subscriptions/{subscription_id}/resourceGroups/rg-ml/"
               "providers/Microsoft.Storage/storageAccounts/featurestoredata/"
               "blobServices/default/containers/feature-store-offline"
    ),
    # Online store for low-latency feature retrieval
    online_store=MaterializationStore(
        type="redis",
        target=f"/subscriptions/{subscription_id}/resourceGroups/rg-ml/providers/"
               "Microsoft.Cache/Redis/feature-cache"
    ),
    materialization_identity=materialization_identity
)

# Create the feature store
ml_client.feature_stores.begin_create(feature_store).result()
print("Feature store created successfully")
```

## Step 2: Define Feature Store Entities

Entities represent the business objects that features are associated with. For example, "customer" or "transaction" would be entities. Each entity has a join key that uniquely identifies a record.

```python
# define_entities.py - Define feature store entities
from azure.ai.ml.entities import FeatureStoreEntity, DataColumn, DataColumnType

# Create a client for the feature store
fs_client = MLClient(
    credential=credential,
    subscription_id="your-subscription-id",
    resource_group_name="rg-ml",
    workspace_name="production-feature-store"
)

# Define a customer entity
customer_entity = FeatureStoreEntity(
    name="customer",
    version="1",
    description="Customer entity for feature lookup",
    # The join key is used to retrieve features for a specific customer
    index_columns=[
        DataColumn(name="customer_id", type=DataColumnType.STRING)
    ],
    stage="Development",
    tags={"team": "fraud-detection"}
)

# Register the entity in the feature store
fs_client.feature_store_entities.begin_create_or_update(customer_entity).result()

# Define a transaction entity
transaction_entity = FeatureStoreEntity(
    name="transaction",
    version="1",
    description="Transaction entity for real-time features",
    index_columns=[
        DataColumn(name="transaction_id", type=DataColumnType.STRING)
    ],
    stage="Development"
)

fs_client.feature_store_entities.begin_create_or_update(transaction_entity).result()
print("Entities registered successfully")
```

## Step 3: Create Feature Sets

Feature sets define the transformations that convert raw data into ML features. Each feature set is tied to an entity and contains one or more features.

Create the transformation code:

```python
# featuresets/customer_features/transformation_code/customer_transform.py
# This code defines how raw data is transformed into features
from pyspark.ml import Transformer
from pyspark.sql import DataFrame
from pyspark.sql import functions as F
from pyspark.sql.window import Window

class CustomerTransactionFeatureTransformer(Transformer):
    """
    Transform raw transaction data into customer-level rolling features.
    These features capture spending patterns and behavior.
    """

    def _transform(self, raw_data: DataFrame) -> DataFrame:
        timestamp_seconds = F.col("transaction_timestamp").cast("timestamp").cast("long")
        window_30d = (
            Window.partitionBy("customer_id")
            .orderBy(timestamp_seconds)
            .rangeBetween(-30 * 24 * 60 * 60, 0)
        )

        customer_features = (
            raw_data
            # Spending features
            .withColumn("avg_transaction_amount", F.avg("amount").over(window_30d))
            .withColumn("total_spend_30d", F.sum("amount").over(window_30d))
            .withColumn("transaction_count_30d", F.count("*").over(window_30d))
            .withColumn("max_transaction_amount", F.max("amount").over(window_30d))
            .withColumn("stddev_transaction_amount", F.stddev("amount").over(window_30d))
            # Behavioral features
            .withColumn(
                "unique_merchants_30d",
                F.approx_count_distinct("merchant_category").over(window_30d)
            )
            .withColumn(
                "online_transaction_ratio",
                F.avg(F.when(F.col("is_online") == 1, 1).otherwise(0)).over(window_30d)
            )
            # Time-based features
            .withColumn(
                "avg_transaction_hour",
                F.avg(F.hour("transaction_timestamp")).over(window_30d)
            )
        )

        return customer_features.select(
            "customer_id",
            "transaction_timestamp",
            "avg_transaction_amount",
            "total_spend_30d",
            "transaction_count_30d",
            "max_transaction_amount",
            "stddev_transaction_amount",
            "unique_merchants_30d",
            "online_transaction_ratio",
            "avg_transaction_hour",
        )
```

Define the feature set specification:

```yaml
# featuresets/customer_features/spec.yaml
$schema: https://azuremlschemas.azureedge.net/latest/featureSetSpec.schema.json
source:
  type: parquet
  path: abfss://transactions@featurestoredata.dfs.core.windows.net/raw/*.parquet
  timestamp_column:
    name: transaction_timestamp
feature_transformation_code:
  path: ./transformation_code
  transformer_class: customer_transform.CustomerTransactionFeatureTransformer
features:
  - name: avg_transaction_amount
    type: double
  - name: total_spend_30d
    type: double
  - name: transaction_count_30d
    type: long
  - name: max_transaction_amount
    type: double
  - name: stddev_transaction_amount
    type: double
  - name: unique_merchants_30d
    type: long
  - name: online_transaction_ratio
    type: double
  - name: avg_transaction_hour
    type: double
index_columns:
  - name: customer_id
    type: string
source_lookback:
  days: 30
  hours: 0
  minutes: 0
temporal_join_lookback:
  days: 30
  hours: 0
  minutes: 0
```

Register the feature set:

```python
# register_featureset.py - Register the feature set in the feature store
from azure.ai.ml.entities import FeatureSet, FeatureSetSpecification

customer_featureset = FeatureSet(
    name="customer_transaction_features",
    version="1",
    description="Customer spending and behavioral features derived from transactions",
    entities=["azureml:customer:1"],
    stage="Development",
    specification=FeatureSetSpecification(path="./featuresets/customer_features/"),
    tags={"source": "transactions", "team": "fraud-detection"}
)

fs_client.feature_sets.begin_create_or_update(customer_featureset).result()
print("Feature set registered")
```

## Step 4: Materialize Features

Materialization pre-computes feature values and stores them for fast retrieval. Set up a materialization schedule:

```python
# materialize.py - Configure feature materialization
from azure.ai.ml.entities import (
    DataAvailabilityStatus,
    MaterializationSettings,
    MaterializationComputeResource,
    RecurrenceTrigger
)
from datetime import datetime

# Configure materialization settings
materialization_settings = MaterializationSettings(
    # Compute to use for materialization jobs
    resource=MaterializationComputeResource(instance_type="standard_e8s_v3"),
    # Schedule: materialize every 6 hours
    schedule=RecurrenceTrigger(
        frequency="Hour",
        interval=6,
        start_time="2026-02-16T00:00:00Z"
    ),
    # Materialize to both offline and online stores
    offline_enabled=True,
    online_enabled=True
)

# Update the feature set with materialization settings
featureset = fs_client.feature_sets.get(
    name="customer_transaction_features",
    version="1"
)
featureset.materialization_settings = materialization_settings
fs_client.feature_sets.begin_create_or_update(featureset).result()

# Trigger an initial backfill materialization
fs_client.feature_sets.begin_backfill(
    name="customer_transaction_features",
    version="1",
    feature_window_start_time=datetime(2025, 1, 1, 0, 0, 0),
    feature_window_end_time=datetime(2026, 2, 16, 0, 0, 0),
    data_status=[DataAvailabilityStatus.NONE]
).result()

print("Materialization configured and backfill started")
```

## Step 5: Use Features in Training

When training a model, retrieve features from the offline store with point-in-time correctness:

```python
# training.py - Use feature store features for model training
from azureml.featurestore import FeatureStoreClient, get_offline_features
from pyspark.sql import Row
from datetime import datetime

# Initialize the feature store client
featurestore = FeatureStoreClient(
    credential=credential,
    subscription_id="your-subscription-id",
    resource_group_name="rg-ml",
    name="production-feature-store"
)

# Load the training labels (customer_id + timestamp + label)
training_labels = spark.createDataFrame([
    Row(customer_id="C001", event_timestamp=datetime(2026, 1, 15), is_fraud=0),
    Row(customer_id="C002", event_timestamp=datetime(2026, 1, 20), is_fraud=1),
    Row(customer_id="C003", event_timestamp=datetime(2026, 2, 1), is_fraud=0),
    Row(customer_id="C004", event_timestamp=datetime(2026, 2, 5), is_fraud=0),
    Row(customer_id="C005", event_timestamp=datetime(2026, 2, 10), is_fraud=1),
])

customer_featureset = featurestore.feature_sets.get(
    "customer_transaction_features", "1"
)

# Define which features to retrieve
features = [
    customer_featureset.get_feature("avg_transaction_amount"),
    customer_featureset.get_feature("total_spend_30d"),
    customer_featureset.get_feature("transaction_count_30d"),
    customer_featureset.get_feature("online_transaction_ratio"),
    customer_featureset.get_feature("unique_merchants_30d"),
]

# Get features with point-in-time join
# This ensures each training example gets features as they existed
# at the time of the event, preventing data leakage
training_data = get_offline_features(
    features=features,
    observation_data=training_labels,
    timestamp_column="event_timestamp"
)

print(f"Training data columns: {training_data.columns}")
training_data.show(5)
```

## Step 6: Serve Features Online

For real-time inference, retrieve features from the online store:

```python
# online_serving.py - Retrieve features at low latency for inference
import pyarrow
from azureml.featurestore import (
    FeatureStoreClient,
    get_online_features,
    init_online_lookup,
)

featurestore = FeatureStoreClient(
    credential=credential,
    subscription_id="your-subscription-id",
    resource_group_name="rg-ml",
    name="production-feature-store"
)

features = featurestore.resolve_feature_uri(
    [
        "customer_transaction_features:1:avg_transaction_amount",
        "customer_transaction_features:1:total_spend_30d",
        "customer_transaction_features:1:transaction_count_30d",
        "customer_transaction_features:1:online_transaction_ratio",
    ]
)

init_online_lookup(features, credential)

# Look up features for a specific customer during real-time inference
observation_data = pyarrow.Table.from_pydict({"customer_id": ["C001"]})
feature_values = get_online_features(features, observation_data)

print(f"Features for customer C001: {feature_values}")
# Use these features as input to your model for prediction
```

## Summary

Azure ML feature stores bring order to the chaos of feature engineering. By centralizing feature definitions, automating materialization, and providing consistent serving for both training and inference, they eliminate the common problems of feature duplication, training-serving skew, and data leakage. The workflow is: define entities and feature sets with transformation code, register them in the store, configure materialization schedules, and retrieve features through the offline API for training or the online API for real-time predictions. The initial setup takes effort, but the long-term payoff in reproducibility and team collaboration is substantial.
