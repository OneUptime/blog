# Validation Summary: How to Use Workspace Health Checks in HCP Terraform

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- HCP Terraform workspace health assessments
- Terraform configuration language
- Terraform check blocks, preconditions, and postconditions
- HCP Terraform API
- Terraform Enterprise/HCP Terraform provider (`tfe`)
- AWS, HTTP, DNS, and TLS Terraform providers
- Python `requests`

## Sources Consulted
- HashiCorp Developer: Health assessments in HCP Terraform - https://developer.hashicorp.com/terraform/cloud-docs/workspaces/health
- HashiCorp Developer: HCP Terraform Workspaces API - https://developer.hashicorp.com/terraform/cloud-docs/api-docs/workspaces
- HashiCorp Developer: HCP Terraform Assessment Results API - https://developer.hashicorp.com/terraform/cloud-docs/api-docs/assessment-results
- HashiCorp Developer: HCP Terraform Workspace Notification Configurations API - https://developer.hashicorp.com/terraform/cloud-docs/api-docs/notification-configurations/workspace
- HashiCorp Developer: Workspace notifications - https://developer.hashicorp.com/terraform/cloud-docs/workspaces/settings/notifications
- HashiCorp Developer: Use checks to validate infrastructure - https://developer.hashicorp.com/terraform/tutorials/configuration-language/checks
- HashiCorp Terraform Provider TFE documentation - https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/workspace
- HashiCorp Terraform Provider TFE notification configuration documentation - https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/notification_configuration
- HashiCorp AWS provider `aws_acm_certificate` data source documentation - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/acm_certificate
- HashiCorp AWS provider `aws_db_instance` data source documentation - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/db_instance
- HashiCorp DNS provider `dns_a_record_set` data source documentation - https://registry.terraform.io/providers/hashicorp/dns/latest/docs/data-sources/a_record_set
- HashiCorp TLS provider `tls_certificate` data source documentation - https://registry.terraform.io/providers/hashicorp/tls/latest/docs/data-sources/certificate
- HashiCorp Help Center: retrieving the current assessment result ID - https://support.hashicorp.com/hc/en-us/articles/31281362511763-How-to-Retrieve-the-Assessment-Result-ID-from-a-Workspace

## Issues Found
- Corrected the introduction to avoid saying health checks detect "stale runs"; HashiCorp documents health assessments as drift detection, continuous validation, and assessment failures.
- Corrected the drift detection explanation to describe configuration drift via speculative plans instead of comparing actual infrastructure only against Terraform state.
- Replaced the certificate expiration example because the AWS `aws_acm_certificate` data source does not export `not_after`; the example now uses the official `tls_certificate` data source and its `certificates[*].not_after` attribute.
- Corrected the health status table to use documented HCP Terraform health labels: drifted, check failed, and health error.
- Fixed the assessment API example and dashboard script to use the current assessment result endpoint shape instead of treating `/workspaces/:id/assessment-results` as a list endpoint.
- Updated troubleshooting guidance that suggested generic retry logic in check blocks; Terraform check blocks do not provide built-in retry behavior.

## Review Notes
The TFE provider examples are still valid, but current provider documentation recommends write-only `url_wo` and `token_wo` for notification secrets when using Terraform 1.11.0 or later. The post uses `url` and `token`, which remain supported but store values in Terraform state.
