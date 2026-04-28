# Validation Summary: How to Configure GCS Backend with Workload Identity Federation in OpenTofu (2)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (GCS backend)
- Terraform
- Google Cloud Platform (GCP)
- Google Cloud Storage (GCS)
- Workload Identity Federation (WIF)
- GitHub Actions (OIDC)
- Google Kubernetes Engine (GKE) Workload Identity
- gcloud CLI
- Kubernetes (kubernetes_service_account resource)

## Sources Consulted
- gcloud reference for workload-identity-pools providers create-oidc: https://cloud.google.com/sdk/gcloud/reference/iam/workload-identity-pools/providers/create-oidc
- Google Cloud Workload Identity Federation with deployment pipelines (GitHub Actions): https://cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines
- Google Cloud "Manage workload identity pools and providers": https://cloud.google.com/iam/docs/manage-workload-identity-pools-providers
- GitHub Docs on configuring OIDC in GCP: https://docs.github.com/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-google-cloud-platform
- GKE Workload Identity docs: https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- google-github-actions/auth releases: https://github.com/google-github-actions/auth/releases
- opentofu/setup-opentofu releases: https://github.com/opentofu/setup-opentofu/releases
- OpenTofu GCS backend docs: https://opentofu.org/docs/language/settings/backends/gcs/

## Issues Found

1. **Missing `--attribute-condition` flag in `gcloud iam workload-identity-pools providers create-oidc`** — Since approximately April 2024, Google Cloud requires new workload identity pool providers (especially those using public OIDC issuers like GitHub Actions) to specify an `--attribute-condition` to mitigate the confused-deputy problem. Running the command as originally written would fail with an `INVALID_ARGUMENT` error stating that the attribute condition is required. I fixed this by:
   - Adding `attribute.repository_owner=assertion.repository_owner` to the `--attribute-mapping` so the `repository_owner` claim is available.
   - Adding `--attribute-condition="assertion.repository_owner == 'acme-org'"` to restrict which repositories are allowed to authenticate via this provider.

## Review Notes
- `google-github-actions/auth@v2` still works but `@v3` is now the current major release. The post's use of `@v2` is functional and not technically wrong, so it was left as-is. A future revision could bump it to `@v3`.
- `opentofu/setup-opentofu@v1` and `actions/checkout@v4` are current.
- The GitHub OIDC issuer URI `https://token.actions.githubusercontent.com` is correct.
- The `principalSet://...` URI format and the `gcloud storage buckets add-iam-policy-binding` command are syntactically correct and current.
- The GKE Workload Identity annotation (`iam.gke.io/gcp-service-account`) and the GCP IAM member format `serviceAccount:PROJECT_ID.svc.id.goog[NAMESPACE/KSA_NAME]` are correct.
- The claim that no `credentials` block is required in the GCS backend config when using ADC from Workload Identity is accurate.
