# Validation Summary: How to Build a Multi-Project GCP Environment with Terraform

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Terraform
- HashiCorp Google provider
- Google Cloud Resource Manager projects and folders
- Google Cloud Organization Policy
- Shared VPC and Cloud NAT
- Cloud Logging sinks and buckets
- BigQuery log exports
- Cloud Billing budgets

## Sources Consulted
- Terraform Google provider: `google_org_policy_policy` resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/org_policy_policy
- Terraform Google provider: `google_folder` resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/google_folder
- Terraform Google provider: `google_project` resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/google_project
- Terraform Google provider: `google_compute_shared_vpc_host_project` and `google_compute_shared_vpc_service_project` resources: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_shared_vpc_host_project and https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_shared_vpc_service_project
- Google Cloud Shared VPC provisioning guide: https://cloud.google.com/vpc/docs/provisioning-shared-vpc
- Terraform Google provider: `google_compute_subnetwork`, `google_compute_router_nat`, and VPC flow log configuration: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_subnetwork and https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_router_nat
- Google Cloud organization policy constraints reference: https://cloud.google.com/resource-manager/docs/organization-policy/org-policy-constraints
- Terraform Google provider: `google_logging_organization_sink` resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/logging_organization_sink
- Google Cloud Logging sink destination and IAM documentation: https://cloud.google.com/logging/docs/export/configure_export_v2 and https://cloud.google.com/logging/docs/access-control
- Terraform Google provider: `google_logging_project_bucket_config` and `google_bigquery_dataset_iam_member` resources: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/logging_project_bucket_config and https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/bigquery_dataset_iam
- Terraform Google provider: `google_billing_budget` resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/billing_budget

## Issues Found
- The production external-IP organization policy used the legacy `compute.vmExternalIpAccess` list constraint with a boolean `enforce` rule. Changed it to the managed boolean constraint `compute.managed.vmExternalIpAccess`, which matches the rule structure used in the snippet.
- The `gcp.restrictServiceUsage` allowlist values omitted the required exact-match `is:` prefix. Added `is:` to each allowed service value.
- The Shared VPC service-project attachment referenced `google_project.prod_workload` without defining it. Added a minimal workload project resource and an explicit dependency on the Shared VPC host-project resource.
- The centralized logging sinks did not grant the generated sink writer identities access to their destinations. Added `roles/logging.bucketWriter` on the logging project for the log-bucket sink and `roles/bigquery.dataEditor` on the BigQuery dataset for the BigQuery sink.
- The Cloud Logging bucket sink could be created before the destination log bucket existed because the destination string did not reference the bucket resource. Moved the bucket config before the sink and added an explicit `depends_on`.

## Review Notes
- The snippets are suitable as tutorial examples, but a production project factory should also handle API disable behavior, IAM for workload teams or service agents, uniqueness constraints for project IDs, and Shared VPC subnet-level IAM where workloads need to consume specific subnets.
