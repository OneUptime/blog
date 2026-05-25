# Validation Summary: How to Configure TFLint Rules for AWS

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- TFLint
- TFLint AWS ruleset
- Terraform HCL
- Terraform AWS provider resources
- GitHub Actions
- AWS credential configuration

## Sources Consulted
- TFLint AWS ruleset README and rule list: https://github.com/terraform-linters/tflint-ruleset-aws
- TFLint AWS ruleset configuration docs: https://github.com/terraform-linters/tflint-ruleset-aws/blob/master/docs/configuration.md
- TFLint AWS ruleset deep checking docs: https://github.com/terraform-linters/tflint-ruleset-aws/blob/master/docs/deep_checking.md
- TFLint AWS `aws_resource_missing_tags` rule docs: https://github.com/terraform-linters/tflint-ruleset-aws/blob/master/docs/rules/aws_resource_missing_tags.md
- TFLint annotation docs: https://github.com/terraform-linters/tflint/blob/master/docs/user-guide/annotations.md
- TFLint configuration and CLI docs: https://github.com/terraform-linters/tflint/blob/master/docs/user-guide/config.md and https://github.com/terraform-linters/tflint
- Terraform AWS provider `aws_s3_bucket` docs: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/s3_bucket.html.markdown

## Issues Found
- The AWS ruleset version was stale (`0.31.0`). Updated all snippets to `0.47.0`, the latest tag found in the official ruleset repository.
- The post said the ruleset includes "hundreds" of rules. Updated this to "700+" to match the current official ruleset documentation.
- The deep-check examples claimed instance-type regional availability validation. The official deep-check docs list account reads such as AMI, subnet, security group, key pair, route, RDS, ElastiCache, and IAM instance profile checks, while EC2 instance type validation is a static rule. Replaced that example with IAM instance profile existence.
- The explanation of non-deep checking implied all checks use static known-value lists. Reworded it to say static AWS rules still run, while account-reading checks are skipped.
- The rule configuration snippet said "Configure rule severity", but TFLint rule blocks enable/disable rules and rule-specific options; they do not generally override a rule's severity. Changed the comment to "Enable another specific rule."
- The IAM policy section claimed TFLint checks valid IAM policy syntax and can warn about overly permissive policies. The AWS ruleset's IAM policy checks cover constraints such as policy length, allowed characters, SID characters, and GovCloud ARN portability, not least-privilege analysis. Updated the wording and removed the misleading permissive-policy comment.
- The CI deep-check snippet used an undocumented `TFLINT_AWS_DEEP_CHECK` environment variable. Replaced it with documented guidance to set `deep_check = true` in `.tflint.hcl` and run TFLint with an absolute config path during recursive execution.
- The ignore example put `tflint-ignore` before the resource block and described `tflint-ignore-file` as disabling a block. Moved the line ignore next to the attribute being checked and clarified that `tflint-ignore-file` disables a rule for the whole file.

## Review Notes
The post is now technically accurate for the current TFLint and TFLint AWS ruleset docs as of 2026-05-25. TFLint and provider rules change frequently, so the pinned AWS ruleset version should be reviewed during future refreshes.
