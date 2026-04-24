# Validation Summary: How to Handle Provider Breaking Changes in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- OpenTofu CLI (`tofu init`, `tofu plan`, `tofu apply`)
- HashiCorp AWS provider
- HCL / OpenTofu configuration language
- AWS S3 bucket resources

## Sources Consulted
- OpenTofu Version Constraints: https://opentofu.org/docs/language/expressions/version-constraints/
- OpenTofu Provider Requirements: https://opentofu.org/docs/language/providers/requirements/
- OpenTofu `init` command: https://opentofu.org/docs/cli/init/
- OpenTofu `plan` command: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply` command: https://opentofu.org/docs/v1.11/cli/commands/apply/
- OpenTofu refactoring and `moved` blocks: https://opentofu.org/docs/language/modules/develop/refactoring/
- Terraform AWS Provider Version 5 Upgrade Guide: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/guides/version-5-upgrade
- Terraform AWS Provider Version 4 Upgrade Guide source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/guides/version-4-upgrade.html.markdown
- AWS provider `aws_s3_bucket` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/s3_bucket.html.markdown
- AWS provider `aws_s3_bucket_acl` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/s3_bucket_acl.html.markdown
- AWS provider `aws_s3_bucket_ownership_controls` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/s3_bucket_ownership_controls.html.markdown

## Issues Found
1. **Incorrect provider-constraint upgrade example.** The original post changed `~> 5.0` to `~> 5.31.0`, but `~> 5.0` already allows newer 5.x releases while `~> 5.31.0` narrows the range to patch releases within 5.31 only. Updated the example to `~> 4.65` -> `~> 5.0`, which matches the AWS provider upgrade guidance.

2. **Undocumented AWS v5 breaking-change examples in the changelog section.** The original bullets referenced `skip_final_snapshot` and a removed default egress rule, which do not match the official AWS provider v5 upgrade guide. Replaced them with documented examples: inline `aws_s3_bucket` settings moving to standalone resources, `aws_db_instance.id` no longer representing the DB identifier, and non-VPC `aws_security_group` resources no longer being supported.

3. **S3 migration example did not preserve the ACL behavior it showed in the old configuration.** The old example included `acl = "private"` but the migrated example omitted the corresponding standalone resources. Updated the section to mark the inline S3 settings as deprecated in v4 and removed in v5, and added `aws_s3_bucket_ownership_controls` plus `aws_s3_bucket_acl` so the migrated example matches the documented approach.

4. **Invalid `moved` block example.** The original example attempted to move state from `aws_s3_bucket_acl` to `aws_s3_bucket_ownership_controls`, which are different resource types representing different AWS features rather than a rename. Replaced it with a valid same-resource rename example that matches OpenTofu's documented `moved` usage.

## Review Notes
- The post is a technical guide with executable configuration and CLI examples, so `validated` is the correct status after fixes.
- For existing S3 buckets, the AWS provider documentation recommends importing newly introduced `aws_s3_bucket_*` resources into state during this refactor. The post is now technically correct, but an explicit import walkthrough could improve a future revision.
- The `tofu` binary was not available in the local workspace, so CLI syntax was verified against official OpenTofu documentation instead of local `--help` output.
