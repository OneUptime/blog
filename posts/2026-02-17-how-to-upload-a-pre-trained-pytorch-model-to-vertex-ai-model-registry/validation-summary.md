# Validation Summary: How to Upload a Pre-Trained PyTorch Model to Vertex AI Model Registry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Vertex AI Model Registry
- Vertex AI prediction pre-built containers
- Google Cloud Storage
- PyTorch and TorchScript
- TorchServe and torch-model-archiver
- Flask custom inference containers
- Vertex AI Python SDK

## Sources Consulted
- Google Cloud Vertex AI pre-built containers for inference and explanation: https://docs.cloud.google.com/vertex-ai/docs/predictions/pre-built-containers
- Google Cloud Vertex AI model artifact export requirements for PyTorch: https://docs.cloud.google.com/vertex-ai/docs/training/exporting-model-artifacts
- Google Cloud Vertex AI custom container requirements and routes: https://docs.cloud.google.com/vertex-ai/docs/predictions/custom-container-requirements
- Google Cloud Vertex AI custom container usage: https://docs.cloud.google.com/vertex-ai/docs/predictions/use-custom-container
- Google Cloud Vertex AI Python SDK Model reference: https://docs.cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.Model
- Google Cloud SDK gcloud storage cp reference: https://cloud.google.com/sdk/gcloud/reference/storage/cp
- PyTorch torch.jit.trace documentation: https://docs.pytorch.org/docs/stable/generated/torch.jit.trace.html
- PyTorch serialization documentation: https://docs.pytorch.org/docs/stable/notes/serialization.html
- TorchServe custom service documentation: https://docs.pytorch.org/serve/custom_service.html

## Issues Found
- The post described "standard PyTorch save convention" as compatible with the Vertex AI pre-built PyTorch serving container. Updated the text to clarify that the pre-built PyTorch prediction container expects a TorchServe model archive.
- The TorchServe archive was created as `image-classifier.mar`, but Vertex AI's pre-built PyTorch images expect the archive to be named `model.mar`. Changed `--model-name` to `model` and updated the resulting file path.
- The GCS upload command used `gsutil mkdir` for a Cloud Storage directory and uploaded the old `.mar` name. Replaced it with `gcloud storage cp model-store/model.mar gs://your-bucket/models/image-classifier/1/model.mar`.
- The serving container image used `pytorch-gpu.2-1`, which is past its documented availability window as of 2026-05-27. Updated examples to use the currently available `pytorch-gpu.2-4` image.
- The Flask custom container example referenced `ImageClassifier` without importing or defining it. Added `from model_definition import ImageClassifier` and noted that the class should live in `model_definition.py`.
- The custom container example defined `/predict` and `/health` routes but did not mention the corresponding Vertex AI route settings. Added the required `serving_container_predict_route`, `serving_container_health_route`, and `serving_container_ports` values.
- Removed an unused `numpy` import from the Flask example to avoid an unnecessary runtime dependency.

## Review Notes
- TorchServe documentation currently carries a limited-maintenance notice, so teams may prefer a custom container for long-lived production systems even though Vertex AI's pre-built PyTorch container still expects TorchServe `.mar` artifacts.
- The examples are syntactically valid, but they remain illustrative placeholders and require project IDs, bucket names, model IDs, dependencies, IAM permissions, and built container images to be supplied by the reader.
