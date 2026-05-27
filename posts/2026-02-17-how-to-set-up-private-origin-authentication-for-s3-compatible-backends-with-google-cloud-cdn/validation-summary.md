# Validation Summary: How to Set Up Private Origin Authentication for S3-Compatible Backends

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud CDN
- Google Cloud Load Balancing
- Internet network endpoint groups
- AWS Signature Version 4
- Amazon S3 and S3-compatible object storage
- Google Cloud Secret Manager
- Google Cloud CLI
- Compute Engine REST API
- Terraform Google provider

## Sources Consulted
- Google Cloud CDN private origin authentication documentation: https://docs.cloud.google.com/cdn/docs/configure-private-origin-authentication
- Google Cloud external backend with internet NEG setup guide: https://docs.cloud.google.com/load-balancing/docs/https/setup-global-ext-https-external-backend
- Google Cloud classic Application Load Balancer external backend guide: https://docs.cloud.google.com/load-balancing/docs/https/setting-up-https-external-backend-internet-neg
- Google Cloud SDK `backend-services update` reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/backend-services/update
- Google Cloud SDK `network-endpoint-groups create` and `update` references: https://docs.cloud.google.com/sdk/gcloud/reference/compute/network-endpoint-groups/create and https://docs.cloud.google.com/sdk/gcloud/reference/compute/network-endpoint-groups/update
- Compute Engine BackendService REST API reference: https://docs.cloud.google.com/compute/docs/reference/rest/v1/backendServices
- Terraform Google provider `google_compute_backend_service` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_backend_service
- Terraform Google provider `google_compute_global_network_endpoint_group` and `google_compute_global_network_endpoint` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_global_network_endpoint_group and https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_global_network_endpoint

## Issues Found
- The post said Secret Manager keeps credentials from being exposed in configuration, but the later REST and Terraform examples still pass the secret into backend service configuration. Changed the wording to say Secret Manager avoids hard-coding credentials in scripts or shared configuration.
- The backend service and forwarding rule examples omitted the current `EXTERNAL_MANAGED` load balancing scheme used by Google Cloud's global external Application Load Balancer internet NEG examples. Added `--load-balancing-scheme=EXTERNAL_MANAGED` to the relevant `gcloud` commands, added the Premium network tier to the frontend IP commands, and changed Terraform from `EXTERNAL` to `EXTERNAL_MANAGED`.
- The S3 origin examples did not consistently configure the backend service to send the S3 bucket endpoint as the `Host` header. Added the custom request header to the `gcloud` and REST examples, matching the existing Terraform example.
- The REST API example used duration strings (`"86400s"`, `"604800s"`) for `cdnPolicy.defaultTtl` and `cdnPolicy.maxTtl`, but Compute Engine BackendService REST fields are integer seconds. Changed them to numeric values.
- The Terraform example read the secret from Secret Manager but did not mention that the Google provider stores `security_settings.aws_v4_authentication.access_key` in Terraform state. Added a short state-security note.
- The test response example showed `x-goog-hash`, which is a Cloud Storage-style header and is not a reliable expectation for S3-compatible origins. Changed it to `etag`.

## Review Notes
Private origin authentication supports only selected HTTP methods (`GET`, `HEAD`, `OPTIONS`, and `TRACE`) according to Google Cloud documentation. The post focuses on static object delivery, so this is not a correctness issue for the shown examples, but it is worth mentioning in a future broader revision.
