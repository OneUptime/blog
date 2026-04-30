# Validation Summary: How to Set Up GCP OS Login with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- Google Cloud
- Compute Engine
- OS Login
- IAM
- OpenTofu
- HCL

## Sources Consulted
- Google Cloud, Set up OS Login: https://cloud.google.com/compute/docs/oslogin/set-up-oslogin
- Google Cloud, Connect using service accounts: https://cloud.google.com/compute/docs/connect/set-up-service-account-ssh
- Google Cloud, Troubleshooting OS Login: https://cloud.google.com/compute/docs/troubleshooting/troubleshoot-os-login
- Google Cloud, Compute Engine roles and permissions: https://cloud.google.com/iam/docs/roles-permissions/compute
- Google Cloud, Operating system details: https://cloud.google.com/compute/docs/images/os-details
- HashiCorp Google provider, `google_compute_instance_iam`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_instance_iam
- HashiCorp Google provider, `google_compute_project_metadata`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_project_metadata
- HashiCorp Google provider, `google_compute_project_metadata_item`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_project_metadata_item
- HashiCorp Google provider, `google_service_account_iam`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/google_service_account_iam

## Issues Found
- The post used a separate `google_compute_project_metadata` resource in Step 5 to enable OS Login 2FA. That resource authoritatively manages all project metadata, so defining a second one for the same project would create a conflicting configuration. I changed the project metadata examples to use `google_compute_project_metadata_item` for the individual OS Login keys so the step-by-step configuration is valid.
- Step 4 said users need `compute.instances.get` for instance information. Google’s OS Login documentation instead calls out a project-level permission that includes `compute.projects.get` when OS Login is granted at the instance level and users connect through the Google Cloud console or `gcloud` CLI. I corrected the explanation and kept `roles/compute.viewer` as one valid built-in role for that purpose.
- The Service Account User note was too broad. I changed it to match Google’s requirement that this role is needed when the target VM has a service account attached.
- The 2FA comment implied a generic requirement for all SSH access. I updated it to reflect Google’s documented 2-Step Verification requirement for user SSH access.

## Review Notes
- The Debian 12 image family used in the VM example is still a current public Compute Engine image family as of April 30, 2026.
- If users come from a different Google Cloud organization than the target VM, they also need `roles/compute.osLoginExternalUser` at the organization level.
- OS Login 2FA is not enforced for service account users.
