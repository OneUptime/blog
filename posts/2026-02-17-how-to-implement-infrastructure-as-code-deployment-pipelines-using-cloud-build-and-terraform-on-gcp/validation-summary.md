# Validation Summary: How to Use Infrastructure as Code Deployment Pipelines Using Cloud Build

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Build
- Google Cloud Storage
- Terraform
- Google Cloud IAM
- GitHub pull request comments API
- Trivy
- Open Policy Agent / Rego
- HCP Terraform policy checks

## Sources Consulted
- Terraform GCS backend documentation: https://developer.hashicorp.com/terraform/language/backend/gcs
- Google Cloud Build GitHub trigger reference: https://docs.cloud.google.com/sdk/gcloud/reference/builds/triggers/create/github
- Google Cloud Build substitutions documentation: https://docs.cloud.google.com/build/docs/configuring-builds/substitute-variable-values
- Google Cloud Build Secret Manager integration documentation: https://docs.cloud.google.com/build/docs/securing-builds/use-secrets
- Google Cloud Build default service account documentation: https://docs.cloud.google.com/build/docs/cloud-build-service-account
- GitHub REST API issue and pull request comments documentation: https://docs.github.com/en/rest/issues/comments
- Trivy Terraform IaC scanning documentation: https://trivy.dev/docs/latest/coverage/iac/terraform/
- Aqua Security tfsec repository notice: https://github.com/aquasecurity/tfsec
- Open Policy Agent v1 Rego syntax guidance: https://support.hashicorp.com/hc/en-us/articles/43942069326483-OPA-Policy-Evaluations-Fail-With-Errors-if-keyword-is-required-before-rule-body-and-contains-keyword-is-required-for-partial-set-rules

## Issues Found
- The remote state setup comments referred to creating a state-locking table. Terraform's GCS backend supports state locking natively and does not require a separate lock table, so the comments were corrected.
- The pull request comment step only echoed the generated comment instead of posting it. It now uses a GitHub token from Secret Manager and calls the GitHub issue comments API, which is the correct API for pull request conversation comments.
- The security scan used standalone tfsec. Since tfsec has been folded into Trivy, the example now uses `trivy config` for Terraform misconfiguration scanning.
- The Rego policy used pre-OPA-1.0 partial-set rule syntax. It now imports `rego.v1` and uses `deny contains msg if` syntax.
- The text referenced Sentinel generically. It was updated to HCP Terraform policy checks to avoid implying Sentinel can be directly added to a Cloud Build pipeline in the same way as OPA/conftest.

## Review Notes
The tutorial still uses broad `roles/editor` grants as an illustrative starting point and explicitly tells readers to scope them down. For production, a future improvement would be to show a least-privilege custom role or per-resource predefined roles, but the existing warning is technically accurate.
