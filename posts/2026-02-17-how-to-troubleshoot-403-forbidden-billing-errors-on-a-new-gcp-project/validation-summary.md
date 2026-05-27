# Validation Summary: How to Troubleshoot 403 Forbidden Billing Errors on a New GCP Project

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Google Cloud Billing
- Google Cloud CLI (`gcloud`)
- Google Cloud IAM
- Google Cloud Organization Policy
- Terraform Google provider

## Sources Consulted
- Google Cloud SDK reference: `gcloud billing projects link` - https://cloud.google.com/sdk/gcloud/reference/billing/projects/link
- Google Cloud SDK reference: `gcloud billing projects` - https://cloud.google.com/sdk/gcloud/reference/billing/projects
- Google Cloud SDK reference: `gcloud billing accounts` - https://cloud.google.com/sdk/gcloud/reference/billing/accounts
- Google Cloud SDK reference: `gcloud billing budgets create` - https://cloud.google.com/sdk/gcloud/reference/billing/budgets/create
- Google Cloud Billing documentation: Enable, disable, or change billing for a project - https://cloud.google.com/billing/docs/how-to/modify-project
- Google Cloud IAM roles and permissions for Cloud Billing - https://cloud.google.com/iam/docs/roles-permissions/billing
- Google Cloud Free Program documentation - https://cloud.google.com/free/docs/free-cloud-features
- Google Cloud SDK reference: `gcloud resource-manager org-policies describe` - https://cloud.google.com/sdk/gcloud/reference/resource-manager/org-policies/describe
- Google Cloud SDK reference: `gcloud org-policies describe` - https://cloud.google.com/sdk/gcloud/reference/org-policies/describe
- Terraform Registry: `google_project` / billing account example - https://registry.terraform.io/providers/hashicorp/google/latest/docs/data-sources/billing_account.html
- Terraform Registry: `google_project_service` - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/google_project_service

## Issues Found
- The permissions section said `roles/billing.user` was the minimum needed to link projects to billing accounts. That was incomplete: Google documents both billing-account permissions and project-side permissions, and the predefined role set also includes Billing Account Viewer and service usage permissions. I updated the text to mention project-side roles and the Billing Account Viewer caveat.
- The post said Billing Account User does not give access to view the billing account itself. Current IAM documentation shows the role includes basic billing account get/list permissions, but not cost viewing or payment management. I corrected the description.
- The organization policy example used `constraints/billing.restrictBillingAccountUsage`, which is not listed in Google Cloud's current organization policy constraints. I changed the section to describe IAM or organization policy restrictions that can block billing access grants, using the documented `constraints/iam.allowedPolicyMemberDomains` example.
- The free trial section used `masterBillingAccount` as if it identified a free trial account. Google documents that field as a subaccount/parent-account indicator, so I changed the command to check only whether the billing account is open and noted that free trial status is shown in the Console billing pages.
- The budget command used `--threshold-rules`, but the current `gcloud billing budgets create` flag is singular and repeatable: `--threshold-rule`. I corrected all three threshold flags.

## Review Notes
The local environment does not have `gcloud` installed, so CLI syntax was verified against the official Google Cloud SDK reference rather than local `--help` output.
