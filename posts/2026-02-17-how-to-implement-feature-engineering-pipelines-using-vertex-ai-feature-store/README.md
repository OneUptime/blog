# How to Implement Feature Engineering Pipelines Using Vertex AI Feature Store

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Vertex AI, Feature Store, Feature Engineering, MLOps, Google Cloud

Description: Learn how to build feature engineering pipelines using Vertex AI Feature Store for consistent feature serving across training and prediction on Google Cloud.

---

Feature engineering is where most of the effort in machine learning goes. You spend weeks building feature pipelines, computing aggregations, and transforming raw data into useful signals. Then you have to make sure those exact same features are available both for training (batch, from historical data) and for serving (real-time, from live data). If the features differ between training and serving, your model performance in production will not match what you saw in development. This is called training-serving skew, and it is one of the most common causes of ML failures.

Vertex AI Feature Store solves this by giving you a centralized repository for features that serves both training and online prediction. Let me walk through how to build a complete feature engineering pipeline with it.

## Understanding the Feature Store Concepts

Before writing code, let me clarify the key concepts:

- **Feature Group** - A collection of related features, typically corresponding to an entity type (like "user" or "product")
- **Feature** - A single measurable property (like "user_age" or "total_purchases_30d")
- **Feature View** - A configuration that defines which features to serve together for online prediction
- **Entity** - The thing a feature describes (a specific user, a specific product)

## Step 1: Set Up the Feature Store

Create the Feature Store instance and define your feature groups.

```python
# setup_feature_store.py
from google.cloud import aiplatform
from google.cloud.aiplatform import FeatureGroup, FeatureOnlineStore

# Initialize the Vertex AI client
aiplatform.init(project="my-project", location="us-central1")

# Create a Feature Online Store for low-latency serving
online_store = FeatureOnlineStore.create_bigtable_store(
    name="production-feature-store",
    # Configure Bigtable for online serving
    online_store_config=FeatureOnlineStore.BigtableConfig(
        auto_scaling=FeatureOnlineStore.BigtableConfig.AutoScaling(
            min_node_count=1,
            max_node_count=5,
            cpu_utilization_target=70,
        )
    ),
)

print(f"Online store created: {online_store.resource_name}")
```

## Step 2: Build the Feature Engineering Pipeline

The feature pipeline reads raw data, computes features, and writes them to the Feature Store. I use Dataflow for this because it handles both batch and streaming.

```python
# feature_pipeline.py
import apache_beam as beam
from apache_beam.options.pipeline_options import PipelineOptions
from google.cloud import bigquery
from datetime import datetime, timedelta

class ComputeUserFeatures(beam.DoFn):
    """Compute features for each user from their raw events."""

    def process(self, element):
        user_id = element["user_id"]
        events = element["events"]

        # Calculate aggregate features from raw events
        total_purchases = sum(1 for e in events if e["type"] == "purchase")
        total_spend = sum(e.get("amount", 0) for e in events if e["type"] == "purchase")
        avg_session_duration = (
            sum(e.get("duration", 0) for e in events if e["type"] == "session")
            / max(1, sum(1 for e in events if e["type"] == "session"))
        )

        # Calculate time-windowed features
        now = datetime.utcnow()
        last_30_days = [
            e for e in events
            if (now - e["timestamp"]).days <= 30
        ]
        purchases_30d = sum(1 for e in last_30_days if e["type"] == "purchase")
        spend_30d = sum(e.get("amount", 0) for e in last_30_days if e["type"] == "purchase")

        # Calculate recency features
        last_purchase = max(
            (e["timestamp"] for e in events if e["type"] == "purchase"),
            default=None
        )
        days_since_last_purchase = (
            (now - last_purchase).days if last_purchase else -1
        )

        yield {
            "user_id": user_id,
            "total_purchases": total_purchases,
            "total_spend": float(total_spend),
            "avg_session_duration": float(avg_session_duration),
            "purchases_30d": purchases_30d,
            "spend_30d": float(spend_30d),
            "days_since_last_purchase": days_since_last_purchase,
            "feature_timestamp": now.isoformat(),
        }


def run_feature_pipeline():
    """Run the feature engineering pipeline with Dataflow."""
    options = PipelineOptions(
        runner="DataflowRunner",
        project="my-project",
        region="us-central1",
        temp_location="gs://my-bucket/temp",
        staging_location="gs://my-bucket/staging",
        job_name="user-feature-pipeline",
    )

    with beam.Pipeline(options=options) as pipeline:
        # Read raw events from BigQuery
        raw_events = (
            pipeline
            | "ReadEvents" >> beam.io.ReadFromBigQuery(
                query="""
                    SELECT user_id, event_type as type,
                           event_timestamp as timestamp,
                           JSON_EXTRACT_SCALAR(payload, '$.amount') as amount,
                           JSON_EXTRACT_SCALAR(payload, '$.duration') as duration
                    FROM `my-project.events.user_events`
                    WHERE event_timestamp > TIMESTAMP_SUB(
                        CURRENT_TIMESTAMP(), INTERVAL 180 DAY
                    )
                """,
                use_standard_sql=True,
            )
        )

        # Group events by user
        user_events = (
            raw_events
            | "KeyByUser" >> beam.Map(lambda e: (e["user_id"], e))
            | "GroupByUser" >> beam.GroupByKey()
            | "FormatGroups" >> beam.Map(
                lambda kv: {"user_id": kv[0], "events": list(kv[1])}
            )
        )

        # Compute features for each user
        features = (
            user_events
            | "ComputeFeatures" >> beam.ParDo(ComputeUserFeatures())
        )

        # Write features to BigQuery as the offline store
        features | "WriteToBQ" >> beam.io.WriteToBigQuery(
            table="my-project:ml_features.user_features",
            schema="user_id:STRING,total_purchases:INTEGER,"
                   "total_spend:FLOAT,avg_session_duration:FLOAT,"
                   "purchases_30d:INTEGER,spend_30d:FLOAT,"
                   "days_since_last_purchase:INTEGER,"
                   "feature_timestamp:TIMESTAMP",
            write_disposition=beam.io.BigQueryDisposition.WRITE_TRUNCATE,
            create_disposition=beam.io.BigQueryDisposition.CREATE_IF_NEEDED,
        )

if __name__ == "__main__":
    run_feature_pipeline()
```

