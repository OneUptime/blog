# Validation Summary: How to Use Terraform to Deploy Cloud Endpoints with OpenAPI Specification

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Endpoints
- ESPv2
- OpenAPI 2.0 / Swagger
- Terraform Google provider
- Cloud Run
- Google Cloud API Keys
- Service Control quotas
- Cloud Monitoring alert policies

## Sources Consulted
- Google Cloud Endpoints OpenAPI overview: https://cloud.google.com/endpoints/docs/openapi
- Google Cloud Endpoints with ESPv2 on Cloud Run: https://cloud.google.com/endpoints/docs/openapi/set-up-cloud-run-espv2
- Google Cloud Endpoints API key authentication: https://cloud.google.com/endpoints/docs/openapi/restricting-api-access-with-api-keys
- Google Cloud Endpoints quotas: https://cloud.google.com/endpoints/docs/openapi/quotas-configure
- Google Cloud OpenAPI extensions: https://cloud.google.com/endpoints/docs/openapi/openapi-extensions
- Cloud Run container runtime contract: https://cloud.google.com/run/docs/container-contract
- Terraform `google_endpoints_service`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/endpoints_service
- Terraform `google_cloud_run_v2_service`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloud_run_v2_service
- Terraform `google_apikeys_key`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/apikeys_key
- Terraform `google_monitoring_alert_policy`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/monitoring_alert_policy
- Google Cloud Monitoring metrics list for Service Runtime: https://cloud.google.com/monitoring/api/metrics_gcp_p_z#gcp-serviceruntime

## Issues Found
- The post described deploying ESP as a Cloud Run sidecar and pointed `x-google-backend` at the same Cloud Run service URI. That would route ESPv2 back to itself instead of to the backend. I changed the example to use a private backend Cloud Run service and a separate public ESPv2 Cloud Run service.
- The Cloud Run backend was publicly invokable even though authentication was supposed to happen at ESP. I changed the backend ingress to internal-only, exposed only the ESPv2 service publicly, and added an IAM binding so the ESPv2 service account can invoke the backend.
- The sample enabled only Endpoints-related APIs, but the tutorial also provisions Cloud Run services, API keys, and Monitoring alerts. I added `run.googleapis.com`, `apikeys.googleapis.com`, and `monitoring.googleapis.com`.
- The API key method restriction used HTTP method/path strings. Terraform API key `methods` entries should identify API methods, so I changed the example to use the OpenAPI `operationId` values.
- The rate limiting section said quota limits were per API key. Endpoints quota units such as `1/min/{project}` are enforced per consumer project, so I corrected that wording.
- The Monitoring alert examples used stale or mismatched Service Runtime metric names. I changed the error-rate alert to use `serviceruntime.googleapis.com/api/request_count` with a `5xx` response-code-class filter and changed the latency alert to use `serviceruntime.googleapis.com/api/request_latencies`.
- The latency alert compared a seconds-based latency metric to `2000`, implying milliseconds. I changed the threshold to `2` for a 2-second P95 threshold.
- The output exposed the private backend URL as the API URL. I changed it to output the ESPv2 Cloud Run service URI.

## Review Notes
The ESPv2 Cloud Run image still needs to be built with the deployed Endpoints service configuration ID before deployment, as described in Google Cloud's ESPv2 Cloud Run documentation. The post now models that as an `espv2_image` input rather than trying to inline the image-build workflow into the Terraform example.
