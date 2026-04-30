# Validation Summary: How to Set Up GCP Serverless VPC Access Connectors with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Serverless VPC Access
- Google Cloud VPC
- Cloud Run
- Cloud Functions (2nd gen) / Cloud Run functions
- OpenTofu / Terraform-compatible HCL
- Cloud SQL

## Sources Consulted
- Google Cloud: Serverless VPC Access overview and behavior https://cloud.google.com/vpc/docs/serverless-vpc-access
- Google Cloud: Configure Serverless VPC Access https://cloud.google.com/vpc/docs/configure-serverless-vpc-access
- Google Cloud: Cloud Run VPC connectors https://cloud.google.com/run/docs/configuring/vpc-connectors
- Google Cloud: Cloud Run VpcAccess REST reference https://cloud.google.com/run/docs/reference/rest/v2/VpcAccess
- Google Cloud: Cloud Functions v2 REST reference https://cloud.google.com/functions/docs/reference/rest/v2/projects.locations.functions
- Google Cloud: Cloud Run functions runtime support https://cloud.google.com/functions/docs/runtime-support
- HashiCorp Google provider docs: `google_vpc_access_connector` https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/vpc_access_connector.html.markdown
- HashiCorp Google provider docs: `google_cloud_run_v2_service` https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/cloud_run_v2_service.html.markdown
- HashiCorp Google provider docs: `google_cloudfunctions2_function` https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/cloudfunctions2_function.html.markdown
- HashiCorp Google provider docs: `google_sql_database_instance` https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/sql_database_instance.html.markdown

## Issues Found
- The Cloud Run comment for `PRIVATE_RANGES_ONLY` said it routes only RFC1918 traffic. I changed it to a broader private/internal wording because Google Cloud documents additional routed ranges for this setting, not just RFC1918.
- The Cloud Run functions example used `nodejs20`. I changed it to `nodejs22` because the official runtime support schedule shows Node.js 20 reaches deprecation on 2026-04-30.
- The connector CIDR comment was slightly too narrow. I changed it from "not overlapping with other subnets" to "not overlapping with any in-use range" to match Google Cloud's documented requirement more closely.

## Review Notes
- The OpenTofu snippets are valid for the current HashiCorp Google provider resources used by OpenTofu.
- For Cloud Run specifically, Google Cloud now recommends Direct VPC egress when it fits the use case, but Serverless VPC Access connectors remain supported and the post's connector-based approach is still valid.
