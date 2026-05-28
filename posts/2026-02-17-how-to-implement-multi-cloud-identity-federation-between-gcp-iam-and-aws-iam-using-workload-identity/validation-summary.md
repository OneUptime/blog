# Validation Summary: How to Use Multi-Cloud Identity Federation Between GCP IAM and AWS IAM

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud IAM
- Google Cloud Workload Identity Federation
- Google Cloud service account ID tokens
- AWS IAM
- AWS STS
- AWS OIDC federation
- AWS CLI
- gcloud CLI
- Python
- boto3
- google-auth
- google-cloud-storage

## Sources Consulted
- AWS CLI `create-open-id-connect-provider` command reference: https://docs.aws.amazon.com/cli/latest/reference/iam/create-open-id-connect-provider.html
- AWS IAM OIDC provider documentation: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc.html
- AWS IAM and STS OIDC condition keys: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_iam-condition-keys.html
- AWS STS `AssumeRoleWithWebIdentity` API reference: https://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRoleWithWebIdentity.html
- Boto3 STS `assume_role_with_web_identity` reference: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/sts/client/assume_role_with_web_identity.html
- Google Auth `google.oauth2.id_token` reference: https://google-auth.readthedocs.io/en/latest/reference/google.oauth2.id_token.html
- Google Cloud token types documentation: https://cloud.google.com/docs/authentication/token-types
- Google Cloud Workload Identity Federation documentation: https://cloud.google.com/iam/docs/workload-identity-federation
- Google Cloud Workload Identity Federation with AWS documentation: https://cloud.google.com/iam/docs/workload-identity-federation-with-other-clouds
- gcloud `workload-identity-pools providers create-aws` command reference: https://cloud.google.com/sdk/gcloud/reference/iam/workload-identity-pools/providers/create-aws
- gcloud `workload-identity-pools create-cred-config` command reference: https://cloud.google.com/sdk/gcloud/reference/iam/workload-identity-pools/create-cred-config
- Google Cloud Storage Python client documentation: https://cloud.google.com/python/docs/reference/storage/latest

## Issues Found
- The post instructed readers to create an AWS IAM OIDC provider for `accounts.google.com` with a hard-coded thumbprint. AWS documents Google as a built-in OIDC provider, so a separate IAM OIDC provider is not needed. Updated Step 1 to use the built-in provider.
- The AWS role trust policy used an account-specific OIDC provider ARN for Google. Updated the principal to `"Federated": "accounts.google.com"`, matching AWS documentation for Google federation.
- The AWS role trust policy checked `accounts.google.com:oaud` and `accounts.google.com:sub`, but omitted `accounts.google.com:aud`. For Google service account ID tokens, the `azp` claim maps to `accounts.google.com:aud`, and both `azp` and `sub` identify the service account unique ID. Added `accounts.google.com:aud` with the service account unique ID.
- The Python GCP-to-AWS example used `google.oauth2.id_token.fetch_id_token` without importing `google.oauth2.id_token`, and passed `target_audience` instead of the documented `audience` parameter. Added the import and changed the call to `fetch_id_token(auth_request, 'sts.amazonaws.com')`.
- The sequence diagram implied AWS validates the token by calling Google for each token validation. Updated the wording to describe fetching OIDC metadata and JWKS as needed.

## Review Notes
- The AWS CLI and gcloud CLI were not installed in the local workspace, so CLI syntax was verified against official command references rather than local `--help` output.
- The embedded Python snippets were syntax-checked with `compile()` and passed.
