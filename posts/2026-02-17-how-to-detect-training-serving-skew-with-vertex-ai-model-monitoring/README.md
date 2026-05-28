# How to Detect Training-Serving Skew with Vertex AI Model Monitoring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Vertex AI, Model Monitoring, Training-Serving Skew, MLOps, Google Cloud

Description: Learn how to detect and diagnose training-serving skew in production ML models using Vertex AI Model Monitoring with practical configuration examples.

---

Training-serving skew is one of the most insidious problems in production machine learning. Your model looks great during development - high accuracy, solid F1 score, beautiful ROC curves. Then you deploy it, and the predictions are mediocre. The cause is often that the data your model sees in production looks different from the data it was trained on. Not because the world changed (that is data drift), but because something in your data pipeline is producing different feature distributions at serving time than at training time.

Common causes include feature transformations applied differently, missing data handled differently, timezone bugs, or features derived from stale data sources. Vertex AI Model Monitoring can detect this skew automatically by comparing the distribution of features in production requests against your training data baseline.

## How Training-Serving Skew Differs from Data Drift

Let me clarify the difference because these terms are often confused:

**Training-serving skew** exists from the moment you deploy. The training data distribution and the serving data distribution differ because of bugs, inconsistencies, or differences in the data pipelines. It does not change over time - it is a constant offset.

**Data drift** develops over time. The production data starts matching training data but gradually diverges as the real world changes.

Both are problems, but they have different root causes and different solutions. Skew is typically a bug to fix. Drift requires retraining.

## Step 1: Prepare Your Training Data Baseline

The first thing Vertex AI Model Monitoring needs is your training data. Vertex AI calculates the baseline feature distributions from that data and compares production requests against them.

```python
# prepare_baseline.py

from google.cloud import bigquery
from google.cloud import storage
import pandas as pd
import json

def export_training_baseline(
    project_id,
    source_table,
    output_uri,
    feature_columns,
):
    """Export training data and optional summary statistics for skew detection."""
    client = bigquery.Client(project=project_id)

    # Query the training data to compute feature statistics
    columns = ", ".join(feature_columns)
    query = f"""
    SELECT {columns}
    FROM `{source_table}`
    WHERE split = 'train'
    """

    df = client.query(query).to_dataframe()

    # Compute statistics for each feature
    baseline_stats = {}
    for col in feature_columns:
        if df[col].dtype in ['float64', 'int64']:
            # Numerical feature statistics
            baseline_stats[col] = {
                "type": "numerical",
                "mean": float(df[col].mean()),
                "std": float(df[col].std()),
                "min": float(df[col].min()),
                "max": float(df[col].max()),
                "quantiles": {
                    "25": float(df[col].quantile(0.25)),
                    "50": float(df[col].quantile(0.50)),
                    "75": float(df[col].quantile(0.75)),
                },
            }
        else:
            # Categorical feature distribution
            value_counts = df[col].value_counts(normalize=True).to_dict()
            baseline_stats[col] = {
                "type": "categorical",
                "distribution": {str(k): float(v) for k, v in value_counts.items()},
                "unique_values": int(df[col].nunique()),
            }

    # Save optional summary statistics for your own inspection
    storage_client = storage.Client()
    blob_path = output_uri.replace("gs://", "").split("/", 1)
    bucket = storage_client.bucket(blob_path[0])
    blob = bucket.blob(blob_path[1])
    blob.upload_from_string(json.dumps(baseline_stats, indent=2))

    print(f"Summary statistics exported to {output_uri}")
    print(f"Features tracked: {len(baseline_stats)}")

    # Export the raw data for Vertex AI to compute its own baseline statistics
    df.to_csv("/tmp/training_baseline.csv", index=False)
    baseline_blob = bucket.blob(f"{blob_path[1]}_data.csv")
    baseline_blob.upload_from_filename("/tmp/training_baseline.csv")
    raw_data_uri = f"gs://{blob_path[0]}/{blob_path[1]}_data.csv"
    print(f"Training data exported to {raw_data_uri}")

    return raw_data_uri, baseline_stats
```

## Step 2: Configure Skew Detection on Your Endpoint

Set up Vertex AI Model Monitoring to detect training-serving skew.

