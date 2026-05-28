# Validation Summary: How to Implement a Landing Zone Architecture for Enterprise GCP Projects

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud landing zones
- Google Cloud Resource Manager organizations, folders, and projects
- Google Cloud Shared VPC
- Google Cloud Organization Policy Service
- Cloud Logging aggregated sinks
- BigQuery log exports
- Cloud Build
- Terraform with the HashiCorp Google provider

## Sources Consulted
- Google Cloud Architecture Center: Landing zone design in Google Cloud: https://docs.cloud.google.com/architecture/landing-zones
- Google Cloud Resource Manager: Resource hierarchy: https://cloud.google.com/resource-manager/docs/overview
- Google Cloud Resource Manager: Create and manage folders: https://docs.cloud.google.com/resource-manager/docs/creating-managing-folders
- Google Cloud VPC: Shared VPC: https://cloud.google.com/vpc/docs/shared-vpc
- Google Cloud Organization Policy: Restrict resource locations: https://docs.cloud.google.com/organization-policy/restrict-locations
- Google Cloud Compute Engine: Configure static external IP addresses and `constraints/compute.vmExternalIpAccess`: https://docs.cloud.google.com/compute/docs/ip-addresses/configure-static-external-ip-address
- Google Cloud Storage: Uniform bucket-level access: https://docs.cloud.google.com/storage/docs/uniform-bucket-level-access
- Google Cloud Logging: Aggregated sinks overview: https://docs.cloud.google.com/logging/docs/export/aggregated_sinks_overview
- Google Cloud Logging: Route logs to supported destinations and set destination permissions: https://cloud.google.com/logging/docs/export/configure_export_v2
- Terraform Registry: `google_org_policy_policy`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/org_policy_policy
- Terraform Registry: `google_logging_organization_sink`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/logging_organization_sink.html
- Terraform Registry: `google_project`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/google_project.html
- Terraform Registry: `google_folder`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/google_folder

## Issues Found
- The Shared VPC host project example created Compute Engine networking resources without explicitly enabling the Compute Engine API. Added a `google_project_service` resource for `compute.googleapis.com` and dependencies before enabling Shared VPC and creating the VPC network.
- The `compute.vmExternalIpAccess` organization policy was configured with `enforce = "TRUE"`, but this is a list constraint. Changed it to `deny_all = "TRUE"` to match the intended behavior of blocking all external IP access in the production folder.
- The organization-level log sink routed logs to a BigQuery dataset but did not grant the sink writer identity permission to write to the dataset. Added a `google_bigquery_dataset_iam_member` granting `roles/bigquery.dataEditor` to the sink writer identity.
- The Cloud Audit Logs comment implied Data Access logs are always captured. Updated it to note that Data Access logs are captured where they are enabled.
- The project factory snippet referenced `random_id.suffix.hex` without defining the `random_id` resource. Added the missing `random_id` resource.

## Review Notes
The remaining examples are intentionally simplified and still require normal enterprise inputs such as provider configuration, variables, backend configuration, IAM permissions for the Terraform runner, billing setup, API enablement in service projects, and audit-log configuration choices. Terraform `hashicorp/terraform:1.5` is older but still a valid pinned container tag for the example.
