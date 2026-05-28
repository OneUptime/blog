# How to Use Feature Monitoring and Anomaly Detection in Vertex AI Feature Store

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Vertex AI, Feature Store, Monitoring, Anomaly Detection

Description: A practical guide to setting up feature monitoring and anomaly detection in Vertex AI Feature Store to catch data drift and quality issues early.

---

Features that looked perfect during training can degrade silently in production. A column that was always populated starts returning nulls. A numerical feature that ranged between 0 and 100 suddenly spikes to 10,000. If you are not monitoring your features, these problems go undetected until your model's predictions start failing.

Vertex AI Feature Store (Legacy) includes monitoring capabilities that let you define monitoring intervals, set anomaly thresholds, and write anomaly logs when something goes wrong. This guide covers how to set that up from scratch.

Note: this guide uses Vertex AI Feature Store (Legacy), which Google has deprecated. For new projects, use Vertex AI Feature Store with feature groups and feature monitors.

## The Problem with Unmonitored Features

Consider a recommendation engine that uses a "user_average_session_duration" feature. During training, this feature ranged from 1 to 120 minutes. Six months later, a bug in the session tracking code starts reporting durations in seconds instead of minutes. The feature values drop by 60x, but nobody notices because the model still returns predictions - just increasingly bad ones.

Feature monitoring catches these kinds of issues by comparing current feature distributions against a baseline and flagging deviations that exceed your thresholds.

## Setting Up a Feature Store with Monitoring

Start by creating a feature store and defining your entity type with monitoring enabled.

This code sets up a feature store with an entity type that has monitoring configured:

```python
from google.cloud import aiplatform
from google.api_core.client_options import ClientOptions
from google.cloud import aiplatform_v1

# Initialize the client
aiplatform.init(project="your-project-id", location="us-central1")

# Create a Feature Store
feature_store = aiplatform.Featurestore.create(
    featurestore_id="user_features_store",
    online_store_fixed_node_count=1
)

featurestore_service_client = aiplatform_v1.FeaturestoreServiceClient(
    client_options=ClientOptions(api_endpoint="us-central1-aiplatform.googleapis.com")
)

featurestore_name = feature_store.resource_name

# Create an entity type for users and enable daily snapshot monitoring
monitoring_config = aiplatform_v1.FeaturestoreMonitoringConfig(
    snapshot_analysis=aiplatform_v1.FeaturestoreMonitoringConfig.SnapshotAnalysis(
        monitoring_interval_days=1,
        staleness_days=21,
    ),
    numerical_threshold_config=aiplatform_v1.FeaturestoreMonitoringConfig.ThresholdConfig(
        value=0.3
    ),
    categorical_threshold_config=aiplatform_v1.FeaturestoreMonitoringConfig.ThresholdConfig(
        value=0.2
    ),
)

operation = featurestore_service_client.create_entity_type(
    parent=featurestore_name,
    entity_type_id="users",
    entity_type=aiplatform_v1.EntityType(
        description="User behavioral features",
        monitoring_config=monitoring_config,
    ),
)
user_entity = operation.result()

# Create features. They inherit monitoring from the entity type.
operation = featurestore_service_client.batch_create_features(
    parent=user_entity.name,
    requests=[
        aiplatform_v1.CreateFeatureRequest(
            feature_id="avg_session_duration",
            feature=aiplatform_v1.Feature(
                value_type=aiplatform_v1.Feature.ValueType.DOUBLE,
                description="Average session duration in minutes",
            ),
        ),
        aiplatform_v1.CreateFeatureRequest(
            feature_id="purchase_count_30d",
            feature=aiplatform_v1.Feature(
                value_type=aiplatform_v1.Feature.ValueType.INT64,
                description="Number of purchases in last 30 days",
            ),
        ),
        aiplatform_v1.CreateFeatureRequest(
            feature_id="preferred_category",
            feature=aiplatform_v1.Feature(
                value_type=aiplatform_v1.Feature.ValueType.STRING,
                description="Most frequently browsed product category",
            ),
        ),
    ],
)
operation.result()
```

The monitoring configuration specifies how often to check (snapshot interval), how far back each snapshot should look, and how much drift is acceptable before an anomaly is logged. The threshold values are based on statistical distance measures - for numerical features, it uses Jensen-Shannon divergence, and for categorical features, it uses L-infinity distance.

