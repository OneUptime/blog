# How to Serve Features Online from Vertex AI Feature Store for Real-Time Predictions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Vertex AI, Feature Store, Online Serving, Real-Time ML

Description: Learn how to serve features in real time from Vertex AI Feature Store for low-latency online predictions in production ML systems.

---

When your model needs to make predictions in real time - recommending products as a user browses, scoring fraud risk for a transaction, or personalizing content on page load - you cannot afford to wait for a BigQuery query to return features. You need those features served in milliseconds. Vertex AI Feature Store provides an online serving layer backed by Bigtable that delivers exactly this: low-latency feature retrieval for real-time inference.

## The Online Serving Flow

The typical flow for real-time predictions with Feature Store looks like this:

1. A request comes in (for example, "predict churn risk for user_123")
2. Your application calls Feature Store to get the latest features for user_123
3. Feature Store returns the features in milliseconds
4. Your application sends those features to the model endpoint for prediction
5. The prediction is returned to the user

This decouples feature computation from feature serving. Features are computed in batch (using BigQuery or other pipelines) and synced to the online store, so serving is just a fast key-value lookup.

## Setting Up the Online Store

First, create a Feature Online Store with Bigtable as the serving backend:

```python
# create_online_store.py
# Create a Feature Online Store backed by Bigtable

from google.cloud import aiplatform

aiplatform.init(
    project='your-project-id',
    location='us-central1',
)

# Create the online store with autoscaling Bigtable nodes
online_store = aiplatform.FeatureOnlineStore.create_bigtable_store(
    name='realtime-feature-store',
    # Minimum Bigtable nodes - keep at least 1 for low latency
    min_node_count=1,
    # Maximum nodes for handling traffic spikes
    max_node_count=5,
    # CPU target for autoscaling decisions
    cpu_utilization_target=60,
)

print(f"Online store created: {online_store.resource_name}")
```

## Creating Feature Views for Online Serving

Feature views define which features are available for online serving and where they come from:

```python
# create_feature_views.py
# Create feature views for different entity types

from google.cloud import aiplatform

aiplatform.init(
    project='your-project-id',
    location='us-central1',
)

online_store = aiplatform.FeatureOnlineStore('realtime-feature-store')

# User features
user_feature_view = online_store.create_feature_view(
    name='user-features',
    source=aiplatform.FeatureView.BigQuerySource(
        uri='bq://your-project.ml_features.user_features',
        entity_id_columns=['user_id'],
    ),
    # Sync every 2 hours to keep features fresh
    sync_config=aiplatform.FeatureView.SyncConfig(
        cron='0 */2 * * *',
    ),
)

# Product features
product_feature_view = online_store.create_feature_view(
    name='product-features',
    source=aiplatform.FeatureView.BigQuerySource(
        uri='bq://your-project.ml_features.product_features',
        entity_id_columns=['product_id'],
    ),
    sync_config=aiplatform.FeatureView.SyncConfig(
        cron='0 */6 * * *',
    ),
)

print("Feature views created")
```

## Reading Features Online (Single Entity)

The most common operation is reading features for a single entity:

```python
# read_single.py
# Read features for a single entity from the online store

from google.cloud import aiplatform

aiplatform.init(
    project='your-project-id',
    location='us-central1',
)

online_store = aiplatform.FeatureOnlineStore('realtime-feature-store')
user_features = online_store.get_feature_view('user-features')

# Fetch features for a specific user
response = user_features.read(key=['user_123'])

# The response contains all feature values for the entity
print("Features for user_123:")
for feature_name, feature_value in response.to_dict().items():
    print(f"  {feature_name}: {feature_value}")
```

## Reading Features Online (Batch of Entities)

When you need features for multiple entities at once - like getting features for all items in a recommendation candidate set:

```python
# read_batch.py
# Read features for multiple entities in one call

from google.cloud import aiplatform

aiplatform.init(
    project='your-project-id',
    location='us-central1',
)

online_store = aiplatform.FeatureOnlineStore('realtime-feature-store')
product_features = online_store.get_feature_view('product-features')

# Fetch features for multiple products at once
product_ids = ['prod_001', 'prod_002', 'prod_003', 'prod_004', 'prod_005']

responses = []
for product_id in product_ids:
    response = product_features.read(key=[product_id])
    responses.append(response)

# Process the responses
for product_id, response in zip(product_ids, responses):
    print(f"Product {product_id}: {response.to_dict()}")
```

## Building a Real-Time Prediction Service

Here is a complete example of a prediction service that combines Feature Store with a Vertex AI endpoint:

