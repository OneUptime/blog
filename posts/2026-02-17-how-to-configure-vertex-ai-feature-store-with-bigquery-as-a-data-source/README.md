# How to Configure Vertex AI Feature Store with BigQuery as a Data Source

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Vertex AI, Feature Store, BigQuery, Machine Learning

Description: Learn how to set up Vertex AI Feature Store with BigQuery as a data source for managing and serving ML features at scale.

---

Feature engineering is often the most time-consuming part of building machine learning models. You spend hours creating features, but then when it comes time to serve them in production, you end up recalculating them on the fly or building a separate pipeline to materialize them. Vertex AI Feature Store bridges this gap by using BigQuery as the offline source for your feature values and syncing selected features into an online store for real-time serving. And since BigQuery is where most teams already store their analytical data, connecting Feature Store to BigQuery as a data source is a natural fit.

## Understanding the Architecture

Here is how the pieces fit together:

1. Your raw data lives in BigQuery tables
2. You define feature views in Vertex AI Feature Store that reference those BigQuery tables
3. Feature Store syncs the data and makes it available for online serving
4. During training, you read features directly from BigQuery
5. During inference, you read features from the online store for low-latency access

The key insight is that BigQuery serves as both your feature computation engine and your offline feature store, while Vertex AI Feature Store handles the online serving layer.

## Creating a Feature Online Store Instance

Start by creating a Feature Online Store with the Bigtable online serving configuration:

```python
# create_feature_store.py

# Create a Vertex AI Feature Online Store instance

from google.cloud import aiplatform
from vertexai.resources.preview import feature_store

aiplatform.init(
    project='your-project-id',
    location='us-central1',
)

# Create the Feature Online Store
feature_online_store = feature_store.FeatureOnlineStore.create_bigtable_store(
    'ml-feature-store',
)

print(f"Feature Store created: {feature_online_store.resource_name}")
```

Using the REST API with Bigtable autoscaling:

```bash
PROJECT_ID="your-project-id"
LOCATION="us-central1"

curl -X POST \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  "https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/featureOnlineStores?feature_online_store_id=ml-feature-store" \
  -d '{
    "bigtable": {
      "auto_scaling": {
        "min_node_count": 1,
        "max_node_count": 3,
        "cpu_utilization_target": 70
      }
    }
  }'
```

## Preparing Your BigQuery Data

Before connecting Feature Store directly to BigQuery, make sure your BigQuery table has the right structure. A direct BigQuery source expects:

- An entity ID column (identifies the entity, like user_id or product_id)
- One or more feature columns
- One row per entity ID combination

If you need point-in-time historical feature values, keep those in a separate BigQuery table for training or use Feature Store feature groups. Direct BigQuery feature views sync the current row for each entity into the online store.

Here is an example BigQuery table schema:

```sql
-- Create a BigQuery table with user features
CREATE TABLE `your-project.ml_features.user_features` (
  user_id STRING NOT NULL,
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
INSERT INTO `your-project.ml_features.user_features` (
  user_id,
  total_purchases,
  avg_order_value,
  days_since_last_purchase,
  favorite_category,
  lifetime_value,
  account_age_days,
  num_support_tickets,
  is_premium_member
)
WITH order_features AS (
  SELECT
    user_id,
    COUNT(*) AS total_purchases,
    AVG(order_value) AS avg_order_value,
    DATE_DIFF(CURRENT_DATE(), DATE(MAX(order_date)), DAY) AS days_since_last_purchase,
    ARRAY_AGG(category ORDER BY order_date DESC LIMIT 1)[OFFSET(0)] AS favorite_category,
    SUM(order_value) AS lifetime_value
  FROM `your-project.transactions.orders`
  GROUP BY user_id
),
support_features AS (
  SELECT
    user_id,
    COUNT(*) AS num_support_tickets
  FROM `your-project.support.tickets`
  GROUP BY user_id
)
SELECT
  u.user_id,
  COALESCE(o.total_purchases, 0) AS total_purchases,
  o.avg_order_value,
  o.days_since_last_purchase,
  o.favorite_category,
  COALESCE(o.lifetime_value, 0) AS lifetime_value,
  DATE_DIFF(CURRENT_DATE(), DATE(u.created_at), DAY) AS account_age_days,
  COALESCE(s.num_support_tickets, 0) AS num_support_tickets,
  u.is_premium_member
FROM `your-project.customers.users` u
LEFT JOIN order_features o USING (user_id)
LEFT JOIN support_features s USING (user_id);
```

## Creating a Feature View

A feature view defines which BigQuery data to sync to the online store:

