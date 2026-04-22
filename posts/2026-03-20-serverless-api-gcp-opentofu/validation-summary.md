# Validation Summary: How to Build a Serverless API Backend with OpenTofu on GCP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- Terraform Google provider resources
- Google Cloud Run
- Google Cloud API Gateway
- Cloud Firestore in Native mode
- Google Cloud IAM
- Secret Manager
- Artifact Registry container images

## Sources Consulted
- Cloud Run Terraform `google_cloud_run_v2_service` resource: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/cloud_run_v2_service.html.markdown
- Cloud Run ingress settings: https://cloud.google.com/run/docs/securing/ingress
- Cloud Run secrets with Secret Manager: https://cloud.google.com/run/docs/configuring/services/secrets
- Cloud Run container image deployment and Artifact Registry image URL format: https://cloud.google.com/run/docs/deploying
- API Gateway securing backend services: https://cloud.google.com/api-gateway/docs/securing-backend-services
- API Gateway with Cloud Run backends: https://cloud.google.com/api-gateway/docs/get-started-cloud-run
- API Gateway OpenAPI extensions and backend authentication behavior: https://cloud.google.com/api-gateway/docs/oasv2-extensions
- Terraform Google provider `google_api_gateway_api_config` resource: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/api_gateway_api_config.html.markdown
- Terraform Google provider `google_firestore_database` resource: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/firestore_database.html.markdown
- Terraform Google provider `google_firestore_index` resource: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/firestore_index.html.markdown
- Firestore IAM roles for server client libraries: https://cloud.google.com/firestore/native/docs/security/iam
- Firestore in Native mode overview: https://cloud.google.com/firestore/native/docs
- Transition from Container Registry to Artifact Registry: https://cloud.google.com/artifact-registry/docs/transition/transition-from-gcr

## Issues Found
- The metadata referenced Cloud Functions, Firebase API Gateway, and IAP, but the post only provisions Cloud Run, Google Cloud API Gateway, Firestore, IAM, and Secret Manager. Removed the Cloud Function tag and changed the description to name API Gateway and IAM-based backend authentication.
- The overview described Cloud Run as "container-based functions." Updated this to "containerized API services" to avoid conflating Cloud Run services with Cloud Run functions.
- The Cloud Run image used a `gcr.io` Container Registry-style path. Container Registry is deprecated and Artifact Registry is the recommended current service, so the image URL was changed to the Artifact Registry `LOCATION-docker.pkg.dev/PROJECT_ID/REPOSITORY/IMAGE:TAG` format.
- The Cloud Run service used `INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER`, which allows internal traffic and external Application Load Balancer traffic, but the shown API Gateway integration targets the Cloud Run `run.app` URL. Changed the setting to `INGRESS_TRAFFIC_ALL` and clarified that Cloud Run IAM, not ingress, controls invocation by the gateway service account.
- The API Gateway API config used a backend service account but did not ensure the Cloud Run `roles/run.invoker` grant existed before API config creation. Added an explicit `depends_on` for the Cloud Run IAM member because Google documents that the backend auth service account for a Cloud Run backend must have `run.invoker`.
- The summary said API Gateway provides authentication without managing infrastructure. Updated it to distinguish OpenAPI-based routing from Cloud Run IAM backend invocation control, which is what the snippets actually configure.

## Review Notes
- The HCL snippets were reviewed against Google Cloud and Terraform Google provider documentation, but `tofu validate` was not run because the post contains excerpts that reference variables, service accounts, secrets, and an `openapi.yaml` file defined outside the shown snippets.
- The API Gateway snippet assumes `openapi.yaml` includes the required `x-google-backend` configuration that uses the `cloud_run_url` template variable.
