# Validation Summary: How to Create GCP Workload Identity Federation with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (`hashicorp/google` provider)
- Google Cloud IAM Workload Identity Federation
- GCP IAM Service Accounts
- GitHub Actions OIDC
- AWS IAM (federated to GCP)
- GitLab CI OIDC
- CEL (Common Expression Language) for attribute mapping and conditions

## Sources Consulted
- [Terraform Registry: `google_iam_workload_identity_pool`](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/iam_workload_identity_pool)
- [Terraform Registry: `google_iam_workload_identity_pool_provider`](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/iam_workload_identity_pool_provider)
- [Terraform Registry: `google_service_account_iam`](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/google_service_account_iam)
- [Google Cloud: Workload Identity Federation overview](https://cloud.google.com/iam/docs/workload-identity-federation)
- [Google Cloud: Configure WIF with other clouds (AWS)](https://cloud.google.com/iam/docs/workload-identity-federation-with-other-clouds)
- [Google Cloud: Configure WIF with deployment pipelines](https://cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines)
- [GitHub Actions OIDC token claims](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect)
- [GitLab Docs: OIDC ID token authentication](https://docs.gitlab.com/ci/secrets/id_token_authentication/)
- [google-github-actions/auth](https://github.com/google-github-actions/auth)
- [google-github-actions/setup-gcloud](https://github.com/google-github-actions/setup-gcloud)
- [actions/checkout](https://github.com/actions/checkout)

## Issues Found
- **Outdated GitHub Action versions in the workflow example.** As of May 2026, `google-github-actions/auth@v2`, `google-github-actions/setup-gcloud@v2`, and `actions/checkout@v4` have all had newer major releases. Updated the workflow snippet to `google-github-actions/auth@v3`, `google-github-actions/setup-gcloud@v3`, and `actions/checkout@v5` to reflect current stable majors.

All other technical content was verified correct:
- Terraform resource argument names and nested block structure (`oidc { issuer_uri, allowed_audiences }`, `aws { account_id }`) match the provider docs.
- The GitHub OIDC issuer URI `https://token.actions.githubusercontent.com` is correct.
- GitHub OIDC claims `sub`, `actor`, `repository`, `repository_owner`, `ref` are all valid.
- The AWS STS assertion claims (`arn`, `account`) and CEL methods (`startsWith`, `extract` with template patterns like `assumed-role/{role}/`) are documented and supported in GCP attribute mappings.
- The GitLab issuer URI `https://gitlab.com` and the claims `namespace_path`, `project_path`, `ref` are correct.
- The `google_iam_workload_identity_pool.NAME.name` attribute returns the full resource path (`projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/POOL_ID`), so the `principalSet://iam.googleapis.com/${pool.name}/attribute.repository/...` interpolation produces a valid member identifier.
- The distinction between `principal://` (exact subject) and `principalSet://` (attribute-based) is accurate.

## Review Notes
- The `description` field on `google_iam_workload_identity_pool_provider` is supported but documented as having a 256-character limit; the values used in the post are well within that.
- The post correctly notes that without `attribute_condition`, any token from the issuer can authenticate — this is a critical security point and Google has since added a warning when creating providers without restrictive conditions via `gcloud`.
- For AWS, the post's `attribute.role` extraction using `assertion.arn.extract('assumed-role/{role}/')` works for assumed-role ARNs but will produce an empty value for direct IAM user ARNs; this is fine for the federated-role pattern the post describes.
- The example does not set `allowed_audiences` for the GitHub provider, which means the default audience (the full provider resource name) applies. Workflow authors using `google-github-actions/auth` get the right audience automatically, so this is correct as written.
- Action major versions move quickly; consumers may want to pin to specific minor/patch tags for reproducibility.
