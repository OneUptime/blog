# Validation Summary: How to Create Terraform Onboarding Guides for New Team Members

## Status
validated

## Post Type
Guide / Process documentation with technical examples

## Technologies Covered
- Terraform (v1.6.x)
- HCL configuration language
- AWS provider (~> 5.30)
- AWS CLI
- TFLint
- pre-commit framework
- Homebrew (macOS package manager)
- S3 backend for Terraform state
- YAML configuration
- Python (for metrics script example)

## Sources Consulted
- HashiCorp Terraform official installation docs: https://developer.hashicorp.com/terraform/install
- HashiCorp Homebrew tap: https://github.com/hashicorp/homebrew-tap
- Terraform CLI documentation (init, plan, apply, fmt, validate, state, import): https://developer.hashicorp.com/terraform/cli/commands
- Terraform S3 backend docs: https://developer.hashicorp.com/terraform/language/backend/s3
- AWS provider docs (aws_s3_bucket, aws_instance): https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- TFLint docs: https://github.com/terraform-linters/tflint (the `tflint --init` command for installing plugins)
- pre-commit docs: https://pre-commit.com/

## Issues Found
1. **`brew install terraform` is no longer the official installation method on macOS.** Since HashiCorp moved Terraform to the Business Source License (BSL) in August 2021, the `terraform` formula was removed from homebrew-core. The current official approach uses the HashiCorp tap.
   - **Fix:** Updated the environment setup guide to use `brew tap hashicorp/tap` followed by `brew install hashicorp/tap/terraform`, which matches HashiCorp's documented installation procedure.

## Review Notes
- The HCL example (`required_version = ">= 1.6.0"`, `aws` provider `~> 5.30`, S3 backend block, `aws_s3_bucket` resource with tags and variables) is syntactically valid and uses current, non-deprecated APIs.
- State manipulation commands referenced (`terraform state mv`, `terraform state rm`, `terraform import`) are accurate.
- `terraform fmt -recursive` is a valid flag.
- The `terraform validate` description ("Check syntax without accessing providers") is a reasonable simplification: validate does not contact provider APIs, although it does require providers to be installed via `terraform init`. Acceptable in a cheat-sheet context.
- `pip install pre-commit` works, though `pipx install pre-commit` is now generally recommended to avoid polluting the global Python environment. Not technically wrong; no change made.
- The post is largely a process/template guide; most "code" examples are illustrative YAML/markdown templates rather than executable code, so technical surface area is moderate.
