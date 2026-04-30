# Validation Summary: How to Configure GCS Backend with Workload Identity Federation in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Google Cloud Storage backend
- Google Cloud Workload Identity Federation
- Google Cloud IAM
- GitHub Actions
- OIDC
- HCL
- YAML

## Sources Consulted
- OpenTofu GCS backend documentation: https://opentofu.org/docs/language/settings/backends/gcs/
- Google Cloud Workload Identity Federation overview: https://cloud.google.com/iam/docs/workload-identity-federation
- Google Cloud deployment pipelines Workload Identity Federation guide: https://cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines
- Google Cloud service account authentication roles: https://cloud.google.com/iam/docs/service-account-permissions
- Google Cloud SDK reference for `gcloud iam workload-identity-pools describe`: https://cloud.google.com/sdk/gcloud/reference/iam/workload-identity-pools/describe
- GitHub Actions OIDC reference: https://docs.github.com/en/actions/reference/security/oidc
- `google-github-actions/auth` official action README: https://github.com/google-github-actions/auth

## Issues Found
- The token exchange explanation said the Workload Identity Pool exchanges the GitHub OIDC token. I corrected this to Google Cloud Security Token Service, which is the component that performs the token exchange in the documented flow.
- The backend snippet configured `impersonate_service_account`, even though the workflow already authenticates through `google-github-actions/auth` and provides Application Default Credentials to OpenTofu. I removed the extra backend impersonation setting so the example matches the documented ADC-based workflow and does not imply additional backend-specific impersonation configuration is required.
- The post omitted a required prerequisite for service-account-based Workload Identity Federation. I added a note to enable the IAM, Security Token Service, and Service Account Credentials APIs.
- The GitHub Actions workflow used `google-github-actions/auth@v2`. I updated it to `@v3`, which is the current major version in the action's official documentation.
- Some HCL examples referenced resources that were not defined in the post (`google_storage_bucket.terraform_state`, `google_service_account.terraform_prod`, and `google_service_account.terraform_staging`). I replaced those references with concrete example identifiers so the snippets are internally consistent.
- The verification note said the auth step "outputs credentials". I corrected this to reflect the documented behavior: the action creates a credentials file and exports `GOOGLE_APPLICATION_CREDENTIALS`.

## Review Notes
- Google Cloud recommends using numeric claims such as `repository_id` or `repository_owner_id` where possible, because name-based claims like `repository` can be more vulnerable to typosquatting or cybersquatting if a repository or organization name is later reused.
- The post remains technically valid as a GitHub Actions-focused guide, even though the description mentions other OIDC-capable CI/CD systems.
