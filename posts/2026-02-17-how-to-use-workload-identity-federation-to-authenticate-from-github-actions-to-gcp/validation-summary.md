# Validation Summary: Use Workload Identity Federation to Authenticate from GitHub Actions to GCP

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Workload Identity Federation
- Google Cloud IAM and service account impersonation
- GitHub Actions OIDC
- google-github-actions/auth
- google-github-actions/setup-gcloud
- Artifact Registry
- Cloud Run
- gcloud CLI

## Sources Consulted
- Google Cloud IAM: Configure Workload Identity Federation with deployment pipelines - https://cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines
- Google Cloud IAM: Workload Identity Federation overview - https://cloud.google.com/iam/docs/workload-identity-federation
- Google Cloud SDK reference: gcloud iam workload-identity-pools create - https://cloud.google.com/sdk/gcloud/reference/iam/workload-identity-pools/create
- Google Cloud SDK reference: gcloud iam workload-identity-pools providers create-oidc - https://cloud.google.com/sdk/gcloud/reference/iam/workload-identity-pools/providers/create-oidc
- Google Cloud SDK reference: gcloud iam service-accounts add-iam-policy-binding - https://cloud.google.com/sdk/gcloud/reference/iam/service-accounts/add-iam-policy-binding
- Google Cloud SDK reference: gcloud run deploy - https://cloud.google.com/sdk/gcloud/reference/run/deploy
- google-github-actions/auth README - https://github.com/google-github-actions/auth
- google-github-actions/setup-gcloud README - https://github.com/google-github-actions/setup-gcloud
- GitHub Actions OIDC reference - https://docs.github.com/en/actions/reference/security/oidc
- GitHub Actions OIDC discovery document - https://token.actions.githubusercontent.com/.well-known/openid-configuration

## Issues Found
- The workflow used `google-github-actions/auth@v2` and `google-github-actions/setup-gcloud@v2`. These examples were updated to the current major versions, `auth@v3` and `setup-gcloud@v3`, matching the current official action documentation.
- The service account IAM binding example for branch restriction used `--condition="expression=assertion.ref=='refs/heads/main',title=main-branch-only"`. The `assertion` variable is valid in Workload Identity Federation provider attribute conditions, but not in a normal IAM allow-policy condition on the service account. The example was changed to use the already mapped `google.subject` value with a `principal://.../subject/repo:my-github-org/my-repo:ref:refs/heads/main` member, which restricts impersonation to the main branch for that repository.

## Review Notes
- The provider-level organization attribute condition is technically correct and matches Google Cloud's recommendation for public issuers such as GitHub Actions.
- The repository-level `principalSet://.../attribute.repository/...` binding is technically correct because `attribute.repository` is included in the provider attribute mapping.
- The Cloud Run and Artifact Registry permissions shown are reasonable examples, but production deployments should scope `roles/iam.serviceAccountUser` and other roles as narrowly as possible.
