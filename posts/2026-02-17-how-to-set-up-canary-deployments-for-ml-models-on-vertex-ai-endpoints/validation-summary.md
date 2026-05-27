# Validation Summary: How to Set Up Canary Deployments for ML Models on Vertex AI Endpoints

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Vertex AI Endpoints
- Vertex AI SDK for Python
- Cloud Monitoring metrics
- BigQuery request-response logging
- Python
- MLOps canary deployment patterns

## Sources Consulted
- Vertex AI deployment overview: https://cloud.google.com/vertex-ai/docs/general/deployment
- Vertex AI SDK `Model.deploy` reference: https://cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.Model
- Vertex AI SDK `Endpoint` reference: https://cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.Endpoint
- Vertex AI online inference logging documentation: https://cloud.google.com/vertex-ai/docs/predictions/online-prediction-logging
- Cloud Monitoring Vertex AI metrics documentation: https://cloud.google.com/monitoring/api/metrics_gcp_a_b
- Cloud Monitoring metrics for Vertex AI: https://cloud.google.com/vertex-ai/docs/general/monitoring-metrics

## Issues Found
- The health monitor claimed to compare canary and production metrics, but the Cloud Monitoring filters only selected the endpoint. I updated the deployment workflow to capture deployed model IDs and changed the monitoring filters to use `metric.labels.deployed_model_id`, which is the documented label for Vertex AI endpoint metrics.
- The latency method returned a placeholder `0.0`, so the latency health check could never detect a real regression. I changed it to query `prediction/online/prediction_latencies` with the documented `deployed_model_id` and `latency_type` labels, using a p95 aligner.
- The BigQuery accuracy query used fields that do not match the documented request-response logging schema (`response` and `deployed_model_display_name`). I updated it to use `response_payload`, `deployed_model_id`, and a parameterized query.
- The traffic-split examples could create invalid splits if more than one production model was deployed, because the percentages could add up to more than 100. I updated the traffic manager to distribute the production share across all non-canary deployed models.
- The deployment example did not capture the newly created canary deployed model ID. I updated it to use the `Endpoint` returned from `Model.deploy()` and locate the deployed model by display name.
- Removed an unused `json` import from the deployment snippet.

## Review Notes
The post is technically valid after edits. The examples still assume a simple production setup and a custom BigQuery ground-truth table, so a future improvement would be to show how that table is populated and how to handle multiple production models as separate baselines instead of comparing only the first production deployed model.
