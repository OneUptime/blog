# Validation Summary: How to Sort Resources by Custom Criteria in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- Terraform-compatible HCL
- OpenTofu `sort`, `reverse`, `format`, `split`, and `length` functions
- OpenTofu `for` expressions
- AWS provider `aws_ami` and `aws_ami_ids` data sources
- AWS EC2 AMI filtering

## Sources Consulted
- OpenTofu `sort` function documentation: https://opentofu.org/docs/language/functions/sort/
- OpenTofu `reverse` function documentation: https://opentofu.org/docs/language/functions/reverse/
- OpenTofu `format` function documentation: https://opentofu.org/docs/language/functions/format/
- OpenTofu `split` function documentation: https://opentofu.org/docs/language/functions/split/
- OpenTofu `for` expressions documentation: https://opentofu.org/docs/language/expressions/for/
- OpenTofu resource dependency behavior documentation: https://opentofu.org/docs/v1.11/language/resources/behavior/
- Terraform AWS provider `aws_ami` data source documentation source: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/d/ami.html.markdown
- Terraform AWS provider `aws_ami_ids` data source documentation source: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/d/ami_ids.html.markdown
- AWS CLI `ec2 describe-images` filter documentation: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-images.html

## Issues Found

1. **Smallest/largest wording was too broad.** The post said to use `sort` and index access to pick the minimum or maximum value, but OpenTofu `sort` sorts strings lexicographically, not numerically or semantically. Changed the wording to "lexicographically first or last string value."

2. **AMI example sorted opaque AMI IDs instead of creation dates.** The original AMI section claimed to sort by creation date but sorted `aws_ami_ids` values lexicographically and picked the last ID as a proxy for latest. AMI IDs do not encode creation time. Updated the example to use the AWS provider `aws_ami_ids` data source's `sort_ascending = false` creation-time ordering and select `ids[0]` as the latest AMI.

## Review Notes
- The basic `sort`, `reverse`, `for` expression, composite key, zero-padding, and `split` examples are consistent with OpenTofu language documentation.
- The CIDR example is correct only as a lexicographic string sort; it should not be interpreted as numeric IP/network ordering.
- The `aws_ami` example with `most_recent = true`, `owners = ["self"]`, and a `name` filter is consistent with the AWS provider documentation.
- OpenTofu/Terraform CLIs were not installed in the local environment, so validation was performed against official documentation rather than by running `tofu validate`.
