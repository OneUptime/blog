# Validation Summary: How to Fix API Not Enabled Errors in Google Cloud Platform Projects

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Google Cloud Platform
- Google Cloud APIs and Service Usage
- Google Cloud CLI (`gcloud`)
- Google Cloud IAM
- Google Cloud Billing
- Google Cloud Organization Policy
- Terraform Google provider

## Sources Consulted
- Google Cloud SDK documentation: `gcloud services enable` - https://docs.cloud.google.com/sdk/gcloud/reference/services/enable
- Google Cloud SDK documentation: `gcloud services list` - https://docs.cloud.google.com/sdk/gcloud/reference/services/list
- Google Cloud Service Usage documentation: Enable and disable services - https://docs.cloud.google.com/service-usage/docs/enable-disable
- Google Cloud Service Usage API reference: `services.enable` - https://docs.cloud.google.com/service-usage/docs/reference/rest/v1/services/enable
- Google Cloud SDK documentation: `gcloud billing projects link` - https://cloud.google.com/sdk/gcloud/reference/billing/projects/link
- Google Cloud SDK documentation: `gcloud resource-manager org-policies describe` - https://docs.cloud.google.com/sdk/gcloud/reference/resource-manager/org-policies/describe
- Google Cloud Organization Policy documentation: Restrict service usage - https://docs.cloud.google.com/organization-policy/restrict-services
- Google Cloud IAM documentation: Service Usage roles and permissions - https://docs.cloud.google.com/iam/docs/roles-permissions/serviceusage
- Terraform Registry documentation: `google_project_service` resource - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/google_project_service

## Issues Found
- The organization policy troubleshooting command checked only the policy directly attached to the project. I added `--effective` so the command also reflects inherited folder and organization policies, which is the more accurate check for restrictions that can block service enablement.
- The Terraform example showed individual `google_project_service` resources and then a loop managing the same services in the same snippet. I changed the loop comment to say it is an alternative to separate resources, avoiding the implication that both patterns should be used together for the same services.

## Review Notes
Local `gcloud` help could not be checked because the Google Cloud CLI is not installed in this workspace. Commands and flags were verified against official Google Cloud SDK documentation instead.
