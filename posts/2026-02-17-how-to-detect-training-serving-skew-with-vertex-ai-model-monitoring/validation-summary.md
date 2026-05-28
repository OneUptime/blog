# Validation Summary: How to Detect Training-Serving Skew with Vertex AI Model Monitoring

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Vertex AI Model Monitoring
- Vertex AI Endpoints
- Google Cloud Python SDK
- BigQuery
- Cloud Storage
- Cloud Monitoring notification channels
- Cloud Logging

## Sources Consulted
- Google Cloud Vertex AI documentation: Monitor feature skew and drift: https://docs.cloud.google.com/vertex-ai/docs/model-monitoring/using-model-monitoring
- Google Cloud Vertex AI documentation: Introduction to Vertex AI Model Monitoring: https://docs.cloud.google.com/vertex-ai/docs/model-monitoring/overview
- Google Cloud Vertex AI documentation: Set up model monitoring: https://docs.cloud.google.com/vertex-ai/docs/model-monitoring/set-up-model-monitoring
- Google Cloud Python SDK reference: ModelDeploymentMonitoringJob: https://docs.cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.ModelDeploymentMonitoringJob
- Google Cloud Python SDK reference: ModelMonitoringObjectiveConfig and TrainingPredictionSkewDetectionConfig: https://docs.cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform_v1.types.ModelMonitoringObjectiveConfig
- Google Cloud Monitoring metric documentation: Google Cloud metrics for Vertex AI: https://docs.cloud.google.com/monitoring/api/metrics_gcp_p_z
- Google Cloud Logging documentation: Configure log-based alerting policies: https://cloud.google.com/logging/docs/alerting/log-based-alerts
- Google Cloud Monitoring Python SDK reference: AlertPolicy.Condition.LogMatch: https://cloud.google.com/python/docs/reference/monitoring/latest/google.cloud.monitoring_v3.types.AlertPolicy.Condition.LogMatch

## Issues Found
- The baseline preparation section implied that a hand-written JSON statistics file was the Vertex AI baseline. Updated it to clarify that Vertex AI computes baseline distributions from the raw training data, while the summary statistics are optional for human inspection.
- The monitoring job example used nonexistent `model_monitoring.ThresholdConfig` objects. Replaced them with float threshold values, which match the current Vertex AI SDK helper API.
- The skew configuration omitted `target_field`, which is required for training-serving skew detection so Vertex AI can exclude the prediction target from feature monitoring. Added `target_field` to the function and example call.
- The `ObjectiveConfig` call used the wrong field name for the SDK helper. Updated it to `skew_detection_config=skew_config`.
- The schedule example passed `monitor_interval=3600`, but the Python helper takes the interval in hours. Changed it to `monitor_interval=1` for hourly monitoring.
- The skew metrics section said categorical skew uses Jensen-Shannon divergence and described scores as always ranging from 0 to 1. Updated it to state that the v1 endpoint monitoring API uses L-infinity distance for categorical features and Jensen-Shannon divergence for numerical features, and avoided an unsupported universal maximum-score claim.
- The Cloud Monitoring alert example referenced an undocumented `aiplatform.googleapis.com/prediction/online/skew_score` metric. Replaced it with the supported model monitoring alert configuration that sends anomaly alerts to email and Cloud Monitoring notification channels.

## Review Notes
The post now uses the Vertex AI endpoint Model Monitoring v1 job API consistently. Vertex AI documentation also describes Model Monitoring v2, which has a different model-monitor and monitoring-job workflow; future updates could add a separate v2 section, but mixing the two APIs in this tutorial would be confusing.
