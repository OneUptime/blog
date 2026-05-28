# Validation Summary: How to Choose Between Cloud Endpoints Apigee and API Gateway

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud Endpoints
- Extensible Service Proxy / ESPv2
- Google Cloud API Gateway
- Apigee
- OpenAPI 2.0 and OpenAPI 3.x
- gRPC
- Google Cloud CLI
- Terraform
- Apigee API proxy XML configuration

## Sources Consulted
- Google Cloud Endpoints overview: https://docs.cloud.google.com/endpoints/docs/openapi/about-cloud-endpoints
- Cloud Endpoints for Cloud Run with ESPv2: https://docs.cloud.google.com/endpoints/docs/openapi/set-up-cloud-run-espv2
- Cloud Endpoints quotas: https://docs.cloud.google.com/endpoints/docs/openapi/quotas-overview
- Cloud Endpoints pricing: https://cloud.google.com/endpoints/pricing
- API Gateway OpenAPI overview: https://docs.cloud.google.com/api-gateway/docs/openapi-overview
- API Gateway Google ID token authentication: https://docs.cloud.google.com/api-gateway/docs/authenticating-users-googleid
- API Gateway API config creation: https://docs.cloud.google.com/api-gateway/docs/creating-api-config
- API Gateway quotas: https://docs.cloud.google.com/api-gateway/docs/quotas-overview
- API Gateway pricing: https://cloud.google.com/api-gateway/pricing
- Apigee pricing: https://cloud.google.com/apigee/pricing
- Apigee pay-as-you-go environment types: https://docs.cloud.google.com/apigee/docs/api-platform/reference/pay-as-you-go-environment-types
- Apigee policy reference overview: https://docs.cloud.google.com/apigee/docs/api-platform/reference/policies/reference-overview-policy
- Terraform google_apigee_organization resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/apigee_organization

## Issues Found
- The feature table said Cloud Endpoints and API Gateway only support OpenAPI 2.0. Updated it to include OpenAPI 3.x, and noted gRPC support where documented.
- The post said Cloud Endpoints and API Gateway have no rate limiting or quota management. Updated this to reflect their documented quota capabilities, while keeping the distinction from Apigee's richer traffic management policies.
- Cloud Endpoints and API Gateway pricing was outdated or inaccurate. Updated both to the current first-2M-free, then $3.00 per million calls model.
- Apigee pay-as-you-go pricing was stated as roughly $500/month. Updated it to the current $365/month per region minimum for a Base environment and adjusted the cost table.
- The Cloud Endpoints Cloud Run deployment example implied setting ESPv2 environment variables on the backend service was enough. Replaced it with the documented pattern of building an ESPv2 image with the service config and deploying the ESPv2 proxy service on Cloud Run.
- The Cloud Endpoints OpenAPI example did not include a Cloud Run backend mapping. Added `x-google-backend` with `protocol: h2`.
- The API Gateway Google ID token security requirement used an audience string as an OAuth scope. Updated it to `google_id_token: []`, matching the official OpenAPI 2.0 example.
- The API Gateway deployment commands omitted the one-time managed service enable step. Added the documented `gcloud services enable` command.
- The Apigee Terraform snippet was marked as `bash`. Changed the code fence to `hcl`.
- The Apigee XML example placed comments before the XML declaration, which makes the XML document invalid. Moved the XML declaration to the first line.
- The Apigee monetization statement needed a pricing-model caveat because current Apigee add-on availability varies by pricing model. Added that caveat.

## Review Notes
Verified the YAML snippets with PyYAML and the XML snippet with Python's XML parser. The local environment did not have `gcloud`, so CLI flags were checked against official Google Cloud CLI and product documentation instead of local `--help` output.
