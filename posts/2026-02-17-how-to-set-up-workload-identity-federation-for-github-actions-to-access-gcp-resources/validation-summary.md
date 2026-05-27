# Validation Summary: Set Up Workload Identity Federation for GitHub Actions to Access GCP Resources

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud IAM
- Workload Identity Federation
- GitHub Actions OIDC
- Google Cloud service accounts
- Google Cloud CLI
- Cloud Run
- Artifact Registry
- google-github-actions/auth
- google-github-actions/setup-gcloud

## Sources Consulted
- Google Cloud IAM: Configure Workload Identity Federation with deployment pipelines: https://docs.cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines
- Google Cloud IAM: Principal identifiers: https://docs.cloud.google.com/iam/docs/principal-identifiers
- google-github-actions/auth README: https://github.com/google-github-actions/auth
- google-github-actions/setup-gcloud README: https://github.com/google-github-actions/setup-gcloud
- GitHub Docs: OpenID Connect reference: https://docs.github.com/en/actions/reference/security/oidc
- Google Cloud Run: Deploy services from source code: https://docs.cloud.google.com/run/docs/deploying-source-code

## Issues Found
- The GitHub Actions examples used `google-github-actions/auth@v2`, while the official action README now recommends `google-github-actions/auth@v3`. Updated all examples to `auth@v3`.
- The workflow used `google-github-actions/setup-gcloud@v2`, while the official setup-gcloud README recommends pinning to the latest major, currently `setup-gcloud@v3`. Updated the example to `setup-gcloud@v3`.
- The branch-specific service account IAM binding used `principalSet://.../subject/...`. Google Cloud principal identifier documentation uses `principal://.../subject/...` for a single workload identity subject. Updated the branch-specific example to use `principal://`.
- The Cloud Run example granted `roles/run.developer`, but the workflow deploys with `gcloud run deploy --source`, which requires Cloud Run Source Developer, Service Usage Consumer, Service Account User on the runtime service identity, and Cloud Run Builder for the default Cloud Build service account. Updated the example IAM commands accordingly.

## Review Notes
The main Workload Identity Federation flow, OIDC issuer URL, attribute mapping pattern, `id-token: write` permission, provider resource name format, and repository-level `principalSet` binding matched official documentation. Google Cloud recommends numeric GitHub claims such as `repository_id` and `repository_owner_id` where possible to reduce name reuse risks; the post's name-based examples are common and functional, but numeric IDs would be a stronger future hardening improvement.
