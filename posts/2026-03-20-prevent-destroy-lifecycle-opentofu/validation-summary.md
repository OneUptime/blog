# Validation Summary: How to Use prevent_destroy Lifecycle in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- AWS provider resources (`aws_rds_cluster`, `aws_db_instance`, `aws_s3_bucket`, `aws_kms_key`, `aws_eks_cluster`)

## Sources Consulted
- OpenTofu lifecycle meta-argument docs: https://opentofu.org/docs/language/meta-arguments/lifecycle/
- OpenTofu destroy command docs: https://opentofu.org/docs/cli/commands/destroy/
- OpenTofu apply command docs: https://opentofu.org/docs/cli/commands/apply/
- OpenTofu plan command docs: https://opentofu.org/docs/cli/commands/plan/
- AWS provider docs for `aws_rds_cluster`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/rds_cluster.html.markdown
- AWS provider docs for `aws_db_instance`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/db_instance.html.markdown
- AWS provider docs for `aws_eks_cluster`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/eks_cluster.html.markdown
- AWS provider docs for `aws_kms_key`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/kms_key.html.markdown
- AWS provider docs for `aws_s3_bucket`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket

## Issues Found
- The post used variable and conditional expressions for `prevent_destroy` in the environment-specific and module examples. I replaced those examples because OpenTofu lifecycle settings accept only literal values.
- The intentional deletion workflow incorrectly said a separate `tofu apply` step updates state before destroy. I removed that step and changed the example to destroy using the updated configuration.
- The combined lifecycle example implied `create_before_destroy` would provide zero-downtime replacement while `prevent_destroy = true` remained enabled. I clarified that `create_before_destroy` does not override `prevent_destroy`.
- The EKS example in "Resources to Protect" omitted required provider arguments while looking like a complete resource block. I marked it as a partial example with `# ...`.
- The RDS cluster examples used in the destroy workflow omitted `skip_final_snapshot`, which can otherwise block deletion for reasons unrelated to `prevent_destroy`. I added `skip_final_snapshot = true` to keep the example flow technically consistent.
- I corrected incorrect `Protect_destroy` and `protect_destroy` terminology, and changed "Terraform configuration" to "OpenTofu configuration" for consistency with the subject of the post.

## Review Notes
- OpenTofu CLI was not installed in this workspace, so command verification was done against official OpenTofu documentation rather than local `tofu --help` output.
- `prevent_destroy` only applies while the protected resource block remains in configuration; removing the whole resource block also removes the protection.
