# Validation Summary: How to Deploy a FastAPI Application on Cloud Run

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- FastAPI
- Pydantic
- Python
- Uvicorn
- Docker
- Google Cloud Run
- Google Artifact Registry
- Google Cloud Build
- Google Cloud SQL
- SQLAlchemy
- CORS
- Cloud Logging

## Sources Consulted
- FastAPI metadata and documentation URL configuration: https://fastapi.tiangolo.com/tutorial/metadata/
- FastAPI CORS tutorial: https://fastapi.tiangolo.com/tutorial/cors/
- FastAPI behind-a-proxy/root_path documentation: https://fastapi.tiangolo.com/advanced/behind-a-proxy/
- Uvicorn settings documentation: https://www.uvicorn.org/settings/
- Cloud Run container runtime contract: https://docs.cloud.google.com/run/docs/container-contract
- gcloud run deploy reference: https://cloud.google.com/sdk/gcloud/reference/run/deploy
- gcloud builds submit reference: https://cloud.google.com/sdk/gcloud/reference/builds/submit
- Artifact Registry Docker repository quickstart/reference: https://docs.cloud.google.com/artifact-registry/docs/docker/store-docker-container-images
- gcloud artifacts repositories create reference: https://docs.cloud.google.com/sdk/gcloud/reference/artifacts/repositories/create
- Cloud Run to Cloud SQL connection documentation: https://cloud.google.com/sql/docs/postgres/connect-run
- Cloud Build substitutions documentation: https://cloud.google.com/build/docs/configuring-builds/substitute-variable-values
- Python 3.12 datetime deprecations: https://docs.python.org/3.12/whatsnew/3.12.html
- SQLAlchemy engine and pooling documentation: https://docs.sqlalchemy.org/en/20/core/engines.html

## Issues Found
- The main FastAPI example used `datetime.utcnow()`. Python 3.12 deprecates `datetime.utcnow()` in favor of timezone-aware UTC datetimes, so the example now imports `UTC` and uses `datetime.now(UTC)`.
- The Dockerfile comment said Uvicorn reads the Cloud Run `PORT` environment variable. In the shown shell-form `CMD`, the shell expands `${PORT}` before starting Uvicorn, so the comment was corrected.
- The root path snippet said Cloud Run sets `ROOT_PATH` behind a load balancer. Cloud Run injects `PORT`, but it does not automatically set a FastAPI `ROOT_PATH`; the comment now says to set it yourself when routing through a path prefix.
- The production docs-disabling snippet disabled Swagger UI and ReDoc but left `/openapi.json` enabled. The snippet now disables `openapi_url` with the same `ENABLE_DOCS` flag when the docs are disabled.

## Review Notes
- The `gcloud` CLI was not installed in the local environment, so command validation was performed against official Google Cloud SDK and product documentation rather than local `--help` output.
- The Python snippets were parsed successfully with Python 3.12 after the edits.
- The pinned FastAPI, Uvicorn, and Pydantic versions are older than current releases but are still coherent with the sample code and Pydantic v2 usage.
