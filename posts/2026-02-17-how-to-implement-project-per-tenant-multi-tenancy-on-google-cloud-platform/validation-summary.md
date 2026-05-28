# Validation Summary: How to Implement Project-Per-Tenant Multi-Tenancy on Google Cloud Platform

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud projects, folders, IAM, billing, quotas, and labels
- Terraform Google provider resources for Resource Manager, Compute Engine, Cloud SQL, Cloud Storage, Storage Transfer Service, Service Networking, and Cloud Monitoring
- Cloud Functions with Pub/Sub triggers
- VPC Network Peering and Private Services Access
- Cloud Monitoring metrics scopes

## Sources Consulted
- Google Cloud Resource Manager project documentation: https://docs.cloud.google.com/resource-manager/docs/creating-managing-projects
- Google Cloud Resource Manager folders documentation: https://docs.cloud.google.com/resource-manager/docs/creating-managing-folders
- Google Cloud labels documentation: https://docs.cloud.google.com/resource-manager/docs/labels-overview
- Google Cloud quotas documentation: https://docs.cloud.google.com/docs/quotas/quotas
- Google Cloud VPC Network Peering documentation: https://docs.cloud.google.com/vpc/docs/vpc-peering
- Google Cloud Cloud SQL for PostgreSQL private IP documentation: https://docs.cloud.google.com/sql/docs/postgres/configure-private-ip
- Google Cloud Cloud Functions Pub/Sub event documentation: https://docs.cloud.google.com/functions/docs/running/direct
- Google Cloud cross-project monitoring with Terraform documentation: https://docs.cloud.google.com/composer/docs/composer-2/cross-project-environment-monitoring-terraform
- Terraform Google provider `google_monitoring_monitored_project` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/monitoring_monitored_project
- Terraform Google provider `google_storage_transfer_job` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/storage_transfer_job
- Terraform `replace` function documentation: https://docs.hashicorp.com/terraform/language/functions/replace

## Issues Found
- The post described project-per-tenant as providing separate billing. Google Cloud projects are billing units and support cost separation in reports, but they do not inherently create separate billing accounts. Updated the wording to "separate cost attribution in billing reports" and "billing reports can be naturally separated per tenant project."
- The Terraform examples referenced variables that were not declared. Added variable declarations for the tenant CIDR, control plane VPC, offboarding archive settings, tenant project list, and monitoring project.
- The generated project ID could become invalid for arbitrary tenant IDs, and the tenant name label could include invalid label characters. Added tenant ID validation for Google Cloud project ID constraints and sanitized/truncated the `tenant_name` label value.
- The Cloud SQL private IP example set `private_network` but did not create Private Services Access. Added `servicenetworking.googleapis.com`, a reserved private services range, and a `google_service_networking_connection`, then made the Cloud SQL instance depend on that connection.
- The Cloud Function Pub/Sub example tried to call `.decode()` directly on `event["data"]`. Pub/Sub event data is base64 encoded, so the Python sample now uses `base64.b64decode(...)`.
- The Cloud Function sample imported Secret Manager but did not use it. Removed the unused import.
- The Storage Transfer Service example used `path = "/"` for a GCS source prefix. Terraform provider documentation says GCS paths are object prefixes and should generally not begin with `/`; changed it to an empty string for the bucket root.
- The Cloud Monitoring Terraform example used `metrics_scope = "projects/${var.monitoring_project_id}"`. Official examples use `locations/global/metricsScopes/${PROJECT_ID}`; updated the snippet accordingly.

## Review Notes
The VPC peering guidance is technically correct, including the need to manage unique CIDR ranges. For larger deployments, the post could later mention metrics-scope project limits and centralized project factory patterns, but those are design caveats rather than correctness issues.
