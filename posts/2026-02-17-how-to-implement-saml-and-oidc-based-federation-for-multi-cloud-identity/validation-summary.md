# Validation Summary: How to Implement SAML and OIDC-Based Federation for Multi-Cloud Identity

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud Workload Identity Federation
- Google Cloud Workforce Identity Federation
- Google Cloud IAM and Security Token Service
- SAML 2.0
- OpenID Connect
- AWS IAM and AWS STS SigV4 token exchange
- Microsoft Entra ID managed identity tokens
- Terraform Google provider
- Python Google Auth and Cloud Storage client libraries

## Sources Consulted
- Google Cloud IAM Workload Identity Federation overview: https://cloud.google.com/iam/docs/workload-identity-federation
- Google Cloud guide for Workload Identity Federation with AWS or Azure VMs: https://cloud.google.com/iam/docs/workload-identity-federation-with-other-clouds
- Google Cloud CLI reference for `gcloud iam workload-identity-pools providers create-aws`: https://cloud.google.com/sdk/gcloud/reference/iam/workload-identity-pools/providers/create-aws
- Google Cloud CLI reference for `gcloud iam workload-identity-pools create`: https://cloud.google.com/sdk/gcloud/reference/iam/workload-identity-pools/create
- Google Cloud CLI reference for `gcloud iam workforce-pools create`: https://cloud.google.com/sdk/gcloud/reference/iam/workforce-pools/create
- Google Cloud CLI reference for `gcloud iam workforce-pools providers create-saml`: https://cloud.google.com/sdk/gcloud/reference/iam/workforce-pools/providers/create-saml
- Google Cloud guide for managing workforce identity pool providers: https://cloud.google.com/iam/docs/manage-workforce-identity-pools-providers
- Terraform Google provider `google_iam_workforce_pool` resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/iam_workforce_pool
- Terraform Google provider `google_iam_workforce_pool_provider` resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/iam_workforce_pool_provider
- google-auth external account documentation: https://google-auth.readthedocs.io/en/latest/reference/google.auth.external_account.html

## Issues Found
- The AWS workload federation example incorrectly described AWS STS as an OIDC issuer and used `gcloud iam workload-identity-pools providers create-oidc` with `https://sts.amazonaws.com`. Google Cloud's documented AWS flow uses `create-aws` with an AWS account ID and AWS SigV4 subject tokens. Updated the heading, command, provider description, and architecture diagram label.
- The AWS provider command mapped `google.subject=assertion.sub`, but AWS provider assertions use AWS `GetCallerIdentity` fields such as `arn`, `account`, and `userid`. Updated the mapping to use `google.subject=assertion.arn`.
- The Python AWS example used `google.auth.identity_pool.Credentials.from_info`, which is for identity pool/OIDC-style external account credentials. AWS external account configs should use `google.auth.aws.Credentials.from_info`. Updated the import and credential construction.
- Removed unused Python imports that were left after correcting the credential class.

## Review Notes
The SAML workforce federation commands, Terraform resource field names, Azure OIDC provider command shape, credential configuration commands, IAM principal format, and audit-log query were consistent with the consulted official documentation. The post still uses placeholder IDs and representative mappings, so readers must replace them with real project numbers, account IDs, tenant IDs, role names, and application ID URIs.