```python
# configure_skew_detection.py
from google.cloud import aiplatform
from google.cloud.aiplatform import model_monitoring

def setup_skew_detection(
    endpoint_id,
    training_data_uri,
    target_field,
    feature_thresholds,
    notification_emails,
):
    """Configure training-serving skew detection for a deployed model."""
    aiplatform.init(project="my-project", location="us-central1")

    endpoint = aiplatform.Endpoint(endpoint_id)

    # Get the deployed model ID
    deployed_models = endpoint.list_models()
    if not deployed_models:
        raise ValueError("No models deployed on this endpoint")

    deployed_model_id = deployed_models[0].id

    # Configure skew detection with per-feature thresholds.
    # Numerical features use skew_thresholds; categorical features use
    # attribute_skew_thresholds for the v1 endpoint monitoring API.
    skew_thresholds = {}
    attribute_skew_thresholds = {}

    for feature_name, config in feature_thresholds.items():
        if config["type"] == "numerical":
            skew_thresholds[feature_name] = config["threshold"]
        else:
            attribute_skew_thresholds[feature_name] = config["threshold"]

    skew_config = model_monitoring.SkewDetectionConfig(
        data_source=training_data_uri,
        target_field=target_field,
        skew_thresholds=skew_thresholds,
        attribute_skew_thresholds=attribute_skew_thresholds,
    )

    # Create the monitoring job
    monitoring_job = aiplatform.ModelDeploymentMonitoringJob.create(
        display_name="skew-detection-monitor",
        endpoint=endpoint,
        logging_sampling_strategy=model_monitoring.RandomSampleConfig(
            sample_rate=1.0  # Sample all predictions during initial detection
        ),
        schedule_config=model_monitoring.ScheduleConfig(
            monitor_interval=1  # Check hourly
        ),
        alert_config=model_monitoring.EmailAlertConfig(
            user_emails=notification_emails
        ),
        objective_configs={
            deployed_model_id: model_monitoring.ObjectiveConfig(
                skew_detection_config=skew_config,
            )
        },
    )

    print(f"Skew detection configured: {monitoring_job.resource_name}")
    return monitoring_job


# Example usage with different thresholds for different features
feature_config = {
    "user_age": {"type": "numerical", "threshold": 0.3},
    "session_count": {"type": "numerical", "threshold": 0.3},
    "purchase_amount": {"type": "numerical", "threshold": 0.2},
    "device_type": {"type": "categorical", "threshold": 0.3},
    "region": {"type": "categorical", "threshold": 0.3},
}

setup_skew_detection(
    endpoint_id="ENDPOINT_ID",
    training_data_uri="bq://my-project.ml_data.training_features",
    target_field="purchased",
    feature_thresholds=feature_config,
    notification_emails=["ml-team@company.com"],
)
```

## Step 3: Understanding the Skew Metrics

Vertex AI Model Monitoring v1 uses different distance metrics for different feature types:

- **L-infinity distance** for categorical features - measures the largest absolute difference between category probabilities.
- **Jensen-Shannon divergence** for numerical features (computed on histogram bins) - the feature values are binned into a histogram and then compared.

A distance score of 0.0 means the production data matches the baseline distribution for that feature. Larger scores mean larger distribution differences, and Vertex AI flags skew when the score exceeds the threshold you configured.

## Step 4: Diagnose Skew When Detected

When Vertex AI flags skew, you need to investigate which features are affected and why.

```python
# diagnose_skew.py
from google.cloud import aiplatform
from google.cloud import bigquery
import pandas as pd

def diagnose_feature_skew(
    monitoring_job_id,
    feature_name,
    training_data_table,
    prediction_log_table,
):
    """Investigate a specific feature that shows training-serving skew."""
    aiplatform.init(project="my-project", location="us-central1")
    bq_client = bigquery.Client()

    print(f"Diagnosing skew for feature: {feature_name}")
    print("=" * 60)

    # Get training data distribution
    training_query = f"""
    SELECT
        {feature_name},
        COUNT(*) as count
    FROM `{training_data_table}`
    WHERE split = 'train'
    GROUP BY {feature_name}
    ORDER BY count DESC
    LIMIT 20
    """
    training_dist = bq_client.query(training_query).to_dataframe()
    print(f"\nTraining data distribution ({feature_name}):")
    print(training_dist.to_string(index=False))

    # Get serving data distribution from prediction logs
    serving_query = f"""
    SELECT
        JSON_EXTRACT_SCALAR(input_features, '$.{feature_name}') as {feature_name},
        COUNT(*) as count
    FROM `{prediction_log_table}`
    WHERE timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
    GROUP BY {feature_name}
    ORDER BY count DESC
    LIMIT 20
    """
    serving_dist = bq_client.query(serving_query).to_dataframe()
    print(f"\nServing data distribution ({feature_name}):")
    print(serving_dist.to_string(index=False))

    # Compare statistics for numerical features
    stats_query = f"""
    WITH training AS (
        SELECT
            'training' as source,
            AVG(CAST({feature_name} AS FLOAT64)) as mean_val,
            STDDEV(CAST({feature_name} AS FLOAT64)) as std_val,
            MIN(CAST({feature_name} AS FLOAT64)) as min_val,
            MAX(CAST({feature_name} AS FLOAT64)) as max_val
        FROM `{training_data_table}`
        WHERE split = 'train'
    ),
    serving AS (
        SELECT
            'serving' as source,
            AVG(CAST(JSON_EXTRACT_SCALAR(input_features, '$.{feature_name}') AS FLOAT64)) as mean_val,
            STDDEV(CAST(JSON_EXTRACT_SCALAR(input_features, '$.{feature_name}') AS FLOAT64)) as std_val,
            MIN(CAST(JSON_EXTRACT_SCALAR(input_features, '$.{feature_name}') AS FLOAT64)) as min_val,
            MAX(CAST(JSON_EXTRACT_SCALAR(input_features, '$.{feature_name}') AS FLOAT64)) as max_val
        FROM `{prediction_log_table}`
        WHERE timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
    )
    SELECT * FROM training UNION ALL SELECT * FROM serving
    """
    stats = bq_client.query(stats_query).to_dataframe()
    print(f"\nStatistical comparison:")
    print(stats.to_string(index=False))
```

