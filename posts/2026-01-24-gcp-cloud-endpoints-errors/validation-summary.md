# Validation Summary: How to Fix 'Cloud Endpoints' API Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Google Cloud Endpoints
- Extensible Service Proxy and ESPv2
- Google Cloud CLI
- OpenAPI 2.0
- gRPC Endpoints configuration
- JWT authentication
- Cloud Run
- Cloud Logging
- Cloud Monitoring uptime checks

## Sources Consulted
- Google Cloud Endpoints for Cloud Run with ESPv2: https://docs.cloud.google.com/endpoints/docs/openapi/set-up-cloud-run-espv2
- Google Cloud Endpoints OpenAPI 2.0 extensions: https://docs.cloud.google.com/endpoints/docs/openapi/openapi-extensions
- Google Cloud Endpoints quota configuration: https://docs.cloud.google.com/endpoints/docs/openapi/quotas-configure
- Google Cloud SDK `gcloud alpha endpoints quota list`: https://docs.cloud.google.com/sdk/gcloud/reference/alpha/endpoints/quota/list
- Google Cloud Endpoints service-account authentication: https://docs.cloud.google.com/endpoints/docs/openapi/service-account-authentication
- Google Cloud Endpoints JWT troubleshooting: https://docs.cloud.google.com/endpoints/docs/openapi/troubleshoot-jwt
- Google Cloud Endpoints response troubleshooting: https://docs.cloud.google.com/endpoints/docs/openapi/troubleshoot-response-errors
- Google Cloud Endpoints gRPC configuration deployment: https://docs.cloud.google.com/endpoints/docs/grpc/deploy-endpoints-config
- Google Cloud SDK `gcloud endpoints configs list`: https://docs.cloud.google.com/sdk/gcloud/reference/endpoints/configs/list
- Google Cloud SDK `gcloud monitoring uptime create`: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/uptime/create

## Issues Found
- The required API enablement snippet listed `endpoints.googleapis.com` as a required service. Google Cloud's current Endpoints setup docs require `servicemanagement.googleapis.com`, `servicecontrol.googleapis.com`, and enabling the deployed Endpoints service name, so the snippet was corrected.
- The gRPC deployment example used `service_config.yaml`; Google's gRPC Endpoints docs use `api_config.yaml`, so the filename was corrected to match the documented convention.
- The JWT decoding command used plain `base64 -d`, which can fail on JWT base64url payloads. The command now converts base64url characters before decoding the payload.
- The Python ID token helper imported an unused module and called the audience `client_id` while passing an Endpoints service name. The example now uses an `audience` parameter and passes the documented `https://SERVICE_NAME` audience form.
- The Cloud Run ESPv2 deployment example used an application image and an `ENDPOINTS_SERVICE_NAME` environment variable. Current ESPv2 Cloud Run setup uses a generated `endpoints-runtime-serverless` image and the `ESPv2_ARGS` environment variable for startup options, so the example was corrected.
- The quota CLI examples used `gcloud endpoints quota` and `--consumer=project:my-project`. The current documented command group is `gcloud alpha endpoints quota`, and consumers use forms such as `projects/my-project`, so both were corrected.
- The ESP Docker example used `endpoints-runtime:2`, but Google's documented ESP startup option examples use `gcr.io/endpoints-release/endpoints-runtime:1`; the image reference was corrected. The inline comment after a line-continuation was also moved out of the command so the shell snippet remains valid.
- The uptime-check command used `gcloud monitoring uptime-check-configs create`, which is not the current documented gcloud surface. It was replaced with `gcloud monitoring uptime create` and the required `--resource-labels` format.

## Review Notes
The post remains focused on OpenAPI 2.0 style Endpoints configuration. Google Cloud also documents OpenAPI 3.x support with different extension names in some areas, but this post's examples are consistently OpenAPI 2.0 after the fixes.