## Configuring Monitoring Alerts

Feature monitoring is only useful if someone gets notified when anomalies are detected. Vertex AI Feature Store (Legacy) writes feature anomaly entries to Cloud Logging, so you can set up a log-based Cloud Monitoring alert.

This code creates a monitoring alert policy for feature anomaly logs:

```python
from google.cloud import monitoring_v3

# Create a monitoring client
client = monitoring_v3.AlertPolicyServiceClient()
project_name = f"projects/your-project-id"

# Define the alert policy for Feature Store anomaly logs
alert_policy = monitoring_v3.AlertPolicy(
    display_name="Vertex AI Feature Drift Alert",
    combiner=monitoring_v3.AlertPolicy.ConditionCombinerType.OR,
    conditions=[
        monitoring_v3.AlertPolicy.Condition(
            display_name="Feature distribution anomaly detected",
            condition_matched_log=monitoring_v3.AlertPolicy.Condition.LogMatch(
                filter=(
                    'resource.type="aiplatform.googleapis.com/Featurestore"\n'
                    'logName="projects/your-project-id/logs/'
                    'aiplatform.googleapis.com%2Ffeaturestore_log"\n'
                    'jsonPayload.objective=~"Featurestore Monitoring.*Anomaly"'
                )
            )
        )
    ],
    notification_channels=["projects/your-project-id/notificationChannels/YOUR_CHANNEL_ID"],
    alert_strategy=monitoring_v3.AlertPolicy.AlertStrategy(
        notification_rate_limit=monitoring_v3.AlertPolicy.AlertStrategy.NotificationRateLimit(
            period={"seconds": 300}  # Notify at most once every 5 minutes
        ),
        auto_close={"seconds": 86400}  # Auto-close after 24 hours
    )
)

# Create the alert policy
created_policy = client.create_alert_policy(
    name=project_name,
    alert_policy=alert_policy
)
print(f"Alert policy created: {created_policy.name}")
```

## Ingesting Features for Monitoring

For monitoring to work effectively, you need feature values in the store before monitoring runs. Snapshot drift detection compares current statistics with statistics from a previous monitoring run, while training-serving skew detection compares production values with a training-data baseline.

This code ingests feature values that the monitoring job can use when it creates its first statistics:

```python
import pandas as pd
from google.cloud import aiplatform

aiplatform.init(project="your-project-id", location="us-central1")

# Load feature values
features_df = pd.DataFrame({
    "entity_id": ["user_001", "user_002", "user_003", "user_004", "user_005"],
    "avg_session_duration": [15.2, 42.7, 8.1, 67.3, 23.9],
    "purchase_count_30d": [3, 12, 0, 8, 5],
    "preferred_category": ["electronics", "clothing", "electronics", "books", "clothing"],
    "feature_timestamp": pd.to_datetime([
        "2026-01-15", "2026-01-15", "2026-01-15", "2026-01-15", "2026-01-15"
    ])
})

# Get the entity type
feature_store = aiplatform.Featurestore("user_features_store")
user_entity = feature_store.get_entity_type("users")

# Ingest feature values from a DataFrame
user_entity.ingest_from_df(
    feature_ids=["avg_session_duration", "purchase_count_30d", "preferred_category"],
    feature_time="feature_timestamp",
    df_source=features_df,
    entity_id_field="entity_id"
)

print("Feature values ingested successfully")
```

## Building a Custom Anomaly Detection Pipeline

While the built-in monitoring handles distribution drift, you might want more sophisticated anomaly detection on individual feature values. You can build a pipeline that runs periodically and checks for outliers.

This code implements a custom anomaly detection job using statistical methods:

