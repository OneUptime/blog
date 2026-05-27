# Validation Summary: How to Use Secret Manager References in Cloud Run Env Variables Without Code

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Run
- Google Secret Manager
- Google Cloud CLI
- Cloud Run service YAML
- Terraform Google provider
- Python file and environment variable access

## Sources Consulted
- Google Cloud Run documentation: Configure secrets for services: https://docs.cloud.google.com/run/docs/configuring/services/secrets
- Google Cloud Run documentation: Introduction to service identity: https://cloud.google.com/run/docs/securing/service-identity
- Google Cloud SDK reference: gcloud run deploy: https://cloud.google.com/sdk/gcloud/reference/run/deploy
- Google Cloud SDK reference: gcloud secrets create: https://docs.cloud.google.com/sdk/gcloud/reference/secrets/create
- Google Secret Manager documentation: Create a secret: https://docs.cloud.google.com/secret-manager/docs/creating-and-accessing-secrets
- Google Secret Manager documentation: Add a secret version: https://docs.cloud.google.com/secret-manager/docs/add-secret-version
- Terraform Registry: google_cloud_run_v2_service: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloud_run_v2_service

## Issues Found
- The startup flow described file-mounted secrets as if they were fetched and injected before the container starts. Google Cloud documentation distinguishes environment variables from mounted secret volumes: environment variables are retrieved before instance startup, while mounted volumes fetch secret values when files are read. Updated the explanation to reflect that distinction.
- The YAML example mounted secret volumes at paths that looked like final filenames while also setting `items.path`, which would not match the file paths shown in the Python example. Updated the volume mount paths to directories and kept the filenames in `items.path`.
- The rotation guidance said a new revision is required for Cloud Run to pick up any updated secret. That is only accurate when the service configuration is pinned to a specific version. Updated the guidance to distinguish pinned versions, `latest` for environment variables at new instance startup, and mounted volumes fetching the latest value when read.

## Review Notes
The post is technically relevant and the core workflow is valid. Google recommends pinning Secret Manager versions when exposing secrets as environment variables because `latest` is resolved at instance startup, which can cause different instances of the same revision to see different values during rotation.
