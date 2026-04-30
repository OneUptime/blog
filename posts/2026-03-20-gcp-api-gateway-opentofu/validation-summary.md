# Validation Summary: How to Create GCP API Gateway with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Terraform Google provider
- Google Cloud API Gateway
- Google Cloud Run
- Google Cloud Monitoring
- OpenAPI 2.0
- Google-issued JWT authentication

## Sources Consulted
- Google Cloud API Gateway: Configuring the development environment - https://cloud.google.com/api-gateway/docs/configure-dev-env
- Google Cloud API Gateway: Getting started with API Gateway and Cloud Run - https://cloud.google.com/api-gateway/docs/get-started-cloud-run
- Google Cloud API Gateway: OpenAPI overview - https://cloud.google.com/api-gateway/docs/openapi-overview
- Google Cloud API Gateway: Using JWT to authenticate users - https://cloud.google.com/api-gateway/docs/authenticating-users-jwt
- Google Cloud API Gateway: Authentication between services - https://cloud.google.com/api-gateway/docs/authenticate-service-account
- Google Cloud API Gateway: Monitoring your API - https://cloud.google.com/api-gateway/docs/monitoring
- Google Cloud Monitoring metrics reference - https://cloud.google.com/monitoring/api/metrics_gcp_a_b
- Google Cloud Monitoring filter syntax - https://cloud.google.com/monitoring/api/v3/filters
- Terraform Google provider reference - https://registry.terraform.io/providers/hashicorp/google/latest/docs/guides/provider_reference
- Terraform Google provider: `google_api_gateway_api` - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/api_gateway_api
- Terraform Google provider: `google_api_gateway_api_config` - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/api_gateway_api_config
- Terraform Google provider: `google_api_gateway_gateway` - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/api_gateway_gateway
- Terraform Google provider: `google_cloud_run_v2_service_iam_member` - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloud_run_v2_service_iam_member
- Terraform Google provider: `google_monitoring_alert_policy` - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/monitoring_alert_policy

## Issues Found
- The post used `google_api_gateway_*` beta resources without declaring or configuring the `google-beta` provider. I added the `google-beta` provider to `required_providers`, configured a `provider "google-beta"` block, and updated the provider version constraint to a current major version so the examples align with current provider docs.
- The API config example used `templatefile("${path.module}/api-spec.yaml", ...)` while the OpenAPI section showed a `local_file` resource generating that same file at apply time. That flow is not valid because `templatefile` reads a source file from disk, not a resource generated later in the apply. I replaced the `local_file` example with an actual `api-spec.yaml` template and wired the API config example to pass the template variables it uses.
- The OpenAPI example hard-coded a gateway hostname pattern that does not match the documented `default_hostname` format and cannot be known before gateway creation. I removed the hard-coded `host` field; API Gateway documents this field as optional.
- The API config example did not wait for the Cloud Run invoker IAM binding, even though Google documents that the backend auth service account must already have `roles/run.invoker` for Cloud Run backends. I added an explicit `depends_on` for the Cloud Run IAM member resource.
- The service account example used the v1 Cloud Run IAM resource, `google_cloud_run_service_iam_member`, against a `google_cloud_run_v2_service`. I replaced it with `google_cloud_run_v2_service_iam_member` and updated the argument from `service` to `name`, matching the current provider schema.
- The monitoring example referenced `apigateway.googleapis.com/http/response_count`, which is not the documented API Gateway request metric. I changed it to `apigateway.googleapis.com/proxy/request_count`, which is the official API Gateway metric.
- The monitoring example claimed to alert on an error rate above 5%, but the original filter and `threshold_value = 10` represented an absolute non-2xx request rate, not a 5% ratio. I corrected the alert to use numerator and denominator filters with matching aggregations and a `threshold_value` of `0.05`.

## Review Notes
- API Gateway supports both OpenAPI 2.0 and OpenAPI 3.0.x. The post's OpenAPI 2.0 example remains valid after correction.
- As of this review on 2026-04-30, the Terraform `google_api_gateway_api`, `google_api_gateway_api_config`, and `google_api_gateway_gateway` resources are still documented as beta resources and should be used with the `google-beta` provider.
- The API Gateway `proxy/request_count` metric is documented as beta in Cloud Monitoring; metric names and labels were verified against the current metrics reference.
