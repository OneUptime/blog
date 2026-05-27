# How to Set Up Vertex AI Model Monitoring for Data Drift Detection in Production

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Vertex AI, Model Monitoring, Data Drift, MLOps, Google Cloud

Description: Learn how to set up Vertex AI Model Monitoring to detect data drift and feature skew in production machine learning models on Google Cloud Platform.

---

You have trained a machine learning model, deployed it to production, and it is serving predictions. Congratulations. But here is the thing nobody tells you when you are learning ML - your model starts degrading the moment you deploy it. The world changes, user behavior shifts, and the data your model sees in production drifts away from what it was trained on. This is called data drift, and if you do not detect it, your model will silently become less accurate over time.

Vertex AI Model Monitoring solves this problem by continuously analyzing the prediction requests your model receives. For training-serving skew, it compares production feature distributions against your training data. For prediction drift, it compares recent production traffic against earlier production traffic. When the distributions diverge beyond a threshold you set, it alerts you. Let me show you how to set this up.

## Understanding Data Drift vs Feature Skew

Before configuring monitoring, let me clarify two related but different concepts:

**Data Drift (Prediction Drift)** - The distribution of input features changes over time compared to earlier prediction requests. For example, if your model was trained on data where the average customer age was 35, and now you are seeing an average age of 55, that is data drift.

**Training-Serving Skew** - The distribution of features in production differs from the distribution in your training data. This can happen from day one if your training data is not representative of production traffic.

Vertex AI Model Monitoring can detect both.

## Step 1: Deploy Your Model to an Endpoint

First, you need a model deployed to a Vertex AI Endpoint. The monitoring job is created after deployment and attached to this endpoint.

```python
# deploy_with_monitoring.py

from google.cloud import aiplatform

# Initialize the Vertex AI client
aiplatform.init(project="my-project", location="us-central1")

# Reference your trained model
model = aiplatform.Model("projects/my-project/locations/us-central1/models/MODEL_ID")

# Create the endpoint
endpoint = aiplatform.Endpoint.create(
    display_name="my-model-endpoint",
    description="Production endpoint with drift monitoring"
)

# Deploy the model to the endpoint
endpoint.deploy(
    model=model,
    deployed_model_display_name="my-model-v1",
    machine_type="n1-standard-4",
    min_replica_count=1,
    max_replica_count=5,
    traffic_percentage=100,
)

# Get the deployed model ID for the monitoring job
endpoint = aiplatform.Endpoint(endpoint.resource_name)
deployed_model_id = endpoint.gca_resource.deployed_models[-1].id

print(f"Model deployed to endpoint: {endpoint.resource_name}")
print(f"Deployed model ID: {deployed_model_id}")
```

## Step 2: Create the Monitoring Job

Now create a model monitoring job that watches for drift. You need to specify the training dataset as a baseline and configure the drift thresholds.

```python
# create_monitoring_job.py
from google.cloud import aiplatform
from google.cloud.aiplatform import model_monitoring

aiplatform.init(project="my-project", location="us-central1")

endpoint = aiplatform.Endpoint(
    "projects/my-project/locations/us-central1/endpoints/ENDPOINT_ID"
)
deployed_model_id = "DEPLOYED_MODEL_ID"

# Configure skew detection for specific features
# Set thresholds that trigger alerts when exceeded
skew_config = model_monitoring.SkewDetectionConfig(
    data_source="bq://my-project.ml_dataset.training_baseline",
    target_field="predicted_class",
    skew_thresholds={
        # Feature name: threshold value
        # Lower thresholds mean more sensitive detection
        "age": 0.3,
        "income": 0.3,
        "purchase_frequency": 0.2,
        "category": 0.3,
    }
)

# Configure drift detection to compare recent predictions
# against earlier predictions
drift_config = model_monitoring.DriftDetectionConfig(
    drift_thresholds={
        "age": 0.3,
        "income": 0.3,
        "purchase_frequency": 0.2,
        "category": 0.3,
    }
)

# Configure where to send alerts
email_config = model_monitoring.EmailAlertConfig(
    user_emails=["ml-team@company.com"],
    enable_logging=True
)

# Set up the objective config combining skew and drift detection
objective_config = model_monitoring.ObjectiveConfig(
    skew_detection_config=skew_config,
    drift_detection_config=drift_config,
)

# Create the monitoring job
monitoring_job = aiplatform.ModelDeploymentMonitoringJob.create(
    display_name="my-model-drift-monitor",
    endpoint=endpoint,
    logging_sampling_strategy=model_monitoring.RandomSampleConfig(
        sample_rate=0.5  # Sample 50% of predictions for monitoring
    ),
    schedule_config=model_monitoring.ScheduleConfig(
        monitor_interval=1  # Check every hour
    ),
    alert_config=email_config,
    objective_configs={
        deployed_model_id: objective_config
    },
    # Store statistics and anomaly artifacts in Cloud Storage
    stats_anomalies_base_directory="gs://my-bucket/monitoring-output/",
)

print(f"Monitoring job created: {monitoring_job.resource_name}")
```

## Step 3: Configure the Training Dataset Baseline

The quality of your drift detection depends heavily on having a good baseline. Your training dataset should be stored in a format that Vertex AI can analyze.

