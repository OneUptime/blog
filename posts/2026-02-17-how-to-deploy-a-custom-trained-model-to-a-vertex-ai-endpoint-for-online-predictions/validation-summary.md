# Validation Summary: How to Deploy a Custom-Trained Model to a Vertex AI Endpoint

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Vertex AI
- Vertex AI Python SDK
- Vertex AI Model Registry
- Vertex AI Endpoints and online prediction
- Vertex AI prebuilt TensorFlow serving containers
- Vertex AI Model Monitoring
- Google Cloud CLI authentication for REST requests
- Python
- curl

## Sources Consulted
- Vertex AI Python SDK `Model.upload` and `Model.deploy` reference: https://docs.cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.Model
- Vertex AI Python SDK `Endpoint.create`, `Endpoint.predict`, `Endpoint.undeploy_all`, and `Endpoint.delete` reference: https://docs.cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.Endpoint
- Vertex AI Python SDK `ModelDeploymentMonitoringJob.create` reference: https://docs.cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.ModelDeploymentMonitoringJob
- Vertex AI prebuilt containers for inference: https://docs.cloud.google.com/vertex-ai/docs/predictions/pre-built-containers
- Vertex AI deploy a model to an endpoint documentation: https://cloud.google.com/vertex-ai/docs/general/deployment
- Vertex AI deploy a model by using gcloud CLI or Vertex AI API documentation: https://cloud.google.com/vertex-ai/docs/predictions/deploy-model-api
- Vertex AI get inferences from a custom trained model documentation: https://docs.cloud.google.com/vertex-ai/docs/predictions/get-predictions
- Vertex AI configure compute resources for inference documentation: https://docs.cloud.google.com/vertex-ai/docs/predictions/configure-compute
- Vertex AI model monitoring documentation: https://cloud.google.com/vertex-ai/docs/model-monitoring/using-model-monitoring

## Issues Found
- The TensorFlow serving image used `tf2-gpu.2-14:latest`. That image is still listed, but TensorFlow 2.14 has passed its patch and support date. Updated all examples to `us-docker.pkg.dev/vertex-ai/prediction/tf2-gpu.2-15:latest`, which is listed in the current Vertex AI prebuilt inference container documentation and remains within its support window.
- The model monitoring snippet passed REST-shaped dictionaries to `logging_sampling_strategy` and `schedule_config`, and omitted an objective configuration. Updated the snippet to use the Vertex AI Python SDK `model_monitoring.RandomSampleConfig`, `ScheduleConfig`, `ObjectiveConfig`, and `DriftDetectionConfig` helper classes.
- The monitoring prose implied model monitoring applies generally. Updated it to clarify that model monitoring depends on supported models and schemas.

## Review Notes
- The deployment, endpoint creation, prediction, REST prediction, traffic split, and cleanup examples match the current Vertex AI Python SDK and REST API shapes.
- The monitoring example still needs the drift threshold feature name adjusted to match the deployed model's actual prediction/request schema.