```python
from google.cloud import bigquery

def detect_feature_anomalies(project_id, feature_store_id, entity_type_id):
    """
    Detect anomalies in feature values using IQR method.
    Returns a list of anomalous entities and features.
    """
    # Query recent feature values from a BigQuery export or source table
    bq_client = bigquery.Client(project=project_id)

    query = f"""
    SELECT
        entity_id,
        avg_session_duration,
        purchase_count_30d,
        feature_timestamp
    FROM `{project_id}.feature_monitoring_exports.{feature_store_id}_{entity_type_id}_recent`
    WHERE feature_timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
    """

    df = bq_client.query(query).to_dataframe()

    anomalies = []
    numerical_features = ["avg_session_duration", "purchase_count_30d"]

    for feature in numerical_features:
        values = df[feature].dropna()

        # Calculate IQR bounds
        q1 = values.quantile(0.25)
        q3 = values.quantile(0.75)
        iqr = q3 - q1
        lower_bound = q1 - 3 * iqr  # Using 3x IQR for stricter detection
        upper_bound = q3 + 3 * iqr

        # Find outliers
        outlier_mask = df[feature].notna() & (
            (df[feature] < lower_bound) | (df[feature] > upper_bound)
        )
        outlier_entities = df.loc[outlier_mask, "entity_id"].tolist()

        if outlier_entities:
            anomalies.append({
                "feature": feature,
                "lower_bound": lower_bound,
                "upper_bound": upper_bound,
                "outlier_count": len(outlier_entities),
                "sample_entities": outlier_entities[:10]
            })

    # Check for null rate spikes
    for feature in numerical_features:
        null_rate = df[feature].isna().mean()
        if null_rate > 0.05:  # Alert if more than 5% null
            anomalies.append({
                "feature": feature,
                "issue": "high_null_rate",
                "null_rate": null_rate
            })

    return anomalies

# Run detection
anomalies = detect_feature_anomalies(
    "your-project-id",
    "user_features_store",
    "users"
)

for anomaly in anomalies:
    print(f"Anomaly detected: {anomaly}")
```

## Scheduling Monitoring with Cloud Scheduler

To run your custom anomaly detection on a regular schedule, you can use Cloud Scheduler to trigger a Cloud Function.

This shows the Cloud Function that wraps the anomaly detection logic:

```python
import functions_framework
from google.cloud import logging as cloud_logging
import json

@functions_framework.http
def check_feature_anomalies(request):
    """Cloud Function triggered by Cloud Scheduler to check feature health."""

    # Initialize logging
    log_client = cloud_logging.Client()
    logger = log_client.logger("feature-monitoring")

    anomalies = detect_feature_anomalies(
        "your-project-id",
        "user_features_store",
        "users"
    )

    if anomalies:
        # Log anomalies with severity
        logger.log_struct(
            {
                "message": "Feature anomalies detected",
                "anomaly_count": len(anomalies),
                "details": anomalies
            },
            severity="WARNING"
        )

        # You could also send a Slack notification or PagerDuty alert here
        return json.dumps({"status": "anomalies_found", "count": len(anomalies)}), 200

    logger.log_text("Feature health check passed - no anomalies detected")
    return json.dumps({"status": "healthy"}), 200
```

## Monitoring Dashboard

You can visualize feature health in a Cloud Monitoring dashboard. Here is the overall flow of the monitoring system.

```mermaid
graph TD
    A[Feature Store] -->|Daily Snapshot| B[Distribution Analysis]
    B -->|Compute Distance| C{Threshold Check}
    C -->|Within Bounds| D[Log Healthy Status]
    C -->|Exceeds Threshold| E[Cloud Monitoring Alert]
    E --> F[Notification Channel]
    F --> G[Email/Slack/PagerDuty]

    H[Custom Anomaly Job] -->|Scheduled| I[IQR Outlier Detection]
    I -->|Anomalies Found| E
    I -->|No Anomalies| D

    J[Cloud Scheduler] -->|Hourly Trigger| H
```

## Practical Tips

Choosing the right threshold values takes experimentation. Start with conservative thresholds (higher values like 0.3-0.5) and tighten them as you understand the natural variation in your features. Seasonal patterns in your data - like higher purchase counts during holidays - can cause false positives if your thresholds are too tight.

Monitor the monitoring itself. If your scheduled anomaly detection jobs stop running, you will not get alerts. Set up a separate heartbeat check that verifies your monitoring pipeline is operational.

Keep your training-serving skew baselines up to date. When you retrain your model on new data, update the baseline to reflect the new training distribution. Stale baselines lead to alert fatigue as the natural data distribution evolves.

Feature monitoring is not a substitute for model monitoring, but it complements it well. A feature anomaly can explain why model performance degraded, and catching it at the feature level gives you more time to react before end users notice the impact.
