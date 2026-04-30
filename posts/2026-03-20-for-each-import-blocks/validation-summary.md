# Validation Summary: How to Use for_each with Import Blocks in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HashiCorp AWS provider
- AWS EC2
- AWS S3
- AWS IAM
- AWS Route 53
- HCL

## Sources Consulted
- OpenTofu import documentation: https://opentofu.org/docs/language/import/
- OpenTofu 1.7 release notes: https://opentofu.org/docs/v1.7/intro/whats-new/
- OpenTofu `for_each` meta-argument documentation: https://opentofu.org/docs/v1.11/language/meta-arguments/for_each/
- OpenTofu `tofu state list` command documentation: https://opentofu.org/docs/cli/commands/state/list/
- AWS provider `aws_instance` resource import documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance#import
- AWS provider `aws_s3_bucket` resource import documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket#import
- AWS provider `aws_iam_role` resource import documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role#import
- AWS provider `aws_route53_record` resource import documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record#import

## Issues Found
- The Route 53 import ID format was incorrect. It used slash-separated values, but the AWS provider expects underscore-separated values for `id`-based imports, so the example was corrected.
- The IAM role example was incomplete for configuration-driven import because it did not include the required target `resource` block. A matching `aws_iam_role` resource with the required `assume_role_policy` argument was added.
- The Route 53 example was incomplete for configuration-driven import because it did not include the target `resource` block and omitted required record attributes. A matching `aws_route53_record` resource and supporting data were added.
- The count-based import example was adjusted to use the documented map-comprehension pattern, which cleanly maps count indexes to import IDs.
- The verification text was too absolute. It now correctly states that `tofu plan` should show no changes only when the resource configuration matches the imported infrastructure.
- Several placeholder EC2 instance IDs were normalized to plausible long-form instance ID shapes.

## Review Notes
- OpenTofu documents import blocks as experimental, including loopable import blocks.
- OpenTofu currently does not support generated configuration output for `import` blocks that use `for_each`.
