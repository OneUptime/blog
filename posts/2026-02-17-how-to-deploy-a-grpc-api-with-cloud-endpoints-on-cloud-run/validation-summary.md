# Validation Summary: How to Deploy a gRPC API with Cloud Endpoints on Cloud Run

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Endpoints for gRPC
- ESPv2
- Cloud Run
- Protocol Buffers and gRPC transcoding
- Go gRPC servers
- Docker and Artifact Registry
- gcloud CLI

## Sources Consulted
- Google Cloud Endpoints gRPC for Cloud Run with ESPv2: https://docs.cloud.google.com/endpoints/docs/grpc/set-up-cloud-run-espv2
- Google Cloud Endpoints gRPC service configuration: https://docs.cloud.google.com/endpoints/docs/grpc/grpc-service-config
- Google Cloud Endpoints gRPC authentication: https://docs.cloud.google.com/endpoints/docs/grpc/authenticating-users
- Google Cloud Endpoints service-to-service authentication: https://docs.cloud.google.com/endpoints/docs/grpc/service-account-authentication
- ESPv2 startup options: https://docs.cloud.google.com/endpoints/docs/grpc/specify-esp-v2-startup-options
- Cloud Run gRPC guidance: https://docs.cloud.google.com/run/docs/triggering/grpc
- Cloud Run HTTP/2 configuration: https://docs.cloud.google.com/run/docs/configuring/http2
- gcloud run deploy reference: https://docs.cloud.google.com/sdk/gcloud/reference/run/deploy
- Artifact Registry Docker quickstart/authentication docs: https://docs.cloud.google.com/artifact-registry/docs/docker/store-docker-container-images and https://docs.cloud.google.com/artifact-registry/docs/docker/authentication

## Issues Found
- The Cloud Endpoints service config used a `cloud.goog` service name and did not include backend routing. Updated it to use the ESPv2 Cloud Run hostname and a `backend.rules.address` value with the required `grpcs://` scheme for Cloud Run gRPC backends.
- The ESPv2 deployment used the generic serverless runtime image with `ESPv2_ARGS` containing non-serverless flags such as `--service`, `--rollout_strategy`, and `--backend`. Replaced this with the documented `gcloud_build_image` flow and deployment of the built `endpoints-runtime-serverless` image.
- The authentication example mixed a service-account provider label with Google OAuth certificate settings. Updated the sample to use the documented Google ID token provider shape and matching `gcloud auth print-identity-token` test command.
- The backend Go server hard-coded port `8080`. Updated it to respect the Cloud Run `PORT` environment variable with `8080` as a local fallback.
- The Artifact Registry push example omitted repository creation and Docker credential configuration. Added the required `gcloud artifacts repositories create` and `gcloud auth configure-docker` commands.
- The API key/authenticated test commands did not send required metadata for protected methods. Added `x-api-key` and `authorization` metadata/headers where needed, and used `-proto bookstore.proto` with `grpcurl`.
- The monitoring command still referenced the old Endpoints service name. Updated it to the Cloud Run hostname service name used in the corrected configuration.

## Review Notes
The tutorial remains a simplified example. In a production version, the setup order should explicitly reserve the ESPv2 Cloud Run hostname and obtain the backend Cloud Run hostname before deploying the Endpoints configuration.