```python
# prediction_service.py
# Real-time prediction service using Feature Store and Vertex AI

from flask import Flask, request, jsonify
from google.cloud import aiplatform
import numpy as np
import time

app = Flask(__name__)

# Initialize Vertex AI
aiplatform.init(
    project='your-project-id',
    location='us-central1',
)

# Get Feature Store references
online_store = aiplatform.FeatureOnlineStore('realtime-feature-store')
user_feature_view = online_store.get_feature_view('user-features')

# Get the prediction endpoint
endpoint = aiplatform.Endpoint(
    'projects/your-project-id/locations/us-central1/endpoints/ENDPOINT_ID'
)

@app.route('/predict-churn', methods=['POST'])
def predict_churn():
    """Predict churn risk for a user using features from Feature Store."""
    start_time = time.time()

    data = request.json
    user_id = data.get('user_id')

    if not user_id:
        return jsonify({'error': 'user_id is required'}), 400

    # Step 1: Fetch features from the online store
    feature_start = time.time()
    features = user_feature_view.read(key=[user_id])
    feature_time = time.time() - feature_start

    # Step 2: Prepare the feature vector for the model
    feature_dict = features.to_dict()
    instance = [
        feature_dict.get('total_purchases', 0),
        feature_dict.get('avg_order_value', 0.0),
        feature_dict.get('days_since_last_purchase', 0),
        feature_dict.get('lifetime_value', 0.0),
        feature_dict.get('account_age_days', 0),
        feature_dict.get('num_support_tickets', 0),
    ]

    # Step 3: Send to the prediction endpoint
    predict_start = time.time()
    prediction = endpoint.predict(instances=[instance])
    predict_time = time.time() - predict_start

    total_time = time.time() - start_time

    return jsonify({
        'user_id': user_id,
        'churn_probability': prediction.predictions[0][0],
        'latency': {
            'feature_fetch_ms': round(feature_time * 1000, 2),
            'prediction_ms': round(predict_time * 1000, 2),
            'total_ms': round(total_time * 1000, 2),
        },
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
```

## Using the REST API Directly

You can also call the Feature Store online serving API via REST:

```bash
# Fetch features using the REST API
curl -X POST \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  "https://us-central1-aiplatform.googleapis.com/v1/projects/your-project-id/locations/us-central1/featureOnlineStores/realtime-feature-store/featureViews/user-features:fetchFeatureValues" \
  -d '{
    "dataKey": {
      "key": "user_123"
    }
  }'
```

## Optimizing Online Serving Latency

Latency matters for real-time serving. Here are strategies to keep it low:

Use the right Bigtable configuration. More nodes handle more concurrent reads with lower latency:

```python
# Higher node count for lower latency under load
online_store = aiplatform.FeatureOnlineStore.create_bigtable_store(
    name='low-latency-store',
    # More minimum nodes means lower cold-start latency
    min_node_count=3,
    max_node_count=10,
    cpu_utilization_target=50,  # Scale up early
)
```

Keep your feature vectors small. Only sync the features your model actually needs, not every column in your BigQuery table.

Co-locate your prediction service and Feature Store in the same region. Cross-region reads add significant latency.

Cache frequently accessed features in your application layer if the same entity is queried repeatedly within a short window:

```python
# Simple in-memory cache for frequently accessed features
from functools import lru_cache
import time

# Cache features for up to 60 seconds
feature_cache = {}
CACHE_TTL = 60

def get_features_cached(user_id):
    """Fetch features with a simple TTL cache."""
    cache_key = user_id
    now = time.time()

    # Check cache
    if cache_key in feature_cache:
        cached_time, cached_features = feature_cache[cache_key]
        if now - cached_time < CACHE_TTL:
            return cached_features

    # Cache miss - fetch from Feature Store
    features = user_feature_view.read(key=[user_id])
    feature_dict = features.to_dict()

    # Update cache
    feature_cache[cache_key] = (now, feature_dict)

    return feature_dict
```

## Monitoring Online Serving

Monitor your Feature Store's online serving performance:

```python
# Check online store health and metrics
from google.cloud import monitoring_v3

client = monitoring_v3.MetricServiceClient()

# Query Feature Store serving latency
results = client.list_time_series(
    request={
        'name': f'projects/your-project-id',
        'filter': 'metric.type = "aiplatform.googleapis.com/featurestore/online_serving/latencies"',
        'interval': {
            'end_time': {'seconds': int(time.time())},
            'start_time': {'seconds': int(time.time() - 3600)},
        },
    }
)

for result in results:
    for point in result.points:
        print(f"Latency: {point.value.distribution_value.mean}ms")
```

## Handling Feature Staleness

Features become stale when the sync from BigQuery falls behind. Build checks into your serving logic:

```python
# Check feature freshness before serving
def get_features_with_freshness_check(user_id, max_age_hours=6):
    """Fetch features and warn if they are stale."""
    features = user_feature_view.read(key=[user_id])
    feature_dict = features.to_dict()

    # Check the timestamp of the features
    feature_timestamp = feature_dict.get('feature_timestamp')
    if feature_timestamp:
        age_hours = (time.time() - feature_timestamp.timestamp()) / 3600
        if age_hours > max_age_hours:
            print(f"WARNING: Features for {user_id} are {age_hours:.1f} hours old")

    return feature_dict
```

## Wrapping Up

Serving features online from Vertex AI Feature Store gives your real-time ML systems the low-latency feature access they need. The Bigtable-backed online store handles concurrent reads efficiently, and the sync mechanism keeps features fresh from your BigQuery data. The key is to design your feature views carefully, right-size your Bigtable configuration, and monitor both latency and feature freshness. Combined with a Vertex AI prediction endpoint, this gives you a complete real-time ML serving stack.