```python
# create_feature_view.py
# Create a Feature View that reads from BigQuery

from google.cloud import aiplatform
from vertexai.resources.preview import feature_store

aiplatform.init(
    project='your-project-id',
    location='us-central1',
)

# Get the Feature Online Store
feature_online_store = feature_store.FeatureOnlineStore('ml-feature-store')

# Create a Feature View backed by BigQuery
feature_view = feature_online_store.create_feature_view(
    name='user-features',
    source=feature_store.utils.FeatureViewBigQuerySource(
        # The BigQuery URI for your feature table
        uri='bq://your-project.ml_features.user_features',
        # Which columns to include as entity IDs
        entity_id_columns=['user_id'],
    ),
    # Sync schedule - how often to refresh features from BigQuery
    sync_config='0 */4 * * *',  # Sync every 4 hours
)

print(f"Feature View created: {feature_view.resource_name}")
```

## Using a BigQuery SQL View as Source

Instead of pointing to a base table directly, you can use a BigQuery view to define your features:

```python
# sql_feature_view.py
# Create a Feature View using a BigQuery SQL view

from google.cloud import aiplatform
from google.cloud import bigquery
from vertexai.resources.preview import feature_store

aiplatform.init(
    project='your-project-id',
    location='us-central1',
)

feature_online_store = feature_store.FeatureOnlineStore('ml-feature-store')

client = bigquery.Client()

# Define features with a BigQuery view
view_query = """
CREATE OR REPLACE VIEW `your-project.ml_features.user_features_derived` AS
SELECT
    user_id,
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
"""
client.query(view_query).result()

feature_view = feature_online_store.create_feature_view(
    name='user-features-derived',
    source=feature_store.utils.FeatureViewBigQuerySource(
        uri='bq://your-project.ml_features.user_features_derived',
        entity_id_columns=['user_id'],
    ),
    sync_config='0 */6 * * *',
)
```

## Triggering a Manual Sync

You do not have to wait for the scheduled sync. Trigger one manually when you need fresh data using the REST API:

```bash
PROJECT_ID="your-project-id"
LOCATION="us-central1"

curl -X POST \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  "https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/featureOnlineStores/ml-feature-store/featureViews/user-features:sync" \
  -d ""
```

## Reading Features for Training (Offline)

For model training, read features directly from a historical BigQuery feature table. This gives you access to point-in-time feature values:

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
FROM `your-project.ml_features.user_features_history` f
JOIN `your-project.ml_labels.churn_labels` l
    ON f.user_id = l.user_id
WHERE f.feature_timestamp <= l.label_timestamp
  AND l.label_timestamp BETWEEN '2025-01-01' AND '2025-12-31'
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
from vertexai.resources.preview.feature_store import FeatureOnlineStore, FeatureView

aiplatform.init(
    project='your-project-id',
    location='us-central1',
)

feature_online_store = FeatureOnlineStore('ml-feature-store')
feature_view = FeatureView('user-features', feature_online_store_id=feature_online_store.name)

# Fetch features for a specific user
response = feature_view.read(['user_123'])

print(f"Features for user_123:")
for feature in response.to_dict().get('features', []):
    print(f"  {feature['name']}: {feature['value']}")
```

## Monitoring Feature Freshness

Keep track of how fresh your features are:

```bash
# Check the last sync status
PROJECT_ID="your-project-id"
LOCATION="us-central1"

curl -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  "https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/featureOnlineStores/ml-feature-store/featureViews/user-features"

# List all syncs for a feature view
curl -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  "https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/featureOnlineStores/ml-feature-store/featureViews/user-features/featureViewSyncs"
```

## Best Practices

Design your BigQuery feature tables with Feature Store in mind from the start. Include the entity ID columns in direct BigQuery feature view sources, and keep timestamped historical values in separate training tables or Feature Store feature groups. Compute features in a way that is idempotent so syncs produce consistent results.

Choose your sync frequency based on how quickly your features change. User demographics might need a daily sync, while transaction features might need hourly updates.

Keep feature names consistent between training and serving. If you train with a feature called `avg_order_value`, make sure that is exactly what comes out of the online store.

Monitor sync failures. If a sync fails, your online features become stale, which can silently degrade model performance.

## Wrapping Up

Vertex AI Feature Store with BigQuery gives you a clean architecture for managing ML features. BigQuery handles feature computation and offline serving, while Feature Store handles online serving with low latency. The sync mechanism keeps the online store populated from your BigQuery source. This reduces the common problem of training-serving skew and helps your models use consistent feature definitions whether they are training on historical data or making real-time predictions.
