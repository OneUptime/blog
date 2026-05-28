# Validation Summary: How to Configure Automated Model Retraining Triggered by Data Drift Alerts

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Vertex AI Model Monitoring
- Cloud Monitoring alert policies and notification channels
- Pub/Sub
- Cloud Functions 2nd gen
- Vertex AI Pipelines
- Kubeflow Pipelines SDK
- BigQuery
- Python
- Google Cloud CLI

## Sources Consulted
- Vertex AI Model Monitoring feature skew and drift documentation: https://docs.cloud.google.com/vertex-ai/docs/model-monitoring/using-model-monitoring
- Vertex AI Python SDK `ModelDeploymentMonitoringJob` reference: https://docs.cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.ModelDeploymentMonitoringJob
- Google Cloud metrics reference for Vertex AI model monitoring metrics: https://docs.cloud.google.com/monitoring/api/metrics_gcp_a_b
- Cloud Monitoring notification channel API and Pub/Sub channel examples: https://docs.cloud.google.com/monitoring/alerts/using-channels-api
- Google Cloud CLI `gcloud beta monitoring channels create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/beta/monitoring/channels/create
- Google Cloud CLI `gcloud ai model-monitoring-jobs create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/ai/model-monitoring-jobs/create
- Kubeflow Pipelines SDK DSL reference: https://kubeflow-pipelines.readthedocs.io/en/sdk-2.14.1/source/dsl.html

## Issues Found
- The Vertex AI Model Monitoring Python snippet used `model_monitoring.ThresholdConfig`, which is not part of the current high-level Python SDK API. Replaced those values with plain floats, matching `DriftDetectionConfig` and `SkewDetectionConfig` constructor signatures.
- The monitoring schedule used `monitor_interval=3600`, but the high-level SDK expects the interval in hours and converts it to seconds internally. Changed it to `monitor_interval=1`.
- The `ObjectiveConfig` constructor used REST-style field names (`prediction_drift_detection_config` and `training_prediction_skew_detection_config`) instead of the Python SDK names. Updated them to `drift_detection_config` and `skew_detection_config`.
- The Cloud Monitoring metric type `aiplatform.googleapis.com/prediction/online/feature_attribution_drift_score` was not the documented Vertex AI model monitoring drift metric. Replaced it with `aiplatform.googleapis.com/model_monitoring/feature_drift_deviation`.
- The Pub/Sub notification channel was created after the alert policy that needed its resource name. Reordered the steps so the Pub/Sub topic and notification channel are created before the alert policy.
- The Cloud Monitoring channel command omitted the required beta command group for the documented `channels create` command. Updated it to `gcloud beta monitoring channels create`.
- The Cloud Function deployment set environment variables that the sample code ignored. Updated the function to read `PROJECT_ID`, `LOCATION`, `PIPELINE_TEMPLATE`, and `STAGING_BUCKET` from environment variables, and updated the deploy command accordingly.
- The BigQuery JSON insert attempted to use `"AUTO"` for a timestamp value. Replaced it with an explicit UTC timestamp generated in Python.
- The KFP examples used deprecated `kfp.v2` imports and `dsl.Condition`. Updated them to import from `kfp` directly and use `dsl.If`.
- The comparison component suggested storing decimal metrics in Vertex AI model labels, but Google Cloud labels do not support decimal points in values. Changed the example to store metrics as basis-point integer label values such as `accuracy_bp="9300"`.

## Review Notes
The post remains a simplified architecture example. In a production implementation, the placeholder BigQuery tables (`ml_ops.retraining_log` and `ml_ops.drift_scores`) and undefined pipeline components would need concrete schemas and component implementations.
