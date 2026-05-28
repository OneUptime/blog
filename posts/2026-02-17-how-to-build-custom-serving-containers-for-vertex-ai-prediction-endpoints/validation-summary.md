# Validation Summary: How to Build Custom Serving Containers for Vertex AI Prediction Endpoints

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Vertex AI Prediction
- Vertex AI custom serving containers
- Docker and Artifact Registry
- Flask and gunicorn
- Google Cloud Storage
- Google Cloud CLI
- Vertex AI Python SDK

## Sources Consulted
- Vertex AI custom container requirements for inference: https://docs.cloud.google.com/vertex-ai/docs/predictions/custom-container-requirements
- Vertex AI guide to using a custom container for inference: https://docs.cloud.google.com/vertex-ai/docs/predictions/use-custom-container
- Vertex AI Python SDK Model reference: https://docs.cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.Model
- Vertex AI Python SDK Endpoint reference: https://docs.cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.Endpoint
- Artifact Registry repository creation command reference: https://docs.cloud.google.com/sdk/gcloud/reference/artifacts/repositories/create
- Artifact Registry Docker authentication documentation: https://cloud.google.com/artifact-registry/docs/docker/authentication
- Cloud Logging gcloud read documentation: https://docs.cloud.google.com/sdk/gcloud/reference/logging/read
- Vertex AI online inference logging documentation: https://cloud.google.com/vertex-ai/docs/predictions/online-prediction-logging

## Issues Found
- The main Flask example treated `AIP_STORAGE_URI` as a local filesystem path. Vertex AI sets it to a Cloud Storage URI when `artifact_uri` is provided, so the example would fail to open model files. I added GCS download logic using `google-cloud-storage` and kept a `/models` fallback for local or image-baked artifacts.
- The Dockerfile set `AIP_HTTP_PORT`, `AIP_HEALTH_ROUTE`, and `AIP_PREDICT_ROUTE` manually. Vertex AI documentation says not to manually set `AIP_` environment variables in the image. I removed those `ENV` lines and changed the gunicorn command to read `AIP_HTTP_PORT` at runtime with a local fallback.
- The Dockerfile ran `gunicorn app:app`, but the original code only loaded the model inside the `if __name__ == "__main__"` block. That block is not executed when gunicorn imports `app:app`, so health checks would return 503 and predictions would fail. I moved model loading to module import time.
- The requirements example was missing `google-cloud-storage`, which is needed for the corrected GCS artifact download code. I added the dependency.
- The Artifact Registry creation command claimed to create the repository only if it did not exist, but the command would fail when the repository already existed. I added a `gcloud artifacts repositories describe` guard before creation.
- The advanced model download snippet did not handle folder placeholder blobs and could produce incorrect relative paths when the GCS prefix lacked a trailing slash. I normalized the prefix and skipped empty relative paths.
- The "Multi-Stage Containers" heading was inaccurate because the section showed runtime GCS model download, not a multi-stage Docker build. I changed the heading to "Containers with Model Download."
- A debugging command comment described `gcloud ai models describe` as viewing logs. That command returns model metadata, not container logs. I corrected the comment.

## Review Notes
The examples use older pinned package versions, but the APIs shown remain valid. For production use, the container should also include structured logging and explicit startup behavior for long model downloads, but those are enhancements rather than correctness fixes.
