# Validation Summary: How to Build Multi-Stage Docker Images for Python Applications

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker and Docker multi-stage builds
- Python 3.12
- Flask
- Gunicorn
- pip and pip-tools
- Google Cloud Run
- Google Artifact Registry
- Google Cloud Build
- Terraform Google provider

## Sources Consulted
- Docker Docs: Multi-stage builds - https://docs.docker.com/build/building/multi-stage/
- Docker Docs: Dockerfile reference - https://docs.docker.com/reference/builder
- Docker Docs: Optimize cache usage in builds - https://docs.docker.com/build/cache/optimize/
- pip documentation: Caching and `--no-cache-dir` - https://pip.pypa.io/en/stable/topics/caching.html
- Flask documentation: Quickstart and routing - https://flask.palletsprojects.com/en/stable/quickstart/
- Gunicorn 21.2.0 documentation - https://docs.gunicorn.org/en/21.2.0/
- Google Cloud SDK: `gcloud artifacts repositories create` - https://docs.cloud.google.com/sdk/gcloud/reference/artifacts/repositories/create
- Google Cloud SDK: `gcloud run deploy` - https://docs.cloud.google.com/sdk/gcloud/reference/run/deploy
- Cloud Run documentation: Container runtime contract - https://docs.cloud.google.com/run/docs/container-contract
- Cloud Run documentation: Configure container health checks for services - https://docs.cloud.google.com/run/docs/configuring/healthchecks
- Cloud Build documentation: Build configuration file schema - https://docs.cloud.google.com/build/docs/build-config-file-schema
- Terraform Registry: `google_cloud_run_v2_service` - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloud_run_v2_service

## Issues Found
- The Dockerfile included a `HEALTHCHECK`, but the Cloud Run deployment examples did not configure Cloud Run startup or liveness probes. Cloud Run health checks are configured through Cloud Run service settings, gcloud flags, YAML, or Terraform. I clarified the Dockerfile comment and added matching `--startup-probe` and `--liveness-probe` flags to the gcloud and Cloud Build deployment examples.

## Review Notes
- The Dockerfile, Flask application, Gunicorn command, Artifact Registry commands, Cloud Build structure, and Terraform Cloud Run v2 resource shape are technically valid.
- The image size numbers are reasonable estimates, but actual sizes vary with the current base image digest, CPU architecture, package versions, and dependency tree.