```python
# prepare_baseline.py
from google.cloud import bigquery

client = bigquery.Client()

# Export your training features to BigQuery for use as a baseline
# This query selects the feature columns from your training data
query = """
CREATE OR REPLACE TABLE `ml_dataset.training_baseline` AS
SELECT
    age,
    income,
    purchase_frequency,
    category,
    -- Include the prediction target so Vertex AI can exclude it from skew analysis
    predicted_class
FROM
    `ml_dataset.training_data`
WHERE
    -- Use the most recent training data as baseline
    split = 'train'
"""

job = client.query(query)
job.result()
print("Baseline table created successfully")
```

## Step 4: Set Up Alert Routing

Email alerts are fine for starters, but in production you want alerts to flow into your incident management system. Use Cloud Monitoring notification channels for this.

```python
# setup_alerts.py
from google.cloud import monitoring_v3

client = monitoring_v3.NotificationChannelServiceClient()
project_name = f"projects/my-project"

# Create a PagerDuty notification channel for critical drift alerts
channel = monitoring_v3.NotificationChannel(
    type_="pagerduty",
    display_name="ML Model Drift Alerts",
    labels={
        "service_key": "your-pagerduty-service-key"
    }
)

created_channel = client.create_notification_channel(
    name=project_name,
    notification_channel=channel
)
print(f"Notification channel created: {created_channel.name}")

# Add the notification channel to the existing monitoring job
from google.cloud import aiplatform
from google.cloud.aiplatform import model_monitoring

aiplatform.init(project="my-project", location="us-central1")

monitoring_job = aiplatform.ModelDeploymentMonitoringJob(
    "projects/my-project/locations/us-central1/modelDeploymentMonitoringJobs/JOB_ID"
)

monitoring_job.update(
    alert_config=model_monitoring.AlertConfig(
        user_emails=["ml-team@company.com"],
        enable_logging=True,
        notification_channels=[created_channel.name],
    )
)
```

## Step 5: Analyze Drift Results

When drift is detected, you need to investigate which features drifted and by how much. Vertex AI stores monitoring results that you can query.

```python
# analyze_drift.py
from google.cloud import logging_v2

client = logging_v2.Client(project="my-project")

filter_ = """
resource.type="aiplatform.googleapis.com/ModelDeploymentMonitoringJob"
logName="projects/my-project/logs/aiplatform.googleapis.com%2Fmodel_monitoring_anomaly"
jsonPayload.modelDeploymentMonitoringJob="projects/my-project/locations/us-central1/modelDeploymentMonitoringJobs/JOB_ID"
"""

# Read recent anomaly logs emitted by the monitoring job
entries = client.list_entries(filter_=filter_, order_by=logging_v2.DESCENDING)

for entry in entries:
    payload = entry.payload
    print(f"Monitoring job: {payload.get('modelDeploymentMonitoringJob')}")
    print(f"Deployed model: {payload.get('deployedModelId')}")
    print(f"Anomaly objective: {payload.get('anomalyObjective')}")
    for anomaly in payload.get("featureAnomalies", []):
        print(f"  Feature: {anomaly.get('featureDisplayName')}")
        print(f"  Deviation: {anomaly.get('deviation')}")
        print(f"  Threshold: {anomaly.get('threshold')}")
    print("---")
```

## Step 6: Visualize Drift Trends Over Time

Vertex AI writes sampled prediction requests to a generated BigQuery table named like `PROJECT_ID.model_deployment_monitoring_ENDPOINT_ID.serving_predict`. To visualize drift results, use the feature histograms in the Vertex AI console, or export anomaly logs to Cloud Monitoring metrics or BigQuery for dashboards. Start with this Logs Explorer filter:

```text
resource.type="aiplatform.googleapis.com/ModelDeploymentMonitoringJob"
logName="projects/my-project/logs/aiplatform.googleapis.com%2Fmodel_monitoring_anomaly"
jsonPayload.totalAnomaliesCount>0
```

## Choosing the Right Thresholds

Setting drift thresholds is more art than science. Here are guidelines I follow:

- Start with a threshold of 0.3 for most features and observe for a week
- Lower the threshold for features that are critical to model performance
- Raise the threshold for features with high natural variance (like daily metrics)
- Use different thresholds for different features based on their importance

A threshold that is too low will generate too many false alarms. A threshold that is too high will miss real drift. It takes iteration to get right.

## Monitoring Output Drift

In addition to monitoring input features, you should monitor the distribution of your model's predictions. Vertex AI Model Monitoring for online endpoints monitors input feature skew and drift; for output drift, enable endpoint request-response logging where it is supported or log predictions from your application, then query those logs separately. If the model suddenly starts predicting one class much more frequently, that is a sign something has changed.

```sql
-- Example output drift check against your own prediction log table
SELECT
    TIMESTAMP_TRUNC(prediction_time, HOUR) AS prediction_hour,
    predicted_class,
    COUNT(*) AS prediction_count
FROM
    `my-project.ml_dataset.prediction_logs`
WHERE
    prediction_time > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
GROUP BY
    prediction_hour, predicted_class
ORDER BY
    prediction_hour DESC, prediction_count DESC;
```

## Wrapping Up

Setting up model monitoring is not optional for production ML systems. Data drift will happen, and without monitoring, you will not know until users complain about bad predictions. Vertex AI Model Monitoring gives you the tools to detect drift early - before it impacts your users. Start with basic skew and drift detection, tune your thresholds based on what you observe, and integrate alerts with your incident management workflow. The goal is to catch drift early enough that you can retrain your model before performance degrades noticeably.
