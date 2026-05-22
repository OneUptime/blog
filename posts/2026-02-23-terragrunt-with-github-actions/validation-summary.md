# Validation Summary: How to Use Terragrunt with GitHub Actions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitHub Actions
- Terragrunt
- Terraform
- AWS IAM OIDC federation
- GitHub Actions artifacts and cache
- GitHub pull request comments

## Sources Consulted
- Terragrunt CLI `run` command documentation: https://docs.terragrunt.com/reference/cli/commands/run/
- Terragrunt CLI redesign migration guide: https://docs.terragrunt.com/migrate/cli-redesign/
- Terragrunt install documentation: https://docs.terragrunt.com/getting-started/install/
- Terragrunt Provider Cache Server documentation: https://docs.terragrunt.com/features/caching/provider-cache-server/
- HashiCorp setup-terraform action README: https://github.com/hashicorp/setup-terraform
- AWS configure-aws-credentials action README: https://github.com/aws-actions/configure-aws-credentials
- GitHub checkout action README: https://github.com/actions/checkout
- GitHub cache action README: https://github.com/actions/cache
- GitHub upload-artifact action README: https://github.com/actions/upload-artifact
- GitHub download-artifact action README: https://github.com/actions/download-artifact
- GitHub github-script action README: https://github.com/actions/github-script
- Terraform AWS provider `aws_iam_openid_connect_provider` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_openid_connect_provider
- AWS IAM OIDC thumbprint documentation: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc_verify-thumbprint.html

## Issues Found
- The examples used older Terragrunt CLI forms (`run-all`, `--terragrunt-non-interactive`, and `TERRAGRUNT_NON_INTERACTIVE`). Updated them to the current `terragrunt run --all`, `--non-interactive`, and `TG_NON_INTERACTIVE` forms.
- The workflow pinned older tool/action versions. Updated Terraform setup, Terragrunt install version, checkout, cache, artifact, github-script, and AWS credential actions to current documented versions.
- The plan step captured Terragrunt's pipeline exit code but did not exit with it, so a failed plan could still pass. Updated it to exit with the captured Terragrunt status and made the PR comment step run with `if: always()`.
- The PR comment template had indentation inside the JavaScript template literal that could render the fenced plan output incorrectly. Removed that indentation.
- The AWS OIDC provider example used a hard-coded GitHub TLS thumbprint. Removed it because current AWS/Terraform provider documentation allows omitting `thumbprint_list`, and AWS generally uses trusted root CAs for GitHub OIDC.
- The caching example exported `TERRAGRUNT_DOWNLOAD` inside a single shell step, which would not persist to later GitHub Actions steps and used old environment variable naming. Updated it to write `TG_DOWNLOAD_DIR`, `TG_PROVIDER_CACHE`, and `TG_PROVIDER_CACHE_DIR` to `$GITHUB_ENV`.
- The changed-module detection example relied on `origin/main...HEAD` without ensuring full git history was available. Added checkout with `fetch-depth: 0`.
- The saved-plan wording implied plans could be applied across separate PR and merge workflow runs. Clarified that the saved plan applies in the same workflow run.

## Review Notes
- The example still uses broad `AdministratorAccess` as a placeholder policy and says to attach the policies Terraform needs. A production workflow should replace this with least-privilege permissions.
- `terragrunt run --all plan` can fail for stacks with dependency outputs that have never been applied; Terragrunt documents mock outputs as the usual workaround.
