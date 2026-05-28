# Validation Summary: How to Build a Terraform Module for Provisioning a Cloud Run Service with

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Run
- Terraform
- HashiCorp Google Terraform provider
- IAM
- Secret Manager
- Cloud SQL
- Cloud Run custom domain mappings

## Sources Consulted
- Google Cloud Run custom domain mapping documentation: https://docs.cloud.google.com/run/docs/mapping-custom-domains
- Google Cloud Run deployment documentation: https://docs.cloud.google.com/run/docs/deploying
- Terraform Google provider `google_cloud_run_v2_service` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloud_run_v2_service
- Terraform Google provider `google_cloud_run_v2_service_iam_member` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloud_run_v2_service_iam
- Terraform Google provider `google_cloud_run_domain_mapping` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloud_run_domain_mapping

## Issues Found
- The service name validation allowed up to 50 characters and rejected single-character names. Cloud Run service names must be fewer than 50 characters, so the regex and error message were updated to allow 1-49 characters.
- The Cloud SQL configuration created a Cloud SQL volume but did not mount it into the container. A conditional `volume_mounts` block was added so Cloud SQL sockets are available at `/cloudsql`.
- The post described the overall configuration as production-ready while using Cloud Run domain mappings. Google Cloud documents Cloud Run domain mappings as Preview and not recommended for production services, so the wording was adjusted and a production caveat was added.

## Review Notes
The module assumes applications expose `/health` for startup and liveness probes, and that the runtime service account already has required permissions such as Secret Manager secret access and Cloud SQL access where applicable.
