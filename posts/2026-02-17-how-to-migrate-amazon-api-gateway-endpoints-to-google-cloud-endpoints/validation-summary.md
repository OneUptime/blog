# Validation Summary: How to Migrate Amazon API Gateway Endpoints to Google Cloud Endpoints

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Amazon API Gateway REST APIs and HTTP APIs
- AWS CLI
- Google Cloud Endpoints
- ESPv2 on Cloud Run
- Google API Gateway
- OpenAPI 2.0 and OpenAPI 3.x
- API keys and JWT authentication
- Cloud Monitoring
- Python Flask proxy example

## Sources Consulted
- AWS CLI `apigateway get-export` command reference: https://docs.aws.amazon.com/cli/latest/reference/apigateway/get-export.html
- AWS CLI `apigatewayv2 export-api` command reference: https://docs.aws.amazon.com/cli/latest/reference/apigatewayv2/export-api.html
- Google Cloud Endpoints OpenAPI setup for Cloud Run with ESPv2: https://cloud.google.com/endpoints/docs/openapi/set-up-cloud-run-espv2
- Google Cloud Endpoints quotas overview: https://cloud.google.com/endpoints/docs/openapi/quotas-overview
- Google Cloud API Gateway API config documentation: https://cloud.google.com/api-gateway/docs/creating-api-config
- Google Cloud SDK `gcloud services api-keys create` reference: https://cloud.google.com/sdk/gcloud/reference/services/api-keys/create
- Google Cloud SDK `gcloud monitoring policies create` reference: https://cloud.google.com/sdk/gcloud/reference/monitoring/policies/create

## Issues Found
- The feature comparison table said Cloud Endpoints and Google API Gateway only support OpenAPI 2.0. Updated it to OpenAPI 2.0 and 3.x, matching current Google Cloud documentation.
- The feature comparison table described Cloud Endpoints rate limiting as custom ESP config and Google API Gateway rate limiting as built-in. Updated this to distinguish Cloud Endpoints quotas through Service Control from API Gateway quotas and service limits.
- The Cloud Run ESP deployment example used the generic `gcr.io/endpoints-release/endpoints-runtime-serverless:2` image and an `ENDPOINTS_SERVICE_NAME` environment variable. Updated the snippet to download and run the official `gcloud_build_image` helper, build an ESPv2 image with the deployed config, and deploy that generated image as documented for Cloud Run.
- The Cloud Monitoring alert policy example used non-existent `--condition-threshold-value` and `--condition-threshold-comparison` flags. Replaced them with the current `--if="> 10"` and `--duration=60s` flags.

## Review Notes
The AWS export commands, API key creation command, OpenAPI API key and JWT examples, Google API Gateway config commands, and Flask proxy sample are technically plausible. The custom-domain guidance for Google API Gateway remains high level; a production implementation would also need the full load balancer and serverless NEG configuration.
