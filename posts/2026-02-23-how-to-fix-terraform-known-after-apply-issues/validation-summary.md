# Validation Summary: How to Fix Terraform Known After Apply Issues

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Terraform (HCL configuration language)
- Terraform meta-arguments: `for_each`, `count`, `lifecycle` (precondition/postcondition)
- Terraform CLI commands (`terraform plan`, `terraform apply`, `-target`, `-replace`)
- AWS provider resources: `aws_instance`, `aws_eip`, `aws_eip_association`, `aws_route53_record`, `aws_security_group_rule`, `aws_lb_target_group_attachment`
- AWS provider data sources: `aws_instances`, `aws_instance`
- Terraform modules

## Sources Consulted
- Terraform docs — for_each: https://developer.hashicorp.com/terraform/language/meta-arguments/for_each
- Terraform docs — count: https://developer.hashicorp.com/terraform/language/meta-arguments/count
- Terraform docs — Custom Conditions: https://developer.hashicorp.com/terraform/language/expressions/custom-conditions
- Terraform CLI — plan: https://developer.hashicorp.com/terraform/cli/commands/plan (including `-replace` and `-target` flags)
- Terraform CLI — apply: https://developer.hashicorp.com/terraform/cli/commands/apply
- AWS provider — aws_eip: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eip (verified `domain = "vpc"` is current syntax; `vpc = true` is deprecated)
- AWS provider — aws_route53_record: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record
- AWS provider — aws_security_group_rule: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group_rule
- AWS provider — aws_eip_association: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eip_association

## Issues Found
No technical issues found. The core technical claims are accurate:

- `for_each` and `count` meta-arguments require values that are known at plan time — verified.
- "Known after apply" attributes for computed AWS resource fields (private_ip, public_ip, arn, id) — accurate.
- `aws_eip` uses `domain = "vpc"` (the deprecated `vpc = true` was replaced) — accurate.
- The `terraform plan -replace=<addr>` and `terraform apply -target=<addr>` invocations — verified against the CLI docs.
- The postcondition example using `self.public_ip` is valid; `self` is available in resource lifecycle blocks.
- Resource argument syntax for `aws_route53_record`, `aws_security_group_rule`, `aws_eip_association`, `aws_lb_target_group_attachment` is correct.

## Review Notes

A few minor imprecisions that the author hedges around but do not constitute technical errors warranting an edit:

1. **Problem 2 example framing**: The `aws_instances` data source example labeled "# This FAILS" would not actually fail in most real scenarios, because data sources without dependencies on created resources are read during the plan phase, making `length(data.aws_instances.existing.ids)` known at plan time. The author acknowledges this directly in the follow-up paragraph ("data source attributes are usually known after the data source is read, which happens during planning for most data sources. The issue above occurs mainly when the data source itself depends on resources being created in the same apply"), so the explanation as a whole is correct, though the inline "FAILS" comment overstates the case.

2. **Strategy 4 ("Pre-allocate known values")**: The comments "(known immediately)" and "Now the IP is known at plan time" overstate the benefit. On a fresh apply, `aws_eip.web.public_ip` is still `(known after apply)` because AWS assigns the address during creation. The pattern is genuinely useful for subsequent plans (after the EIP exists in state) and for decoupling EIP lifecycle from instance lifecycle — both still valid takeaways for the reader.

3. **`aws_security_group_rule` deprecation**: The example uses `aws_security_group_rule`, which is still supported but soft-deprecated in newer AWS provider versions in favor of `aws_vpc_security_group_ingress_rule` / `aws_vpc_security_group_egress_rule`. Code shown still works; worth a future refresh.

4. **Tainted resources phrasing**: Strategy 3's heading "Use -replace instead of tainted resources" is accurate — `terraform taint` was deprecated in Terraform 0.15.2 in favor of `-replace=`.
