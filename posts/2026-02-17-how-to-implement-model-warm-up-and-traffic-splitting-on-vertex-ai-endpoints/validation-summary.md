# Validation Summary: How to Implement Model Warm-Up and Traffic Splitting on Vertex AI Endpoints

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud Vertex AI Endpoints
- Vertex AI Python SDK
- Vertex AI custom prediction containers
- TensorFlow Serving SavedModel warmup
- TensorFlow / Keras
- Flask
- Cloud Monitoring
- Vertex AI autoscaling and traffic splitting

## Sources Consulted
- TensorFlow Serving SavedModel Warmup: https://www.tensorflow.org/tfx/serving/saved_model_warmup
- Vertex AI custom container requirements for inference: https://cloud.google.com/vertex-ai/docs/predictions/custom-container-requirements
- Vertex AI model deployment with gcloud, REST, and Python SDK: https://cloud.google.com/vertex-ai/docs/predictions/deploy-model-api
- Vertex AI Python SDK `Model.deploy` reference: https://cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.Model
- Vertex AI Python SDK `Endpoint.update` reference: https://cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.Endpoint
- Vertex AI autoscaling for inference: https://cloud.google.com/vertex-ai/docs/predictions/autoscaling
- Cloud Monitoring Google Cloud metrics list for Vertex AI endpoint metrics: https://cloud.google.com/monitoring/api/metrics_gcp_a_b
- Cloud Monitoring monitored resource types for `aiplatform.googleapis.com/Endpoint`: https://cloud.google.com/monitoring/api/resources

## Issues Found
- The custom Flask warm-up example used hard-coded `/health` and `/predict` routes. Vertex AI sends health and prediction requests to the configured container routes, exposed as `AIP_HEALTH_ROUTE` and `AIP_PREDICT_ROUTE`. Updated the sample to bind those environment-variable routes with local fallbacks.
- The Flask sample warmed the model before starting the HTTP server, so the health endpoint could not actually return 503 during warm-up and a long warm-up could fail Vertex AI liveness checks. Updated the sample to start warm-up in a background thread while the server answers health checks with 503 until ready.
- The traffic split setup deployed the first model with `traffic_percentage=90` on a new endpoint. Updated it to deploy the first model at 100%, then deploy the canary at 10%, allowing the SDK to scale the existing deployment down to a 90/10 split.
- The rollout example used ambiguous `model_id` names for traffic split keys. Vertex AI traffic splits use DeployedModel IDs, not Model Registry model IDs. Renamed variables and clarified the required IDs.
- The monitoring example referenced an undefined `get_metric` helper. Replaced it with a Cloud Monitoring helper that queries the documented Vertex AI endpoint metrics and filters total latency by `metric.labels.latency_type="total"`.

## Review Notes
All Python snippets were syntax-checked with `ast.parse`. The TensorFlow Serving warm-up file path, TFRecord `PredictionLog` format, and the `<= 1000` warm-up record limit were verified against TensorFlow Serving documentation; the post uses 100 records, which is within the documented limit.
