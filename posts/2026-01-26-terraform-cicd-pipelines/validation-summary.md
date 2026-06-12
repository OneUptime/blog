# Validation Summary: How to Build CI/CD Pipelines for Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- GitHub Actions
- GitLab CI/CD
- AWS IAM OIDC federation
- Trivy
- Checkov
- Infracost
- Slack notifications

## Sources Consulted
- HashiCorp Terraform `plan` command documentation: https://developer.hashicorp.com/terraform/cli/commands/plan
- HashiCorp Terraform `apply` command documentation: https://developer.hashicorp.com/terraform/cli/commands/apply
- HashiCorp Terraform install/version documentation: https://developer.hashicorp.com/terraform/install
- HashiCorp setup-terraform GitHub Action documentation: https://github.com/hashicorp/setup-terraform
- GitHub Actions OIDC reference: https://docs.github.com/en/actions/reference/security/oidc
- GitHub Actions AWS OIDC configuration documentation: https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws
- AWS provider `aws_iam_openid_connect_provider` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_openid_connect_provider
- GitLab CI/CD YAML syntax and rules documentation: https://docs.gitlab.com/ci/yaml/ and https://docs.gitlab.com/ci/jobs/job_rules/
- Trivy Terraform scanning documentation: https://trivy.dev/docs/latest/tutorials/misconfiguration/terraform/
- Aqua Security Trivy GitHub Action documentation: https://github.com/aquasecurity/trivy-action
- Checkov GitHub Actions integration documentation: https://www.checkov.io/4.Integrations/GitHub%20Actions.html
- Infracost GitHub Actions documentation: https://github.com/infracost/actions
- GitHub Actions artifact documentation: https://docs.github.com/en/actions/tutorials/store-and-share-data

## Issues Found
- The Markdown code fences around the GitHub Actions examples were mismatched. The basic pipeline opened with a four-backtick fence but closed with three backticks, and the multi-environment snippet closed with four backticks. Corrected the fence endings so both snippets render as intended.
- The examples pinned Terraform `1.6.0`, while HashiCorp's current documented Terraform release is `1.15.6`. Updated the GitHub Actions and GitLab CI examples to use `1.15.6`.
- The basic GitHub Actions workflow used `continue-on-error` for `fmt` and `plan` so it could comment on pull requests, but it never failed the job afterward. Added a status step that exits non-zero when formatting or planning fails, matching the post's recommendation to block failed plans.
- The multi-environment GitHub Actions workflow configured AWS credentials with OIDC but did not grant `id-token: write`. Added the required `id-token: write` and `contents: read` permissions.
- The GitLab `apply` job mixed `rules` with job-level `when: manual`. Moved `when: manual` into the matching rule to align with GitLab's documented `rules` examples.
- The AWS OIDC provider hard-coded a GitHub certificate thumbprint and used a broad `sub` condition while describing branch restrictions. Removed the hard-coded thumbprint and narrowed the trust condition to the main branch and pull request workflow context.
- The security scanning example used `tfsec`, which Aqua has consolidated into Trivy. Replaced the tfsec step with the current Trivy GitHub Action configuration for Terraform configuration scanning.
- The drift detection workflow treated any non-zero `terraform plan -detailed-exitcode` result as drift. Updated it to distinguish exit code `2` for drift from exit code `1` for errors.

## Review Notes
- Terraform plan artifacts can contain sensitive values in cleartext. The artifact example is technically valid, but production pipelines should restrict artifact access and retention.
- `bridgecrewio/checkov-action@master` is valid per Checkov's marketplace/action documentation, but pinning actions to immutable SHAs is stronger supply-chain practice.
- The local environment did not have Terraform installed, so command behavior was verified against official HashiCorp documentation rather than local CLI help.
