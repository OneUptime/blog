# Validation Summary: How to Build a Machine Learning Prediction API with Vertex AI and FastAPI

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Vertex AI
- FastAPI
- Pydantic
- Cloud Run
- Cloud Build
- Artifact Registry
- Docker
- Google Cloud CLI

## Sources Consulted
- Vertex AI Python SDK Endpoint reference: https://docs.cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.Endpoint
- Cloud Run container runtime contract: https://docs.cloud.google.com/run/docs/container-contract
- Cloud Run service identity documentation: https://docs.cloud.google.com/run/docs/securing/service-identity
- Cloud Run service identity configuration: https://cloud.google.com/run/docs/configuring/services/service-identity
- gcloud run deploy reference: https://docs.cloud.google.com/sdk/gcloud/reference/run/deploy
- gcloud builds submit reference: https://docs.cloud.google.com/sdk/gcloud/reference/builds/submit
- Artifact Registry Container Registry shutdown guidance: https://docs.cloud.google.com/artifact-registry/docs/transition/prepare-gcr-shutdown
- gcloud artifacts repositories create reference: https://docs.cloud.google.com/sdk/gcloud/reference/artifacts/repositories/create
- Vertex AI IAM roles and permissions: https://docs.cloud.google.com/iam/docs/roles-permissions/aiplatform
- FastAPI async documentation: https://fastapi.tiangolo.com/async/
- Pydantic v2 model configuration documentation: https://docs.pydantic.dev/2.5/concepts/config/
- Pydantic Field API documentation: https://docs.pydantic.dev/latest/api/fields/
- OneUptime website: https://oneuptime.com/

## Issues Found
- The prerequisites claimed to show a quick way to deploy a pre-built model, but the snippet only installed packages and enabled APIs. Updated the wording to accurately describe the setup commands.
- The API enablement command only enabled Vertex AI, but the tutorial also uses Artifact Registry, Cloud Build, IAM, and Cloud Run. Added the missing APIs.
- The Pydantic example used class-based `Config`, which is deprecated in Pydantic v2. Replaced it with `ConfigDict` and `model_config`.
- The request schema included `model_version`, but the code never used it and `Endpoint.predict()` does not select a model version with that field. Removed the unused field from the schema and example.
- The FastAPI prediction routes were declared with `async def` while calling the synchronous Vertex AI SDK `Endpoint.predict()` method. Changed those handlers to regular `def` functions so FastAPI can run the blocking calls in its threadpool.
- The batch prediction endpoint did not check whether `VERTEX_ENDPOINT_ID` was configured before constructing the Vertex AI endpoint. Added the same explicit configuration check used by the single prediction endpoint.
- The Dockerfile hard-coded port `8080` in the command even though Cloud Run provides the `PORT` environment variable. Updated the command to use `${PORT:-8080}`.
- The deployment commands used `gcr.io`, which is tied to deprecated Container Registry workflows. Replaced the image path with an Artifact Registry `us-central1-docker.pkg.dev` path and added a repository creation command.
- The deployment commands did not configure a Cloud Run runtime service account with permission to call Vertex AI. Added a user-managed service account, granted `roles/aiplatform.user`, and deployed Cloud Run with `--service-account`.

## Review Notes
The tutorial still uses pinned package versions from the original post. They are compatible with the corrected examples, but future maintenance should consider refreshing the pins and testing the full sample against the current FastAPI, Pydantic, and `google-cloud-aiplatform` releases.
