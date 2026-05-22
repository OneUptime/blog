# Validation Summary: How to Optimize Terraform for CI/CD Speed

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform CLI
- Terraform provider and module caching
- GitHub Actions
- GitHub Actions cache and artifact actions
- Docker
- HCP Terraform
- Atlantis

## Sources Consulted
- Terraform CLI `plan` command reference: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform CLI `apply` command reference: https://developer.hashicorp.com/terraform/cli/commands/apply
- Terraform CLI `init` command reference: https://developer.hashicorp.com/terraform/cli/commands/init
- Terraform CLI configuration and provider plugin cache documentation: https://developer.hashicorp.com/terraform/cli/config/config-file#provider-plugin-cache
- Terraform working directory initialization documentation: https://developer.hashicorp.com/terraform/cli/init
- Terraform saved plan tutorial: https://developer.hashicorp.com/terraform/tutorials/cli/plan
- HCP Terraform cloud block reference: https://developer.hashicorp.com/terraform/language/settings/terraform-cloud
- GitHub Actions dependency caching documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching
- GitHub Actions workflow artifacts documentation: https://docs.github.com/actions/guides/storing-workflow-data-as-artifacts
- Atlantis server configuration documentation: https://www.runatlantis.io/docs/server-configuration

## Issues Found
- The Docker provider pre-build example downloaded providers into `/workspace/.terraform` during image build, but the later GitHub Actions job runs after checkout in the job workspace, so that `.terraform` directory would not reliably be used. Changed the example to pre-warm Terraform's documented shared provider cache with `TF_PLUGIN_CACHE_DIR`.
- The Docker example used `hashicorp/terraform:1.7`, which is an older Terraform image tag. Updated it to `hashicorp/terraform:1.14` to align with the current Terraform documentation version family.
- The Docker example copied only `main.tf`, which could miss provider declarations commonly stored in other root-module `.tf` files. Changed it to copy `*.tf` so `terraform init -backend=false` can discover the full root module provider requirements.

## Review Notes
The article's Terraform CLI flags, saved plan workflow, GitHub Actions cache syntax, artifact upload/download pattern, `cloud` block shape, and Atlantis provider cache claim are consistent with the consulted documentation. The performance numbers are workload-dependent examples rather than guaranteed results.
