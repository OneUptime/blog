# Validation Summary: How to Create a Basic cloudbuild.yaml Configuration File for Docker Image Builds

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Build
- Cloud Build build config files (`cloudbuild.yaml`)
- Docker image builds
- Artifact Registry
- Google Cloud CLI (`gcloud builds submit`)
- Cloud Build substitutions

## Sources Consulted
- Google Cloud Build quickstart: Build and push a Docker image with Cloud Build: https://docs.cloud.google.com/build/docs/build-push-docker-image
- Google Cloud Build configuration file schema: https://docs.cloud.google.com/build/docs/build-config-file-schema
- Google Cloud Build substitutions documentation: https://docs.cloud.google.com/build/docs/configuring-builds/substitute-variable-values
- Google Cloud Build API reference for build options, machine types, logging modes, and image pushes: https://docs.cloud.google.com/build/docs/api/reference/rest/v1/projects.builds
- Google Cloud Artifact Registry documentation for storing artifacts and Docker image path format: https://docs.cloud.google.com/build/docs/building/store-artifacts-in-artifact-registry
- Google Cloud Artifact Registry transition documentation for Container Registry shutdown and `gcr.io` repositories: https://docs.cloud.google.com/artifact-registry/docs/transition/transition-from-gcr
- Google Cloud SDK `gcloud builds submit` reference: https://cloud.google.com/sdk/gcloud/reference/builds/submit

## Issues Found
- The post described Container Registry as "now called Artifact Registry" while using `gcr.io` image paths. Container Registry is deprecated and shut down for writes, while `gcr.io` repositories can be hosted by Artifact Registry. Updated the wording to refer to `gcr.io` repositories hosted by Artifact Registry.
- The post said each build step requires both `name` and `args`. Cloud Build requires build steps, but `args` is not required when other mechanisms such as `script` are used. Updated this to describe `name` and `args` as common properties for the shown Docker step.
- The `images` field was described as pushing to "the container registry." Updated the wording to Artifact Registry, matching current Google Cloud guidance.
- The Artifact Registry section was framed as "using Artifact Registry instead of Container Registry" even though the earlier `gcr.io` examples can also be Artifact Registry-hosted. Renamed and adjusted the section to specifically describe standard `pkg.dev` Artifact Registry repositories.
- The post stated that Cloud Build has a default 10-minute timeout. Official documentation states the default build timeout is 60 minutes. Updated the text.
- The machine type list described `UNSPECIFIED` as the default with 1 vCPU and did not mark N1 high-CPU machine types as deprecated. Updated the list to match the current Cloud Build API reference.

## Review Notes
The Docker build commands, `cloudbuild.yaml` syntax, `images` behavior, built-in substitutions, build argument usage, Dockerfile `-f` usage, `timeout`, `machineType`, `logging: CLOUD_LOGGING_ONLY`, and `gcloud builds submit` examples are otherwise consistent with current official documentation. The `gcr.io` examples assume the project has appropriate Artifact Registry `gcr.io` repository setup or migration in place.
