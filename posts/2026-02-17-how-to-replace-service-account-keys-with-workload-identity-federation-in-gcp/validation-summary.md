# Validation Summary: How to Replace Service Account Keys with Workload Identity Federation in GCP

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud IAM
- Workload Identity Federation
- Security Token Service
- Service Account Credentials API
- Google Cloud CLI
- GitHub Actions OIDC
- Microsoft Entra ID / Azure OIDC
- AWS workload identity provider
- Python google-auth and Google Cloud Storage client library

## Sources Consulted
- Google Cloud IAM: Workload Identity Federation overview - https://cloud.google.com/iam/docs/workload-identity-federation
- Google Cloud IAM: Configure Workload Identity Federation with deployment pipelines - https://cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines
- Google Cloud IAM: Configure Workload Identity Federation with AWS or Azure VMs - https://cloud.google.com/iam/docs/workload-identity-federation-with-other-clouds
- Google Cloud SDK reference: `gcloud iam workload-identity-pools create` - https://cloud.google.com/sdk/gcloud/reference/iam/workload-identity-pools/create
- Google Cloud SDK reference: `gcloud iam workload-identity-pools providers create-oidc` - https://cloud.google.com/sdk/gcloud/reference/iam/workload-identity-pools/providers/create-oidc
- Google Cloud SDK reference: `gcloud iam workload-identity-pools providers create-aws` - https://cloud.google.com/sdk/gcloud/reference/iam/workload-identity-pools/providers/create-aws
- Google Cloud SDK reference: `gcloud iam workload-identity-pools create-cred-config` - https://cloud.google.com/sdk/gcloud/reference/iam/workload-identity-pools/create-cred-config
- Google Cloud SDK reference: `gcloud iam service-accounts keys list` and `disable` - https://cloud.google.com/sdk/gcloud/reference/iam/service-accounts/keys/list and https://cloud.google.com/sdk/gcloud/reference/iam/service-accounts/keys/disable
- GitHub Docs: OpenID Connect reference - https://docs.github.com/en/actions/reference/security/oidc
- google-github-actions/auth README - https://github.com/google-github-actions/auth
- google-github-actions/setup-gcloud README - https://github.com/google-github-actions/setup-gcloud
- google-auth Python documentation: `google.auth.identity_pool` - https://googleapis.dev/python/google-auth/latest/reference/google.auth.identity_pool.html

## Issues Found
- The prerequisites mentioned Resource Manager but the API enable command did not enable `cloudresourcemanager.googleapis.com`. Added it and updated the prerequisite text to include the Service Account Credentials API, matching Google Cloud's required API list.
- The GitHub Actions provider example used name-based GitHub claims (`repository` and `repository_owner`). Google Cloud warns that name fields can be reused after deletion. Updated the example to map and use stable numeric `repository_id` and `repository_owner_id` claims.
- The service account impersonation binding used the name-based repository attribute path. Updated it to use `attribute.repository_id`.
- The Azure provider example used a `login.microsoftonline.com/.../v2.0` issuer. For Azure VM / Microsoft Entra workload federation, Google Cloud's documented example uses the token issuer format `https://sts.windows.net/TENANT_ID`. Updated the issuer and display name.
- The GitHub workflow used older major versions of `google-github-actions/auth` and `google-github-actions/setup-gcloud`. Updated the examples to the current major versions documented by those projects.
- The Python example was described as applying to AWS, but the shown credential configuration is for file-sourced OIDC credentials, not AWS metadata credentials. Narrowed the description to environments that provide an OIDC token in a local file.

## Review Notes
The remaining commands and snippets align with the official Google Cloud CLI and google-auth documentation. For production examples, repository and owner IDs should be replaced with the actual numeric GitHub IDs from the target organization and repository.
