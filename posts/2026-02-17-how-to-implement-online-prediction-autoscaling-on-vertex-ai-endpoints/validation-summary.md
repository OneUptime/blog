# Validation Summary: How to Implement Online Prediction Autoscaling on Vertex AI Endpoints

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud Vertex AI
- Vertex AI online prediction endpoints
- Vertex AI autoscaling
- Google Cloud Python client libraries
- Cloud Monitoring metrics

## Sources Consulted
- Vertex AI autoscaling documentation: https://cloud.google.com/vertex-ai/docs/predictions/autoscaling
- Vertex AI Python `Model.deploy` / `Endpoint.deploy` reference: https://cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.Model and https://cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.Endpoint
- Vertex AI Python `EndpointServiceClient.mutate_deployed_model` reference: https://cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform_v1.services.endpoint_service.EndpointServiceClient
- Cloud Monitoring Vertex AI metrics reference: https://cloud.google.com/monitoring/api/metrics_gcp_a_b
- Vertex AI monitoring metrics overview: https://cloud.google.com/vertex-ai/docs/general/monitoring-metrics

## Issues Found
- The post described autoscaling as a simple average-based decision. Updated the explanation to match the documented behavior: Vertex AI computes target replicas from current utilization and target utilization, then uses the highest target value from the previous 5-minute window.
- The low-level API example used the incorrect CPU autoscaling metric name `aiplatform.googleapis.com/prediction/online/cpu_utilization`. Changed it to the documented metric name `aiplatform.googleapis.com/prediction/online/cpu/utilization`.
- The pre-scaling example undeployed and redeployed models to raise the minimum replica count, which can interrupt serving and is unnecessary. Replaced it with `mutate_deployed_model`, which is the documented way to update `min_replica_count` and `max_replica_count` for an existing deployed model.
- The monitoring example queried the incorrect CPU metric name. Changed it to `aiplatform.googleapis.com/prediction/online/cpu/utilization`.
- The scale-to-zero section presented `min_replica_count=0` as a normal high-level SDK deployment and described the first request as only having cold-start latency. Updated it to identify Scale To Zero as a preview feature, use the v1beta1 API client, and clarify that requests sent while scaled down receive a 429 response while scale-up starts.

## Review Notes
The Python snippets were syntax-checked with `ast`. The Google Cloud client libraries are not installed in this workspace, so import/runtime verification could not be performed locally.
