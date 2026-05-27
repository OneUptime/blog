# Validation Summary: How to Set Up Vertex AI Model Monitoring for Data Drift Detection in Production

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Vertex AI Model Monitoring
- Vertex AI Endpoints
- Google Cloud Python SDK
- BigQuery
- Cloud Monitoring notification channels
- Cloud Logging

## Sources Consulted
- Google Cloud Vertex AI documentation: Monitor feature skew and drift: https://docs.cloud.google.com/vertex-ai/docs/model-monitoring/using-model-monitoring
- Google Cloud Python SDK reference: ModelDeploymentMonitoringJob: https://docs.cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.ModelDeploymentMonitoringJob
- Google Cloud Python SDK reference: ModelMonitoringObjectiveConfig: https://cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform_v1.types.ModelMonitoringObjectiveConfig
- Google Cloud Python SDK reference: TrainingPredictionSkewDetectionConfig: https://docs.cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform_v1.types.ModelMonitoringObjectiveConfig.TrainingPredictionSkewDetectionConfig
- Google Cloud Python SDK reference: PredictionDriftDetectionConfig: https://cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform_v1.types.ModelMonitoringObjectiveConfig.PredictionDriftDetectionConfig
- Google Cloud Monitoring API documentation: Notification channels create: https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.notificationChannels/create
- Google Cloud Vertex AI documentation: Online inference logging: https://docs.cloud.google.com/vertex-ai/docs/predictions/online-prediction-logging

## Issues Found
- The introduction said Vertex AI compares all prediction requests against the training-data baseline. Updated it to distinguish training-serving skew, which compares production features to training data, from prediction drift, which compares production traffic across time windows.
- Step 1 claimed monitoring was configured during deployment, but the code only deployed a model to an endpoint. Updated the text and comments to make deployment and monitoring job creation separate steps.
- The deployment example assigned the return value of `endpoint.deploy()` to `deployed_model`, but the SDK deploy method does not return a deployed model object. Updated the example to refresh the endpoint and read the deployed model ID from `endpoint.gca_resource.deployed_models`.
- The monitoring job example used `RandomSampleConfig` as a training dataset and passed nonexistent `model_monitoring.ThresholdConfig` objects. Updated it to use `SkewDetectionConfig(data_source=..., target_field=..., skew_thresholds={...})`, float threshold values, and `ObjectiveConfig(skew_detection_config=..., drift_detection_config=...)`.
- The schedule example used `monitor_interval=3600`, but the Python helper expects hours and converts to seconds internally. Changed it to `monitor_interval=1`.
- The example described `stats_anomalies_base_directory` as BigQuery storage. Corrected it to Cloud Storage for statistics and anomaly artifacts.
- The alert-routing example created a Cloud Monitoring notification channel but never connected it to the model monitoring job. Added an update example using `model_monitoring.AlertConfig(..., notification_channels=[...])`.
- The drift analysis example called `monitoring_job.list_anomalies()`, which is not part of the documented SDK surface. Replaced it with a Cloud Logging query for `model_monitoring_anomaly` entries.
- The BigQuery dashboard example assumed a custom `monitoring_results` table and drift-score schema that Vertex AI does not create. Replaced it with a documented Cloud Logging filter and explained that sampled prediction requests are written to the generated `model_deployment_monitoring_ENDPOINT_ID.serving_predict` table.
- The output drift example implied online endpoint Model Monitoring directly supports prediction-output drift through `DriftDetectionConfig`. Updated it to clarify that this monitoring job covers input feature skew and drift, and that output drift requires separate request-response or application-level prediction logging.

## Review Notes
Vertex AI documentation now points readers toward Gemini Enterprise Agent Platform documentation for the most up-to-date product information, but the referenced Vertex AI Model Monitoring pages remain available and were last updated in May 2026. The post now uses the Model Monitoring v1 endpoint job APIs consistently; future revisions could add a separate Model Monitoring v2 section if the blog wants to cover output drift natively.
