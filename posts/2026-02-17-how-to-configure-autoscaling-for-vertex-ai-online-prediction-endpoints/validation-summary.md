# Validation Summary: How to Configure Autoscaling for Vertex AI Online Prediction Endpoints

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Vertex AI
- Vertex AI Online Prediction endpoints
- Vertex AI SDK for Python
- Google Cloud CLI
- Cloud Monitoring
- REST API for Vertex AI endpoints

## Sources Consulted
- Vertex AI: Scale inference nodes by using autoscaling: https://docs.cloud.google.com/vertex-ai/docs/predictions/autoscaling
- Google Cloud CLI reference for `gcloud ai endpoints deploy-model`: https://docs.cloud.google.com/sdk/gcloud/reference/ai/endpoints/deploy-model
- Vertex AI Python SDK `Model.deploy` reference: https://docs.cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.Model
- Vertex AI Python SDK `Endpoint` reference: https://docs.cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.Endpoint
- Cloud Monitoring Google Cloud metrics reference: https://cloud.google.com/monitoring/api/metrics_gcp_a_b

## Issues Found
- The `gcloud ai endpoints deploy-model` example used `--autoscaling-metric-specs=metric-name=aiplatform.googleapis.com/prediction/online/cpu/utilization,target=60`, but the current gcloud CLI expects short metric keywords such as `cpu-usage=60`. Updated the command to `--autoscaling-metric-specs=cpu-usage=60`.
- The post stated that changing autoscaling parameters on an already-deployed model requires undeploying and redeploying. Vertex AI supports updating deployed model autoscaling fields with the `mutateDeployedModel` API. Replaced the undeploy/redeploy example with a `PATCH ...:mutateDeployedModel` example that updates `minReplicaCount`, `maxReplicaCount`, and `autoscalingMetricSpecs`.

## Review Notes
The remaining Python SDK parameters, autoscaling metric names, monitoring metric names, and general scaling behavior matched the official documentation. Scale-to-zero exists in Preview, but the post's use of `min_replica_count=1` remains valid for normal deployments.
