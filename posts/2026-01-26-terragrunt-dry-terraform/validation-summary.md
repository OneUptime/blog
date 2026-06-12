# Validation Summary: How to Use Terragrunt for DRY Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terragrunt
- AWS S3 remote state backend
- AWS provider for Terraform
- GitHub Actions CI/CD
- Infrastructure as Code

## Sources Consulted
- Terragrunt installation documentation: https://docs.terragrunt.com/getting-started/install/
- Terragrunt CLI redesign migration guide: https://docs.terragrunt.com/migrate/cli-redesign/
- Terragrunt `run` command documentation: https://docs.terragrunt.com/reference/cli/commands/run/
- Terragrunt `dag graph` command documentation: https://docs.terragrunt.com/reference/cli/commands/dag/graph/
- Terragrunt HCL blocks documentation: https://docs.terragrunt.com/reference/hcl/blocks/
- Terragrunt HCL functions documentation: https://docs.terragrunt.com/reference/hcl/functions/
- Terragrunt state backend documentation: https://docs.terragrunt.com/features/units/state-backend/
- Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3

## Issues Found
- The S3 backend examples used `dynamodb_table` for state locking. Terraform's current S3 backend documentation marks DynamoDB-based locking as deprecated, so the examples now use `use_lockfile = true`.
- The Linux apt installation commands pointed at HashiCorp's apt repository and attempted to install `terragrunt`, which is not the official Terragrunt install path. The post now uses the official Homebrew-on-Linux option and a direct pinned GitHub release download.
- The direct Terragrunt download examples used the old `v0.55.0` release. They now use `v1.0.8`, the current stable release referenced by official Terragrunt installation docs at validation time.
- The command examples used deprecated `terragrunt run-all` and `terragrunt graph-dependencies` commands. They now use `terragrunt run --all` and `terragrunt dag graph`.
- The CI plan command used Terraform's `-out=tfplan` with an all-units Terragrunt run. Current Terragrunt docs provide `--out-dir` for per-unit plan files in `run --all` workflows, so the example now uses `terragrunt run --all plan --out-dir tfplan`.
- The migration example described importing existing state, but the command imports an existing resource into state. The wording was corrected and the command now uses the explicit modern `terragrunt run -- import ...` form.
- The backend initialization example now includes `--backend-bootstrap` for the initial remote state bootstrap path described by the current Terragrunt CLI migration docs.
- The naming-convention snippet referenced undefined Terragrunt locals. It now reads `env.hcl` and derives the prefix from `local.env_vars.locals`.

## Review Notes
The remaining examples are illustrative and omit full production network routing resources, such as route tables and NAT routes, but the Terraform and Terragrunt syntax shown is valid for the concepts being demonstrated.
