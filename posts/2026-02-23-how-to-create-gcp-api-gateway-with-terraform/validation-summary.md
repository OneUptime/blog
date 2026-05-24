# Validation Summary: How to Create GCP API Gateway with Terraform

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- Terraform (HCL)
- Google Cloud Platform (GCP) API Gateway
- OpenAPI 2.0 (Swagger) specification
- Google Cloud IAM (service accounts, IAM bindings)
- Firebase Authentication (JWT validation)
- Cloud Run / Cloud Functions (as API Gateway backends)
- google-beta Terraform provider

## Sources Consulted
- [Terraform google_api_gateway_api resource](https://registry.terraform.io/providers/hashicorp/google-beta/latest/docs/resources/api_gateway_api)
- [Terraform google_api_gateway_api_config resource](https://registry.terraform.io/providers/hashicorp/google-beta/latest/docs/resources/api_gateway_api_config)
- [Terraform google_api_gateway_gateway resource](https://registry.terraform.io/providers/hashicorp/google-beta/latest/docs/resources/api_gateway_gateway)
- [Terraform google_project_service resource](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/google_project_service)
- [Terraform google_service_account resource](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/google_service_account)
- [GCP API Gateway OpenAPI overview](https://cloud.google.com/api-gateway/docs/openapi-overview)
- [GCP API Gateway authenticating users with Firebase](https://cloud.google.com/api-gateway/docs/authenticating-users-firebase)
- [GCP API Gateway path translation](https://cloud.google.com/api-gateway/docs/path-translation)
- [GCP API Gateway required APIs](https://cloud.google.com/api-gateway/docs/quickstart)

## Issues Found
No technical issues found.

All Terraform resource arguments, computed attributes, and OpenAPI extensions used in the post are valid:
- `google_api_gateway_api`, `google_api_gateway_api_config`, and `google_api_gateway_gateway` correctly use the `google-beta` provider (these are beta resources).
- `openapi_documents { document { path, contents } }` nested block structure with base64-encoded contents is correct.
- `gateway_config.backend_config.google_service_account` is the correct path for attaching the SA to the config.
- The `api` argument on `google_api_gateway_api_config` correctly references `google_api_gateway_api.api.api_id`.
- The `default_hostname` and `managed_service` computed attributes used in outputs are valid.
- The Firebase auth `securityDefinitions` block (oauth2 / implicit / empty authorizationUrl / x-google-issuer / x-google-jwks_uri / x-google-audiences) matches the official GCP-recommended pattern exactly.
- `x-google-backend` with `address` and `path_translation: APPEND_PATH_TO_ADDRESS` is valid.
- `x-google-endpoints` with `allowCors: true` is supported by API Gateway (which is built on ESPv2).
- The three enabled APIs (apigateway, servicecontrol, servicemanagement) match the documented requirements.
- IAM roles `roles/run.invoker` and `roles/cloudfunctions.invoker` are correct for allowing the gateway SA to call Cloud Run / Cloud Functions backends.

## Review Notes
- The `api_config_id = "config-${formatdate("YYYYMMDDhhmmss", timestamp())}"` pattern combined with `create_before_destroy = true` is a reasonable idiom for ensuring a new config is produced on each apply, but it will cause the config to be recreated on every `terraform apply` (because `timestamp()` always changes). Readers using this in production may want to tie config naming to a content hash (e.g., `md5(local.api_spec)`) instead, so configs are only rotated when the spec actually changes. Not incorrect — just a practical caveat.
- For the CORS example, the `x-google-endpoints.name` field references `google_api_gateway_api.api.managed_service`, which is only populated after the API has been created. If a reader tries to use this spec to create the very first API Config in a fresh apply, they may need a two-stage apply (create the API first, then the config). Worth being aware of when adapting the snippet.
- The `region` argument on `google_api_gateway_gateway` is optional in the schema (inherits from the provider), but specifying it explicitly as the post does is the recommended practice.
