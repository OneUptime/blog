# How to Configure Vertex AI Feature Store with BigQuery as a Data Source

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Vertex AI, Feature Store, BigQuery, Machine Learning

Description: Learn how to set up Vertex AI Feature Store with BigQuery as a data source for managing and serving ML features at scale.

---

Feature engineering is often the most time-consuming part of building machine learning models. You spend hours creating features, but then when it comes time to serve them in production, you end up recalculating them on the fly or building a separate pipeline to materialize them. Vertex AI Feature Store bridges this gap. It provides a central repository for your ML features with both offline (batch) and online (real-time) serving capabilities. And since BigQuery is where most teams already store their analytical data, connecting Feature Store to BigQuery as a data source is a natural fit.

## Understanding the Architecture

Here is how the pieces fit together:

1. Your raw data lives in BigQuery tables
2. You define feature views in Vertex AI Feature Store that reference those BigQuery tables
3. Feature Store syncs the data and makes it available for online serving
4. During training, you read features directly from BigQuery
5. During inference, you read features from the online store for low-latency access

The key insight is that BigQuery serves as both your feature computation engine and your offline feature store, while Vertex AI Feature Store handles the online serving layer.

## Creating a Feature Store Instance

Start by creating a Feature Store instance with the Bigtable online serving configuration:

```python
# create_feature_store.py
# Create a Vertex AI Feature Store instance

from google.cloud import aiplatform

aiplatform.init(
    project='your-project-id',
    location='us-central1',
)

# Create the Feature Online Store
feature_online_store = aiplatform.FeatureOnlineStore.create_bigtable_store(
    name='ml-feature-store',
    # Bigtable configuration for online serving
    min_node_count=1,
    max_node_count=3,
    # CPU utilization target for autoscaling
    cpu_utilization_target=70,
)

print(f"Feature Store created: {feature_online_store.resource_name}")
```

Using gcloud:

```bash
# Create a Feature Online Store using gcloud
gcloud ai feature-online-stores create ml-feature-store \
  --region=us-central1 \
  --bigtable-min-node-count=1 \
  --bigtable-max-node-count=3 \
  --bigtable-cpu-utilization-target=70
```

## Preparing Your BigQuery Data

Before connecting Feature Store, make sure your BigQuery table has the right structure. Feature Store expects:

- An entity ID column (identifies the entity, like user_id or product_id)
- A feature timestamp column (when the feature values were computed)
- One or more feature columns

Here is an example BigQuery table schema:

```sql
-- Create a BigQuery table with user features
CREATE TABLE `your-project.ml_features.user_features` (
  user_id STRING NOT NULL,
  feature_timestamp TIMESTAMP NOT NULL,
  total_purchases INT64,
  avg_order_value FLOAT64,
  days_since_last_purchase INT64,
  favorite_category STRING,
  lifetime_value FLOAT64,
  account_age_days INT64,
  num_support_tickets INT64,
  is_premium_member BOOL
);

-- Populate with feature data
INSERT INTO `your-project.ml_features.user_features`
SELECT
  user_id,
  CURRENT_TIMESTAMP() as feature_timestamp,
  COUNT(*) as total_purchases,
  AVG(order_value) as avg_order_value,
  DATE_DIFF(CURRENT_DATE(), MAX(order_date), DAY) as days_since_last_purchase,
  -- ... more feature calculations
FROM `your-project.transactions.orders`
GROUP BY user_id;
```

## Creating a Feature View

A feature view defines which BigQuery data to sync to the online store:

```python
# create_feature_view.py
# Create a Feature View that reads from BigQuery

from google.cloud import aiplatform
from google.cloud.aiplatform_v1.types import feature_online_store as feature_online_store_pb2

aiplatform.init(
    project='your-project-id',
    location='us-central1',
)

# Get the Feature Online Store
feature_online_store = aiplatform.FeatureOnlineStore('ml-feature-store')

# Create a Feature View backed by BigQuery
feature_view = feature_online_store.create_feature_view(
    name='user-features',
    source=aiplatform.FeatureView.BigQuerySource(
        # The BigQuery URI for your feature table
        uri='bq://your-project.ml_features.user_features',
        # Which columns to include as entity IDs
        entity_id_columns=['user_id'],
    ),
    # Sync schedule - how often to refresh features from BigQuery
    sync_config=aiplatform.FeatureView.SyncConfig(
        cron='0 */4 * * *',  # Sync every 4 hours
    ),
)

print(f"Feature View created: {feature_view.resource_name}")
```

## Using a BigQuery SQL Query as Source

Instead of pointing to a table directly, you can use a SQL query to define your features:

