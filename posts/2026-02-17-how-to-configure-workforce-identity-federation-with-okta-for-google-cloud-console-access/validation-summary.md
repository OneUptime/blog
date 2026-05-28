# Validation Summary: How to Configure Workforce Identity Federation with Okta

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud IAM
- Workforce Identity Federation
- Okta OIDC
- Google Cloud CLI
- Terraform Google provider
- IAM principal identifiers and policy bindings

## Sources Consulted
- Google Cloud: Configure Workforce Identity Federation with Okta and sign in users - https://docs.cloud.google.com/iam/docs/workforce-sign-in-okta
- Google Cloud: Set up user access to the console (federated) - https://docs.cloud.google.com/iam/docs/workforce-console-sso
- Google Cloud SDK reference: `gcloud iam workforce-pools create` - https://docs.cloud.google.com/sdk/gcloud/reference/iam/workforce-pools/create
- Google Cloud SDK reference: `gcloud iam workforce-pools providers create-oidc` - https://docs.cloud.google.com/sdk/gcloud/reference/iam/workforce-pools/providers/create-oidc
- Google Cloud IAM: Principal identifiers - https://docs.cloud.google.com/iam/docs/principal-identifiers
- Terraform Registry: `google_iam_workforce_pool_provider` - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/iam_workforce_pool_provider

## Issues Found
- The `gcloud iam workforce-pools providers create-oidc` example used the Terraform/API enum value `MERGE_USER_INFO_OVER_ID_TOKEN_CLAIMS` for `--web-sso-assertion-claims-behavior`. The current `gcloud` flag expects the lowercase value `merge-user-info-over-id-token-claims`, so the command was corrected.
- The provider command and Terraform example requested `email` and `profile` as additional OIDC scopes. Google Cloud requests `openid`, `profile`, and `email` by default for web sign-in, so the examples now request only the additional `groups` scope.
- The console access URL used `https://console.cloud.google/workforce?provider=...`, which is not the current documented SSO link format. It was changed to `https://auth.cloud.google/signin/...?...continueUrl=https://console.cloud.google/`.
- The Terraform `client_secret` block used `value = var.okta_client_secret`. The current Google provider schema requires a nested `value { plain_text = ... }` block, so the snippet was corrected.
- The IAM examples omitted the `roles/browser` binding required for users who access the console (federated). A project-level Browser role binding for the workforce pool was added to both the gcloud and Terraform examples.
- The prerequisite listed `iam.workforcePoolAdmin` instead of the full predefined role ID. It was corrected to `roles/iam.workforcePoolAdmin`.

## Review Notes
The local environment did not have `gcloud` installed, so CLI verification was performed against the official Google Cloud SDK reference instead of local `--help` output. The post remains an introductory setup guide; future improvements could cover browser-based `gcloud auth login` configuration and Workforce Identity Federation product support limitations in more detail.
