# Validation Summary: How to Structure Terragrunt for Multi-Account AWS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terragrunt (Gruntwork) — multi-account configuration patterns
- Terraform / OpenTofu (HCL)
- AWS (IAM, S3, DynamoDB, VPC, EKS, RDS, Transit Gateway)
- AWS multi-account / AWS Organizations
- GitHub Actions (CI/CD)
- tflint / tfsec (validation hooks)
- Bash (bootstrap scripting)

## Sources Consulted
- Terragrunt official docs — https://terragrunt.gruntwork.io/docs/
- Terragrunt `remote_state` reference — https://terragrunt.gruntwork.io/docs/reference/config-blocks-and-attributes/#remote_state
- Terragrunt `generate` block — https://terragrunt.gruntwork.io/docs/reference/config-blocks-and-attributes/#generate
- Terragrunt `dependency` block — https://terragrunt.gruntwork.io/docs/reference/config-blocks-and-attributes/#dependency
- Terragrunt built-in functions (`find_in_parent_folders`, `read_terragrunt_config`, `path_relative_to_include`, `dirname`) — https://terragrunt.gruntwork.io/docs/reference/built-in-functions/
- Terragrunt `include`, `expose`, hooks (`before_hook` / `after_hook`) — https://terragrunt.gruntwork.io/docs/features/keep-your-terragrunt-architecture-dry/
- Terraform AWS provider `assume_role` and `default_tags` — https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- terraform-aws-modules/vpc input names (single_nat_gateway, one_nat_gateway_per_az, flow logs) — https://registry.terraform.io/modules/terraform-aws-modules/vpc/aws/latest
- AWS S3 / DynamoDB CLI reference — https://docs.aws.amazon.com/cli/latest/reference/
- GitHub Actions referenced actions: actions/checkout@v4, hashicorp/setup-terraform@v3, aws-actions/configure-aws-credentials@v4, dorny/paths-filter@v2

## Issues Found
1. **Broken path interpolation in three `include "envcommon"` blocks.** The original `path = "${dirname(find_in_parent_folders())}_envcommon/vpc.hcl"` is missing the path separator. `dirname()` returns a path with no trailing slash, so the result resolves to e.g. `/.../infrastructure_envcommon/vpc.hcl` (the directory name and `_envcommon` get glued together) instead of `/.../infrastructure/_envcommon/vpc.hcl`, and Terragrunt would fail to load the shared config. Fixed in three places (dev VPC, prod EKS, prod VPC examples) by inserting `/` between the closing `}` and `_envcommon`.

2. **Missing heading marker on "Resource-Level Configuration".** The section was written as plain text (`Resource-Level Configuration` followed by a body paragraph) instead of an H2, so it rendered as body text and broke the document outline. Added `## ` prefix to match the surrounding section headings.

## Review Notes
- The post pins example tool versions to `TERRAGRUNT_VERSION: 0.54.0` and `TERRAFORM_VERSION: 1.6.0`. Both will be noticeably behind by the post's 2026-02-02 date; readers should bump to current versions before adopting. Left unchanged because they are clearly example values and not load-bearing for the patterns shown.
- The example EKS `cluster_version = "1.28"` and RDS `engine_version = "15.4"` are illustrative; both versions are at or past AWS deprecation windows by early 2026. Readers should substitute a currently-supported version.
- The bootstrap script uses `aws s3api create-bucket … --create-bucket-configuration LocationConstraint="${REGION}"` unconditionally. Historically this errored out when the target region is `us-east-1` (the API rejects `LocationConstraint=us-east-1`). The `|| true` after the command masks this, so the script "succeeds" silently even if the bucket isn't actually created when run in us-east-1 against older API behavior. Not changed since the script does include the error-suppression fallback and AWS has since relaxed this for new buckets, but worth being aware of.
- `terragrunt run-all apply tfplan` in the GitHub Actions job relies on each module having generated its own `tfplan` file in its working directory during the prior `run-all plan -out=tfplan` step. This works but is fragile across cache-clearing or re-checkout scenarios; consumers may prefer to plan/apply per-module or store plan artifacts.
- The `_global/iam` directory referenced by `dependency "iam"` is not shown in the directory tree at the top of the post. It's clear from context that `_global` would sit alongside the regions, but readers wiring this up themselves will need to create that directory.
- The IAM execution-role module declares an `environment` variable but does not consume it inside any resource. Harmless but unused.
