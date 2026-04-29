# Validation Summary: How to Build a Landing Zone with OpenTofu on GCP

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu / HCL
- Google Cloud Resource Manager folders and projects
- Google Cloud Organization Policy Service
- Shared VPC and VPC networking
- Cloud Logging organization sinks
- Cloud Storage
- Cloud Pub/Sub
- Security Command Center

## Sources Consulted
- HashiCorp Google provider `google_folder`: https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/google_folder.html.markdown
- HashiCorp Google provider `google_project`: https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/google_project.html.markdown
- HashiCorp Google provider `google_org_policy_policy`: https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/org_policy_policy.html.markdown
- HashiCorp Google provider `google_compute_shared_vpc_host_project` and `google_compute_shared_vpc_service_project`: https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/compute_shared_vpc_host_project.html.markdown and https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/compute_shared_vpc_service_project.html.markdown
- HashiCorp Google provider `google_compute_network`: https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/compute_network.html.markdown
- HashiCorp Google provider `google_logging_organization_sink`, `google_storage_bucket`, `google_storage_bucket_iam_member`, `google_pubsub_topic`, and `google_scc_notification_config`: https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/logging_organization_sink.html.markdown, https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/storage_bucket.html.markdown, https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/storage_bucket_iam.html.markdown, https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/pubsub_topic.html.markdown, and https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/scc_notification_config.html.markdown
- Google Cloud organization policy constraints reference: https://cloud.google.com/resource-manager/docs/organization-policy/org-policy-constraints
- Google Cloud organization policy overview: https://cloud.google.com/resource-manager/docs/organization-policy/overview
- Google Cloud OS Login organization policy guidance: https://cloud.google.com/compute/docs/oslogin/manage-oslogin-in-an-org
- Google Cloud Shared VPC overview: https://cloud.google.com/compute/docs/shared-vpc
- Google Cloud log export configuration guidance: https://cloud.google.com/logging/docs/export/configure_export_v2
- Google Cloud Security Command Center notification configuration guide: https://cloud.google.com/security-command-center/docs/how-to-api-manage-notifications
- Google Cloud IAM troubleshooting for service-account-key org policies: https://cloud.google.com/iam/docs/troubleshoot-org-policies

## Issues Found
- The post referenced `google_project.connectivity`, `google_storage_bucket.audit_logs`, and `google_pubsub_topic.security_findings` before defining them. I added those resources so the later snippets are internally consistent and runnable as examples.
- The `google_org_policy_policy` examples used boolean literals for `enforce`. The provider documentation for this resource uses `"TRUE"` and `"FALSE"` strings, so I updated the examples to match the documented schema and examples.
- The comment above `google_scc_notification_config` said it would enable Security Command Center. That resource configures finding notifications; it does not enable SCC by itself. I corrected the wording.
- The summary claimed the audit-log bucket was tamper-resistant, but the shown configuration did not implement retention or lock controls. I changed that statement to "central storage bucket."

## Review Notes
- The post’s organization-level `google_scc_notification_config` resource is still valid in the Google provider, but newer Google Cloud documentation also describes location-scoped SCC notification resources and workflows.
- The snippets assume required Google Cloud APIs and organization prerequisites are already in place. In particular, SCC notification configs require SCC to be enabled for the organization, and project-level services such as Compute Engine, Cloud Storage, and Pub/Sub must be available.
- `tofu` and `terraform` CLIs were not installed in this workspace, so I could not run a local parser or provider-backed validation pass.