```python
# sql_feature_view.py
# Create a Feature View using a BigQuery SQL query

from google.cloud import aiplatform

aiplatform.init(
    project='your-project-id',
    location='us-central1',
)

feature_online_store = aiplatform.FeatureOnlineStore('ml-feature-store')

# Define features with a SQL query
feature_query = """
SELECT
    user_id,
    CURRENT_TIMESTAMP() as feature_timestamp,
    total_purchases,
    avg_order_value,
    days_since_last_purchase,
    lifetime_value,
    CASE
        WHEN lifetime_value > 1000 THEN 'high'
        WHEN lifetime_value > 100 THEN 'medium'
        ELSE 'low'
    END as value_segment
FROM `your-project.ml_features.user_features`
WHERE feature_timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
"""

feature_view = feature_online_store.create_feature_view(
    name='user-features-derived',
    source=aiplatform.FeatureView.BigQuerySource(
        uri='bq://your-project.ml_features.user_features',
        entity_id_columns=['user_id'],
    ),
    sync_config=aiplatform.FeatureView.SyncConfig(
        cron='0 */6 * * *',
    ),
)
```

## Triggering a Manual Sync

You do not have to wait for the scheduled sync. Trigger one manually when you need fresh data:

```python
# manual_sync.py
# Trigger a manual feature sync from BigQuery

from google.cloud import aiplatform

aiplatform.init(
    project='your-project-id',
    location='us-central1',
)

feature_online_store = aiplatform.FeatureOnlineStore('ml-feature-store')
feature_view = feature_online_store.get_feature_view('user-features')

# Trigger a sync
sync = feature_view.sync()

print(f"Sync started: {sync.resource_name}")
```

Using gcloud:

```bash
# Trigger a manual sync
gcloud ai feature-views sync user-features \
  --feature-online-store=ml-feature-store \
  --region=us-central1
```

## Reading Features for Training (Offline)

For model training, read features directly from BigQuery. This gives you access to historical feature values:

```python
# offline_read.py
# Read features from BigQuery for training

from google.cloud import bigquery
import pandas as pd

client = bigquery.Client()

# Read features for training, joining with labels
query = """
SELECT
    f.user_id,
    f.total_purchases,
    f.avg_order_value,
    f.days_since_last_purchase,
    f.lifetime_value,
    f.account_age_days,
    l.churned
FROM `your-project.ml_features.user_features` f
JOIN `your-project.ml_labels.churn_labels` l
    ON f.user_id = l.user_id
WHERE f.feature_timestamp BETWEEN '2025-01-01' AND '2025-12-31'
"""

training_df = client.query(query).to_dataframe()
print(f"Training data: {len(training_df)} rows, {len(training_df.columns)} columns")
```

## Reading Features for Prediction (Online)

For real-time predictions, read features from the online store:

```python
# online_read.py
# Read features from the online store for real-time predictions

from google.cloud import aiplatform

aiplatform.init(
    project='your-project-id',
    location='us-central1',
)

feature_online_store = aiplatform.FeatureOnlineStore('ml-feature-store')
feature_view = feature_online_store.get_feature_view('user-features')

# Fetch features for a specific user
response = feature_view.read(key=['user_123'])

print(f"Features for user_123:")
for feature_name, feature_value in response.items():
    print(f"  {feature_name}: {feature_value}")
```

## Monitoring Feature Freshness

Keep track of how fresh your features are:

```bash
# Check the last sync status
gcloud ai feature-views describe user-features \
  --feature-online-store=ml-feature-store \
  --region=us-central1 \
  --format="table(name,syncConfig,lastSyncTime)"

# List all syncs for a feature view
gcloud ai feature-views syncs list \
  --feature-view=user-features \
  --feature-online-store=ml-feature-store \
  --region=us-central1
```

## Best Practices

Design your BigQuery feature tables with Feature Store in mind from the start. Include the entity ID and timestamp columns, and compute features in a way that is idempotent so syncs produce consistent results.

Choose your sync frequency based on how quickly your features change. User demographics might need a daily sync, while transaction features might need hourly updates.

Keep feature names consistent between training and serving. If you train with a feature called `avg_order_value`, make sure that is exactly what comes out of the online store.

Monitor sync failures. If a sync fails, your online features become stale, which can silently degrade model performance.

## Wrapping Up

Vertex AI Feature Store with BigQuery gives you a clean architecture for managing ML features. BigQuery handles feature computation and offline serving, while Feature Store handles online serving with low latency. The sync mechanism keeps them in sync automatically. This eliminates the common problem of training-serving skew and gives your models consistent feature values whether they are training on historical data or making real-time predictions.