## Step 5: Common Skew Patterns and Fixes

Here are the most common causes of training-serving skew and how to fix them.

**Timezone bugs** - Training data uses UTC timestamps, but the serving pipeline uses local time for feature computation. The fix is to standardize on UTC everywhere.

```python
# Bad: timezone-dependent feature
def compute_hour_of_day(timestamp):
    return timestamp.hour  # Uses local timezone

# Good: explicitly use UTC
def compute_hour_of_day(timestamp):
    return timestamp.astimezone(timezone.utc).hour
```

**Missing value handling** - Training data had nulls filled with mean values from the training set, but serving uses a different imputation strategy.

```python
# Ensure the same imputation values are used at training and serving time
# Save imputation values during training
import json

imputation_values = {
    "age": float(training_df["age"].mean()),
    "income": float(training_df["income"].median()),
    "category": training_df["category"].mode()[0],
}

# Save to a file that both training and serving can access
with open("imputation_values.json", "w") as f:
    json.dump(imputation_values, f)
```

**Feature staleness** - Some features are computed from lookup tables that are updated daily, but the serving pipeline reads from a stale cache.

**Different preprocessing versions** - Training used scikit-learn StandardScaler fitted on the full training set, but serving applies a different normalization.

```python
# Always serialize and reuse the exact same preprocessor
import joblib

# During training: fit and save the preprocessor
scaler = StandardScaler()
scaler.fit(training_data)
joblib.dump(scaler, "scaler.joblib")

# During serving: load the exact same preprocessor
scaler = joblib.load("scaler.joblib")
transformed = scaler.transform(serving_data)
```

## Step 6: Set Up Automated Skew Alerts

The monitoring job can send email alerts directly. If you also want Cloud Monitoring notification channels, pass them to the model monitoring alert configuration when creating or updating the monitoring job.

```python
# alert_on_skew.py
from google.cloud import aiplatform
from google.cloud.aiplatform import model_monitoring

def add_notification_channel(
    monitoring_job_name,
    notification_channel_name,
    notification_emails,
):
    """Route model monitoring anomaly alerts to a Cloud Monitoring channel."""
    aiplatform.init(project="my-project", location="us-central1")
    monitoring_job = aiplatform.ModelDeploymentMonitoringJob(
        model_deployment_monitoring_job_name=monitoring_job_name
    )

    monitoring_job.update(
        alert_config=model_monitoring.AlertConfig(
            user_emails=notification_emails,
            enable_logging=True,
            notification_channels=[notification_channel_name],
        )
    )

    print(f"Alert routing updated: {monitoring_job.resource_name}")
```

## Wrapping Up

Training-serving skew is a silent killer of ML model performance. Unlike data drift, which develops gradually, skew can exist from day one and go unnoticed until someone digs into why the model is underperforming. Vertex AI Model Monitoring gives you the tools to detect it early by comparing production feature distributions against your training baseline. The key is to prepare a good baseline from your training data, set appropriate thresholds for each feature, and investigate promptly when skew is detected. Most of the time, the fix is straightforward once you identify which feature is skewed - it is usually a bug in the feature engineering pipeline.
