# Validation Summary: How to Set Up OpenTofu with GitLab CI/CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (v1.6+ / 1.7.0)
- GitLab CI/CD (`.gitlab-ci.yml` pipelines)
- HashiCorp Configuration Language (HCL)
- AWS provider (`hashicorp/aws` ~> 5.0)
- AWS S3 + DynamoDB remote state backend
- Azure / GCP credential environment variables

## Sources Consulted
- OpenTofu CLI docs: https://opentofu.org/docs/cli/
- OpenTofu S3 backend reference: https://opentofu.org/docs/language/settings/backends/s3/
- OpenTofu environment variables (`TF_LOG`, `TF_INPUT`, `TF_IN_AUTOMATION`): https://opentofu.org/docs/cli/config/environment-variables/
- OpenTofu Docker image (`ghcr.io/opentofu/opentofu`): https://github.com/opentofu/opentofu/pkgs/container/opentofu
- GitLab CI/CD `.gitlab-ci.yml` keyword reference: https://docs.gitlab.com/ee/ci/yaml/
- GitLab predefined CI/CD variables (`CI_PROJECT_DIR`, `CI_COMMIT_BRANCH`, `CI_DEFAULT_BRANCH`, `CI_PIPELINE_SOURCE`): https://docs.gitlab.com/ee/ci/variables/predefined_variables.html
- GitLab `rules`, `when: manual`, and `environment` semantics: https://docs.gitlab.com/ee/ci/jobs/job_control.html
- AWS provider variable validation and `default_tags`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs

## Issues Found
- **Step 4 was a GitHub Actions workflow, not a GitLab CI/CD pipeline.** The post's title, tags, description, and conclusion all advertise GitLab CI/CD, but the YAML in Step 4 was a `.github/workflows/infrastructure.yml` GitHub Actions file (with `jobs`, `runs-on`, `actions/checkout@v4`, `opentofu/setup-opentofu@v1`, `aws-actions/configure-aws-credentials@v4`, and `actions/upload-artifact@v3`). It appears to have been copy-pasted from the sibling `2026-03-20-opentofu-github-actions` post.

  Replaced with a correct `.gitlab-ci.yml` that uses:
  - The official OpenTofu container image (`ghcr.io/opentofu/opentofu:1.7.0`) with the entrypoint cleared so GitLab can run shell scripts.
  - Stages `validate`, `plan`, `apply` with a shared `default.before_script` for `tofu init`.
  - Standard GitLab predefined variables (`CI_PROJECT_DIR`, `CI_DEFAULT_BRANCH`, `CI_COMMIT_BRANCH`, `CI_PIPELINE_SOURCE`).
  - A `tfplan` artifact passed from `plan` to `apply` via `dependencies`.
  - `when: manual` on the `apply` job (gated on the default branch) to provide the approval workflow promised in the post's description.
  - A short paragraph below the YAML explaining where to set credentials in GitLab and how the manual approval gate works, since `actions/upload-artifact@v3` and other GitHub-specific concepts no longer apply.

## Review Notes
- All other code is technically correct: the `tofu` CLI invocations (`init`, `plan -out`, `show`, `apply`, `state list`, `state show`, `plan -refresh-only`, `fmt`, `validate`), the S3 backend block with DynamoDB locking, the AWS provider `default_tags`, the `locals` block, and the `variable "environment"` validation block all match current OpenTofu / Terraform syntax.
- `TF_LOG=INFO` and `TF_INPUT=false` are valid OpenTofu environment variables (inherited from Terraform's variable surface).
- The OpenTofu Docker image's default entrypoint is `tofu`, so the `entrypoint: [""]` override in the GitLab `default.image` block is required — without it, GitLab CI's shell-based `script` execution would fail.
- For teams already on GitLab, the GitLab-managed Terraform/OpenTofu state backend is an alternative to the S3 + DynamoDB backend shown in Step 2, but the S3 backend is still fully supported and a reasonable default; no change needed.
