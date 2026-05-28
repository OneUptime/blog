# Validation Summary: Fix Service Account Impersonation Permission Denied Errors Across Projects

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Google Cloud IAM
- Google Cloud service account impersonation
- Google Cloud CLI
- IAM Policy Troubleshooter
- Google Cloud Organization Policy
- Terraform Google provider
- Python google-auth library

## Sources Consulted
- Google Cloud service account authentication roles: https://cloud.google.com/iam/docs/service-account-permissions
- Google Cloud service account impersonation guide: https://cloud.google.com/iam/docs/service-account-impersonation
- Google Cloud delegated short-lived credentials documentation: https://cloud.google.com/iam/docs/create-short-lived-credentials-delegated
- IAM Service Account Credentials API `generateAccessToken` reference: https://cloud.google.com/iam/docs/reference/credentials/rest/v1/projects.serviceAccounts/generateAccessToken
- Google Cloud CLI global `--impersonate-service-account` reference: https://cloud.google.com/sdk/gcloud/reference
- IAM Policy Troubleshooter documentation: https://cloud.google.com/policy-intelligence/docs/troubleshoot-access
- Google Cloud domain-restricted sharing organization policy documentation: https://cloud.google.com/resource-manager/docs/organization-policy/restricting-domains
- Terraform Google provider `google_service_account_iam_member` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/google_service_account_iam
- google-auth impersonated credentials reference: https://googleapis.dev/python/google-auth/latest/reference/google.auth.impersonated_credentials.html

## Issues Found
- The post said the impersonation permission is checked on the service account and implied project-level bindings were simply wrong. IAM policies can be inherited from ancestors such as the project, but direct service-account IAM is the least-privilege choice. Updated the explanation and Terraform/common-mistakes sections to distinguish "works but broad" from "wrong resource."
- The IAM policy check section told readers to look for either `roles/iam.serviceAccountTokenCreator` or `roles/iam.serviceAccountUser`. `roles/iam.serviceAccountUser` does not allow creating short-lived credentials or using `--impersonate-service-account`, so the section now tells readers to look for `roles/iam.serviceAccountTokenCreator` and treats `serviceAccountUser` only as an attach-resource role.
- The gcloud delegated impersonation example showed only the final service account in `--impersonate-service-account`. Current gcloud syntax uses a comma-separated service account chain, so the example now includes `sa-a@...`,`sa-b@...` for the User -> SA-A -> SA-B flow.
- The Python delegated impersonation example described default credentials as "User or SA-A" while still passing SA-A as a delegate. Updated the comment so the example consistently models a user credential delegating through SA-A to SA-B.
- The organization policy section described adding a "domain" as the fix for `iam.allowedPolicyMemberDomains`. Current Google Cloud documentation describes allowed values as organization principal sets or Google Workspace customer IDs for the legacy constraint, so the wording was corrected.

## Review Notes
The Google Cloud CLI was not available in the local environment, so CLI command behavior was checked against the official Google Cloud SDK reference instead of local `gcloud --help` output.
