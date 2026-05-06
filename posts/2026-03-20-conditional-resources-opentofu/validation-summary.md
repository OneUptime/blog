# Validation Summary: How to Create Conditional Resources in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- AWS provider for OpenTofu/Terraform
- AWS CloudWatch Logs
- AWS WAFv2
- AWS Application Load Balancer

## Sources Consulted
- OpenTofu `count` meta-argument docs: https://opentofu.org/docs/language/meta-arguments/count/
- OpenTofu `for_each` meta-argument docs: https://opentofu.org/docs/v1.11/language/meta-arguments/for_each/
- OpenTofu `enabled` meta-argument docs: https://opentofu.org/docs/v1.11/language/meta-arguments/enabled/
- OpenTofu `one` function docs: https://opentofu.org/docs/language/functions/one/
- OpenTofu `try` function docs: https://opentofu.org/docs/language/functions/try/
- OpenTofu types and `null` semantics docs: https://opentofu.org/docs/language/expressions/types/
- AWS provider `aws_cloudwatch_log_group` docs: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/cloudwatch_log_group.html.markdown
- AWS provider `aws_s3_bucket_replication_configuration` docs: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/s3_bucket_replication_configuration.html.markdown
- AWS provider `aws_lb_listener_rule` docs: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/lb_listener_rule.html.markdown
- AWS provider `aws_wafv2_web_acl` docs: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/wafv2_web_acl.html.markdown
- AWS provider `aws_wafv2_web_acl_association` docs: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/wafv2_web_acl_association.html.markdown

## Issues Found
- The introduction and conclusion were outdated for current OpenTofu because OpenTofu v1.11 added `lifecycle { enabled = ... }` for single-resource conditional creation. I updated both sections so the post does not imply `count` and `for_each` are the only current patterns.
- Pattern 4 used `aws_s3_bucket_replication_configuration` with `for_each`, but AWS S3 supports only one replication configuration per bucket. I replaced that snippet with a valid `for_each` example using `aws_cloudwatch_log_group`.
- The note saying null attributes are "safely ignored" was too broad. OpenTofu treats `null` as omission, but required arguments still error if a resource instance is created without them. I changed the note to describe the actual safe pattern used here: skipping the association with `count` when the ARN is absent.
- The optional object example declared `certificate_arn` but never used it. I removed the unused field so the object schema matches the example behavior.

## Review Notes
- The snippets are technically valid as isolated examples, but they are excerpt-style examples rather than a single copy-paste-ready module. Several snippets assume surrounding provider configuration and related resources such as `aws_lb.main` or `aws_vpc.main`.
- For OpenTofu versions earlier than v1.11, the `enabled` meta-argument is unavailable, so the `count` and `for_each` patterns remain the correct approach.