## Step 3: Register Features in Vertex AI Feature Store

After the pipeline writes features to BigQuery, register them with the Feature Store.

```python
# register_features.py
from google.cloud import aiplatform
from google.cloud.aiplatform import FeatureGroup

aiplatform.init(project="my-project", location="us-central1")

# Create a Feature Group backed by the BigQuery table
user_feature_group = FeatureGroup.create(
    name="user_features",
    source=FeatureGroup.BigQuerySource(
        uri="bq://my-project.ml_features.user_features",
        entity_id_columns=["user_id"],
    ),
    description="User behavior and purchase features",
)

# Register individual features within the group
features_to_register = [
    ("total_purchases", "Total number of purchases"),
    ("total_spend", "Total amount spent"),
    ("avg_session_duration", "Average session duration in seconds"),
    ("purchases_30d", "Purchases in the last 30 days"),
    ("spend_30d", "Spend in the last 30 days"),
    ("days_since_last_purchase", "Days since last purchase"),
]

for feature_name, description in features_to_register:
    feature = user_feature_group.create_feature(
        name=feature_name,
        description=description,
    )
    print(f"Registered feature: {feature_name}")
```

## Step 4: Create a Feature View for Online Serving

Feature Views define which features should be available for low-latency online serving.

```python
# create_feature_view.py
from google.cloud.aiplatform import FeatureOnlineStore, FeatureView

# Reference the online store we created earlier
online_store = FeatureOnlineStore("production-feature-store")

# Create a Feature View that syncs features for online serving
feature_view = online_store.create_feature_view(
    name="user-prediction-features",
    source=FeatureView.BigQuerySource(
        uri="bq://my-project.ml_features.user_features",
        entity_id_columns=["user_id"],
    ),
    # Configure sync schedule - how often to refresh online features
    sync_config=FeatureView.SyncConfig(
        cron="0 */6 * * *"  # Sync every 6 hours
    ),
)

print(f"Feature view created: {feature_view.resource_name}")
```

## Step 5: Serve Features for Online Prediction

When your model needs features for a real-time prediction, fetch them from the Feature View.

```python
# serve_features.py
from google.cloud.aiplatform import FeatureOnlineStore

def get_user_features(user_id):
    """Fetch features for a user from the online store.
    Returns a dictionary of feature values."""
    online_store = FeatureOnlineStore("production-feature-store")
    feature_view = online_store.get_feature_view("user-prediction-features")

    # Fetch features for the specified user
    response = feature_view.fetch_feature_values(
        entity_ids=[user_id],
    )

    # Convert to a dictionary for easy use
    features = {}
    for entity in response:
        for feature in entity.features:
            features[feature.name] = feature.value

    return features


# Example usage in a prediction service
def predict(user_id):
    """Make a prediction using features from the Feature Store."""
    features = get_user_features(user_id)

    # Use the features for model prediction
    model_input = [
        features["total_purchases"],
        features["total_spend"],
        features["avg_session_duration"],
        features["purchases_30d"],
        features["spend_30d"],
        features["days_since_last_purchase"],
    ]

    # Call your model endpoint
    # prediction = endpoint.predict(instances=[model_input])
    return model_input
```

## Step 6: Use Feature Store for Training Data

When training a new model version, pull features from the same Feature Store to ensure consistency.

```python
# training_data.py
from google.cloud import bigquery

def get_training_data(start_date, end_date):
    """Build training dataset by joining features with labels.
    Uses the same BigQuery source as the Feature Store."""
    client = bigquery.Client()

    query = f"""
    SELECT
        f.user_id,
        f.total_purchases,
        f.total_spend,
        f.avg_session_duration,
        f.purchases_30d,
        f.spend_30d,
        f.days_since_last_purchase,
        l.churned AS label
    FROM
        `ml_features.user_features` f
    JOIN
        `ml_labels.churn_labels` l
    ON
        f.user_id = l.user_id
    WHERE
        f.feature_timestamp BETWEEN '{start_date}' AND '{end_date}'
    """

    df = client.query(query).to_dataframe()
    print(f"Training dataset: {len(df)} rows")
    return df
```

## Wrapping Up

A well-built feature engineering pipeline with Vertex AI Feature Store gives you consistent features across training and serving, which eliminates one of the biggest sources of ML bugs in production. The key pieces are: a Dataflow pipeline for computing features at scale, BigQuery as the offline feature store, and the Vertex AI Feature Online Store for low-latency serving. Run the pipeline on a schedule, sync features to the online store, and both your training jobs and prediction services can use the exact same feature definitions.
