# Validation Summary: How to Use the compact Function in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- AWS IAM ARNs
- AWS security group rules

## Sources Consulted
- OpenTofu `compact` function docs: https://opentofu.org/docs/language/functions/compact/
- OpenTofu `concat` function docs: https://opentofu.org/docs/language/functions/concat/
- OpenTofu `split` function docs: https://opentofu.org/docs/language/functions/split/
- OpenTofu `for` expressions docs: https://opentofu.org/docs/language/expressions/for/
- OpenTofu references to named values docs: https://opentofu.org/docs/language/expressions/references/
- OpenTofu `count` meta-argument docs: https://opentofu.org/docs/language/meta-arguments/count/
- AWS IAM ARN reference: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference-arns.html
- AWS provider security group docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group

## Issues Found
- The "Conditional Optional Arguments" example mixed an IAM managed policy ARN (`arn:aws:iam::aws:policy/...`) with variables named `*_role_arn`, which implied role ARNs. I changed the base example value and the expected result comment to use valid IAM role ARN examples so the identifiers are technically consistent.

## Review Notes
- The OpenTofu-specific explanation of `compact()` is accurate with current OpenTofu documentation: it removes only `null` and empty-string elements from a list of strings.
- The `split(",", "")` example is correct for OpenTofu and produces `[""]`, so `compact(split(...))` is a valid pattern for trimming empty CSV elements.
- The `aws_security_group_rule` example is still valid, but current AWS provider guidance prefers `aws_vpc_security_group_ingress_rule` and `aws_vpc_security_group_egress_rule` for new security group rule definitions.
